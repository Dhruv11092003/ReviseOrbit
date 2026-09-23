# Architecture

## The rule this whole system follows

> ReviseOrbit hosts the software. The customer owns the data.

## Diagram

```
Customer Browser
      |
      v
Hosted React/Vite frontend (your hosting)
      |
      v
Hosted ReviseOrbit backend/API (your hosting)
      |
      +--------------------+
      |                    |
      v                    v
Central metadata DB   Customer's own MongoDB
(YOUR MongoDB)         (their MongoDB Atlas)
 - tenantId             - users (bcrypt hashes)
 - accessStatus         - revisions
 - encrypted db config  - tasks
                         - all application data
```

Two separate MongoDB connections exist in this system at all times:

1. **Central connection** (`CENTRAL_MONGODB_URI`) — one connection, owned by
   you, the operator. Holds only the `Tenant` collection: a tenant ID, an
   access status, and an encrypted blob containing a customer's connection
   string. Never touched by application data.
2. **Tenant connections** (one per customer, cached) — opened on demand by
   `db/tenantManager.js` using the customer's own connection string
   (decrypted just-in-time, never persisted decrypted). This is where
   `User` and `Revise` documents actually live.

## Request lifecycle

**Before login (signup/signin):**
```
Browser sends { tenantId, username, password }
      |
      v
Backend looks up Tenant by tenantId (central DB)
      |
      v
Backend decrypts that tenant's connection string
      |
      v
Backend opens/reuses a connection to the CUSTOMER's MongoDB
      |
      v
Backend checks username + bcrypt-compares password INSIDE that database
      |
      v
On success: signs a JWT containing { tenantId, username }, sets it as an
HttpOnly cookie. tenantId is never trusted again from the browser.
```

**After login (every other request):**
```
Browser sends request with the HttpOnly session cookie (no tenantId field)
      |
      v
requireAuth middleware verifies the JWT signature
      |
      v
tenantId comes ONLY from the verified JWT payload
      |
      v
Tenant's encrypted db config is looked up and decrypted
      |
      v
req.models = { User, Revise } bound to that tenant's connection
      |
      v
Route handler runs against req.models — it never sees or chooses a
tenant/database itself.
```

## Why `tenantId` is passed by the browser before login

There's a deliberate, documented exception here: before a session exists,
nothing has verified anything yet, so the browser has to say *which*
workspace it's trying to sign into — otherwise the server has no way to
know which of thousands of customer databases to check the password
against.

`tenantId` is treated the same way a Slack/Notion workspace slug is: it's
not a secret, and knowing it doesn't grant access to anything by itself.
The actual gate is the bcrypt-checked password inside that specific
tenant's own database. Once that succeeds, the signed JWT is the only
thing that determines tenant scope for the rest of the session — the
`tenantId` field in the request body is never read again.

**Known simplification, flagged honestly:** a mature multi-org product
would typically resolve the workspace from a subdomain (`acme.reviseorbit.com`)
or an email-based org lookup, rather than a manually-remembered ID pasted
into a form. This build uses `localStorage` to remember it on the same
browser after setup, which is a reasonable v1 but is the first thing worth
upgrading before scaling past a handful of design partners.

## Revision activation: request-time, not cron

Earlier builds of this app used `node-cron` to sweep every active tenant's
database once a day and flip `isPending: true` on anything due. That's
gone. It had two real problems: it scanned every tenant's database from a
single process regardless of whether anyone was using them, and if the
backend happened to be asleep (a free-tier host, or just a deploy in
progress) at the scheduled minute, that day's activation silently never
ran for anyone.

The replacement is `services/revisionActivation.js`'s
`ensureTodayTasksActivated(ReviseModel)`, called at the top of
`/fetchToday` and `/fetchPending` (`routes/revisions.js`) — i.e. exactly
the requests a client makes when it needs to know what's due:

```
User opens the app / navigates to Today or Pending
      |
      v
Authenticated request hits requireAuth
      |
      v
req.models.Revise resolved from the verified JWT's tenantId
      |
      v
ensureTodayTasksActivated(req.models.Revise)
  -> updateMany({ isPending: false, nextReviseDate: { $lte: endOfToday } },
                { $set: { isPending: true } })
      |
      v
Route queries/returns the now-up-to-date data
```

Properties this depends on, deliberately kept true:

- **Idempotent** — the filter only ever matches documents still marked
  `isPending: false`, so calling it every request, or twice in the same
  second, does nothing extra the second time.
- **Never a scheduling operation** — it only flips `isPending`. It never
  touches `revisionCount`, `currentDate`, or `nextReviseDate`. Completing a
  revision (`POST /updateCompletion/:id`) and manually editing one
  (`PUT /updateEntry/:id`) are separate code paths that own those fields;
  activation can't be confused with either.
- **Due today OR overdue** — the check is `nextReviseDate <= endOfToday`,
  not an exact-day window, so a task doesn't need to be caught on the
  precise calendar day it became due; overdue items keep resurfacing on
  every fetch until they're completed or rescheduled.
