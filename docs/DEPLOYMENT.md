# Deployment

## Recommended architecture

```
GitHub repo
   |
   +-- frontend/  -> static hosting (Vercel, Netlify, or Cloudflare Pages)
   |
   +-- backend/   -> Node hosting (Render, Railway, or Fly.io)

Your own MongoDB Atlas cluster -> central metadata only
Each customer's own MongoDB Atlas cluster -> their application data
```

No specific provider is required by the code — pick whichever of the
above fits your budget. The instructions below are written generically;
the concrete steps (account creation, connecting GitHub, build command,
env vars) are the same shape on any of them.

## Frontend deployment

1. Create an account with your chosen static host.
2. Connect your GitHub account and select this repository.
3. Set the **root directory** to `frontend/`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Environment variables:
   - `VITE_API_URL` = the URL of your deployed backend (step below),
     e.g. `https://api.yourdomain.com`
7. SPA routing: this is a client-side-routed app, so all paths must
   fall back to `index.html`. `frontend/public/_redirects` already
   contains the Netlify-style rule (`/*  /index.html  200`); if your
   host uses a different config format (e.g. Vercel's `vercel.json`
   rewrites), add the equivalent.
8. Add your custom domain in the host's dashboard once ready; HTTPS is
   typically automatic on all three providers listed above.
9. Set `FRONTEND_URL` on the **backend** to this exact frontend URL —
   CORS will reject requests from anywhere else.

## Backend deployment

1. Create an account with your chosen Node host.
2. Connect GitHub and select this repository.
3. Set the **root directory** to `backend/`.
4. Install command: `npm install`
5. Start command: `npm start` (runs `node main.js`)
6. Environment variables — all of these are required, and the app
   refuses to start if any are missing:
   - `CENTRAL_MONGODB_URI` — your own MongoDB, metadata only
   - `JWT_SECRET` — `openssl rand -base64 48`
   - `ENCRYPTION_KEY` — `openssl rand -base64 32`
   - `FRONTEND_URL` — your deployed frontend's exact origin
   - `PORT` — most hosts inject this automatically; the app reads
     `process.env.PORT` and falls back to 5000 if unset
   - `NODE_ENV=production`
7. Health check path: `/health` (returns `{"status":"ok"}`) — configure
   this in your host's health-check settings if it supports one.
8. HTTPS: handled by the hosting provider's edge/proxy on all three
   options listed above; no extra app-level config needed.
9. Custom domain: optional, configure in the host's dashboard the same
   way as the frontend.

## Post-deploy checklist

- [ ] Visit `/health` on the deployed backend — should return `200`.
- [ ] Visit the deployed frontend — should land on the Welcome screen if
      no workspace has been connected yet in that browser.
- [ ] Run through Connect Your Database → Test & Connect → Sign Up →
      Sign In once end-to-end against a real MongoDB Atlas cluster.
- [ ] Confirm the browser's dev tools show the session cookie as
      `HttpOnly` and `Secure`.
- [ ] Rotate/set fresh values for `JWT_SECRET` and `ENCRYPTION_KEY` in
      the production environment — do not reuse anything from local
      development or from the leaked credentials noted in
      `docs/SECURITY.md`.
