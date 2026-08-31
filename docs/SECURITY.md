# Security Model

## Passwords

- Hashed with bcrypt, cost factor 12, inside the **customer's own
  database**. Central infrastructure never sees or stores a password or
  its hash.
- Login returns the same generic "Invalid username or password" message
  whether the account doesn't exist or the password is wrong (avoids
  account enumeration).
- Signin is rate-limited to 10 attempts / 15 minutes per IP
  (`middleware/rateLimit.js`).

## Credential encryption at rest

- The only sensitive thing the central database stores is a customer's
  MongoDB connection string, encrypted with **AES-256-GCM**
  (`security/encryption.js`) — authenticated encryption, so tampering
  with the stored ciphertext is detected on decrypt, not silently
  accepted.
- The encryption key comes from `ENCRYPTION_KEY`, a server-side secret,
  and is never stored in the same database as the data it protects,
  never logged, and never hardcoded.
- The encrypted field is marked `select: false` in the schema and
  stripped again in `toJSON` as a second layer, so an accidental
  `Tenant.find()` without explicit `.select("+dbConfigEncrypted")` simply
  cannot leak it.
- No API response, ever, includes the connection string — encrypted or
  decrypted. Settings screens show connection **status**, never the
  string itself.

## Tenant isolation

See `ARCHITECTURE.md` for the full request lifecycle. Summary: every
authenticated request's tenant comes from a verified JWT, never from a
client-supplied field. The only two exceptions (`/signup`, `/signin`) use
a non-secret workspace identifier that only selects which database to
attempt a password check against — it does not grant access on its own.

## SSRF protection (`security/ssrfGuard.js`)

The database-connect feature is a genuine SSRF vector: the server accepts
a network target from the customer and connects to it. Mitigations in
place:

- Only `mongodb://` and `mongodb+srv://` schemes are accepted.
- Hardcoded hostname blocklist: `localhost`, `127.0.0.1`, `0.0.0.0`,
  `::1`, and anything ending in `.local`.
- Every hostname is resolved via DNS and every resulting IP is checked
  against RFC1918 private ranges, loopback, link-local (which also
  covers the `169.254.169.254` cloud metadata address), and IPv6
  unique-local/link-local equivalents.
- For `mongodb+srv://`, the underlying SRV record targets are resolved
  and checked too, not just the outer hostname.

**Honest limitation:** this check runs at "Test & Connect" time, not on
every subsequent query. A sufficiently sophisticated DNS-rebinding
attacker (serving a public IP during the check, then a private one
moments later) is not fully defeated by this application-level check
alone. Closing that last gap requires network-level egress controls on
whatever platform hosts this backend — e.g. a firewall/VPC rule that
blocks outbound traffic to RFC1918 and metadata ranges regardless of what
the application tries to do. Document and enable that at the
infrastructure layer before treating this as airtight.

## Transport & session security

- Sessions are a JWT in an **HttpOnly** cookie (`sameSite: lax`,
  `secure: true` in production) — never exposed to frontend JavaScript,
  never stored in `localStorage`.
- `express-rate-limit` on the whole API (300 req / 15 min / IP) and
  tighter limits on `/signin`, `/signup`, and the database-test endpoints
  specifically (the latter because each call makes a real outbound
  network connection — an obvious abuse target for both cost and SSRF
  probing).
- `helmet()` sets standard security headers.
- CORS allows exactly one origin: `FRONTEND_URL`, read from environment —
  never `*` in this configuration, and the app refuses to start if it's
  unset.
- Request bodies are capped at 200KB — this app has no file uploads, so
  there's no reason to accept more.

## Error handling

- A centralized Express error handler ensures unhandled errors return a
  generic `"Something went wrong. Please try again."` — never a stack
  trace, driver internals, or a raw MongoDB error string (which can
  contain hostnames or, in some drivers' error messages, fragments of the
  connection string).
- The database-connect flow specifically wraps every failure in a fixed,
  safe message (`"Unable to connect to your database..."`) rather than
  forwarding whatever the MongoDB driver reported.

## What was found and must be fixed by you

The archive supplied to build this included a **live `.env` file with a
real MongoDB Atlas username/password and a real JWT secret**, committed in
plaintext, in two separate uploads. This is a credential leak regardless
of whether the repository itself is public.

**Action required, not optional:**
1. Rotate that MongoDB Atlas database user's password immediately.
2. Generate a new `JWT_SECRET` before deploying this version.
3. Generate a new `ENCRYPTION_KEY` (this is new to this version, so
   there's nothing to rotate yet — just don't reuse it anywhere else).
4. Confirm `.env` was never pushed to a remote Git history. If it was,
   scrub it from history (e.g. `git filter-repo`) in addition to rotating
   the credentials — removing the file in a new commit does not remove it
   from history.

`.gitignore` in this project now correctly excludes `.env` and `.env.*`
(it previously only excluded `*.local`, which does not match `.env`) —
that gap is fixed, but only rotation fixes the exposure that already
happened.

## Things this build does NOT claim

- It does not claim ReviseOrbit's servers can "never see" customer data —
  the hosted backend necessarily processes requests and their data
  in-memory while servicing them. What it does not do is *persist* a
  second copy of that data centrally.
- It does not claim the SSRF protection is complete against every
  adversary model (see DNS-rebinding note above).
- It does not claim this has been through a third-party penetration test.
  Treat this as a solid application-level foundation, not a substitute
  for a real security review before handling other people's production
  data at scale.