- **Single-tenant, single-query** — it operates on the `ReviseModel`
  already resolved for `req.tenantId`. There is no code path that iterates
  the central `Tenant` collection anymore; the old cron's
  `runDailyActivationForAllTenants()` no longer exists anywhere in the
  codebase.
- **UTC day boundaries** — `backend/utils/date.js`'s `getUtcTodayBounds()`
  computes "today" from `Date.UTC(...)`, not the server process's local
  time. Every date this app stores is a calendar day normalized to UTC
  midnight (see below), so day-boundary math has to use UTC too, or
  "today" on the server could silently disagree with "today" as stored,
  depending on which timezone the Node process happens to be running in.

A `POST /activateTodayTasks` endpoint still exists purely as a manual,
user-triggered fallback (it calls the exact same service function) — it
is never required for correctness, since the two GET routes above already
call it automatically.

## Calendar dates and timezone handling

Both `currentDate` and `nextReviseDate` represent a calendar day, not a
timestamp. The frontend always sends and reads these as `"YYYY-MM-DD"`
strings; `new Date("YYYY-MM-DD")` is guaranteed by the JS spec to parse as
UTC midnight (unlike a date-*time* string, which parses as local time) —
so "the stored date" and "the calendar day the user picked" always agree,
regardless of the browser's or server's local timezone.

`frontend/src/utils/date.js` is the single place calendar-day arithmetic
happens on the frontend (`addCalendarDays`, `toDateStringFromBackend`,
`isToday`, `isOverdue`, etc.); `backend/utils/date.js` is the equivalent on
the server. Nothing else should reimplement day-boundary or
day-arithmetic logic — `utils/schedule.js`'s spaced-repetition ladder
calls into `addCalendarDays` rather than doing its own date math, which is
exactly the bug this replaced: computing a future date via
`new Date(str + "T00:00:00")` (local midnight) and then
`.toISOString()` (UTC) silently shifts the result by a day for anyone in
a timezone ahead of UTC.

## Tenant isolation guarantees

- No API route accepts a tenant/database identifier as an input and uses it
  to decide which database to query. The only two places `tenantId` is
  read from client input are `/signup` and `/signin`, and in both cases
  it only selects which database to *attempt a login against* — it does
  not bypass the password check.
- Every other route (`/newEntry`, `/fetchToday`, `/fetchAll`,
  `/updateCompletion/:id`, etc.) is behind `requireAuth`, which derives
  `req.models` from the verified JWT alone.
- Two tenants can never share a Mongoose connection: `tenantManager.js`
  keys its cache strictly by `tenantId`, and each connection is opened
  with that tenant's own decrypted URI.

## Connection management

- Up to `MAX_TENANT_CONNECTIONS` (default 50) tenant connections are kept
  open at once; opening a 51st evicts the least-recently-used one.
- Any tenant connection idle for `TENANT_CONNECTION_IDLE_MS` (default 30
  minutes) is closed automatically by a background sweep.
- Each tenant connection caps its own pool at 5 sockets
  (`maxPoolSize: 5`) so one busy customer can't starve others.
- On `SIGTERM`/`SIGINT`, the HTTP server stops accepting new requests,
  then every tenant connection and the central connection are closed
  before the process exits.

## Revision types and the pattern catalogue

Every revision has a `type`: `"leetcode"` or `"theory"` (`models/tenantSchemas.js`).
Records created before this field existed simply don't have it —
Mongoose's schema `default: "leetcode"` fills it in on read, so nothing
needed a migration. `PUT /updateEntry/:id` explicitly whitelists every
field for both types (never `Model.findByIdAndUpdate(id, req.body)`), and
never lets a client set `tenantId`, `_id`, `createdAt`, or `revisionCount`
— those are either derived from the verified session or owned exclusively
by the completion endpoint.

The DSA pattern catalogue (`frontend/src/data/patterns.js`) that powers
the `/patterns` page is **static reference data checked into the
frontend**, not per-tenant data — it's identical for every user, so it has
no business living in anyone's MongoDB. A revision only ever stores a
`primaryPattern` / `secondaryPatterns` **slug** pointing back into that
file. Old records that instead have a free-typed `patternIdentified`
string (e.g. `"Hashmap"`) are never rewritten automatically:
`resolvePatternDisplay()` shows the canonical name when the old text maps
to one, falls back to showing the raw old text otherwise, and the edit
form lets the pattern be normalized to a canonical slug the next time that
specific record is edited — lazily, one record at a time, never as a bulk
migration.

## What's deliberately NOT in this architecture

Per the brief: no microservices, no Kubernetes, no event bus, no extra
databases beyond the two kinds described above, and — see
`docs/DEPLOYMENT.md`'s "Cloudflare Worker" section — no edge worker either,
since it wouldn't solve anything this architecture actually has a problem
with. A single Express process with an in-memory connection cache is the
right amount of infrastructure for this stage.
