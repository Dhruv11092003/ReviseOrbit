# ReviseOrbit

A DSA revision tracker, built as a hosted SaaS where **ReviseOrbit
provides the software and each customer owns their own MongoDB
database.** Application data — accounts, revisions, tasks — lives in the
customer's own MongoDB, never in a central database ReviseOrbit controls.

## Quick start (local development)

### 1. Your own central database (metadata only)

```bash
cd backend
npm install
cp .env.example .env
# fill in CENTRAL_MONGODB_URI (your own Mongo), JWT_SECRET, ENCRYPTION_KEY,
# FRONTEND_URL (http://localhost:5173 for local dev)
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:5000
npm run dev
```

### 3. Try it

Open the frontend, click **Connect Your Database**, and follow the
wizard using a MongoDB Atlas connection string of your own — see
`docs/DATABASE_SETUP.md` for a customer-facing walkthrough of that step.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how tenant isolation
  and the two-database model work, end to end.
- [`docs/SECURITY.md`](docs/SECURITY.md) — password hashing, credential
  encryption, SSRF protections, and what's still a manual step.
- [`docs/DATABASE_SETUP.md`](docs/DATABASE_SETUP.md) — the guide shown to
  your customers for connecting their own MongoDB.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — frontend/backend
  deployment instructions.

## Project structure

```
frontend/    React + Vite app (onboarding, dashboard, revision tracking)
backend/     Express API (tenant resolution, encryption, SSRF guard)
docs/        Architecture, security, setup, and deployment docs
```

## Important: rotate leaked credentials

The project archive used to build this included a live `.env` with real
MongoDB Atlas credentials and a JWT secret. See "What was found and must
be fixed by you" in `docs/SECURITY.md` — rotate those before deploying.

---

Made by Dhruv Kulshrestha · [GitHub Repository](https://github.com/REPLACE_WITH_YOUR_GITHUB_USERNAME/reviseorbit)
