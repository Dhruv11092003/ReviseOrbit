# RevisionOrbit — DSA Revision Tracker (Frontend)

A React + Vite frontend for the DSA revision-tracking Express/MongoDB
backend.

## 1. Installation

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173` by default. Make sure your backend
is running (default `http://localhost:5000`) before signing in.

## 2. Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the Express backend. Change this if your backend runs elsewhere — never hardcoded in the app. |
| `VITE_ENABLE_JWT` | Set to `true` — this backend issues a real JWT (HttpOnly cookie) on sign-in and protects every revision route with it. |
| `VITE_ENABLE_EDIT_DELETE` | Set to `true` if your backend has `/updateEntry/:id` and `/deleteEntry/:id`. |

## 3. Running the frontend

```bash
npm run dev       # development server with hot reload
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

## 4. Backend URL configuration

All requests go through `src/services/httpClient.js`, which reads
`VITE_API_URL` once at startup. There is no hardcoded backend URL anywhere
else in the codebase.

## 5. Light / dark mode

There's a sun/moon toggle in the navbar (desktop and mobile). It defaults
to the OS's `prefers-color-scheme`, then remembers your choice in
`localStorage`. Every color in the app is a CSS variable defined once in
`src/index.css` — components never hardcode a light or dark color, they
just read `var(--color-text)`, `var(--surface-1)`, etc., so both themes
stay in sync automatically as the app grows.

## 6. Revision scheduling logic

Two things keep your daily revision list from becoming unmanageable:

- **A ladder of intervals** — the first time you complete a question it
  comes back in 3 days, then 7, then 14, then settles at 30 days for
  everything after. This is tracked with a `revisionCount` field that
  increments each time you mark something complete.
- **A daily cap** — when suggesting a next-revision date, the app checks
  how many other questions already land on that day and pushes the
  suggestion forward, one day at a time, until it finds a day with room
  (default cap: 4 per day).

This logic lives in `src/utils/schedule.js` (`suggestNextDate`) and is
used to prefill the date field on:
- the "Add Revision" form (for a brand-new question)
- the "Complete" modal (for a single question, using its own revision count)
- the "Complete all today's tasks" modal (using a mid-ladder baseline for
  the batch)

The suggested date is always just a prefill — you can change it before
confirming.

## 7. All Tasks page

`/all` shows every question you've ever logged in one place: topic, when
it was last revised, when it's next due, how many days that is from today
(or how overdue it is), and whether it's pending or completed. Searchable
by question name, filterable by topic, sortable by date/topic/name.

## 8. Available routes

| Route | Access | Description |
|---|---|---|
| `/signin` | Public | Sign in |
| `/signup` | Public | Create an account |
| `/dashboard` | Protected | Stats + today's revisions overview |
| `/today` | Protected | All of today's scheduled revisions |
| `/pending` | Protected | All pending revisions, sortable/filterable |
| `/all` | Protected | Every question ever logged, with days-left tracking |
| `/add` | Protected | Add a new revision entry |

Unauthenticated users are redirected to `/signin`. Authenticated users
visiting `/signin` or `/signup` are redirected to `/dashboard`. Routes
survive a hard refresh (session is restored on load, and the JWT cookie
is HttpOnly so the browser resends it automatically).

## 9. API integration

All calls live in `src/services/api.js`:

```
signup()             POST /signup
signin()              POST /signin
fetchToday()          GET  /fetchToday
fetchPending()        GET  /fetchPending
fetchAll()            GET  /fetchAll
createRevision()      POST /newEntry
completeRevision()    POST /updateCompletion/:id
completeAllToday()    POST /updateTodayAll
activateTodayTasks()  POST /activateTodayTasks
updateRevision()      PUT  /updateEntry/:id     (only if VITE_ENABLE_EDIT_DELETE=true)
deleteRevision()      DELETE /deleteEntry/:id   (only if VITE_ENABLE_EDIT_DELETE=true)
```

Errors are normalized centrally in `src/services/httpClient.js`: network
failures, timeouts, and 400/401/403/404/409/500 responses are all turned
into short, human-readable messages and surfaced as toasts. Raw backend
text is only shown when it's clearly a real user-facing message — anything
that looks like a stack trace or Mongo/Node internals is replaced with a
generic message instead.

## 10. Project structure

```
src/
├── components/    Navbar, TaskCard, modals, EmptyState, skeletons, etc.
├── pages/         Signin, Signup, Dashboard, Today, Pending, AllTasks, AddRevision
├── context/       AuthContext.jsx, ThemeContext.jsx
├── services/      api.js, httpClient.js
├── hooks/         useCountUp.js
├── utils/         date.js, schedule.js
├── App.jsx
└── main.jsx
```
