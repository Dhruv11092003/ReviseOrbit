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

## What's deliberately NOT in this architecture

Per the brief: no microservices, no Kubernetes, no event bus, no extra
databases beyond the two kinds described above. A single Express process
with an in-memory connection cache is the right amount of infrastructure
for this stage.
