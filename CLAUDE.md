<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Project state & roadmap

The improvement roadmap lives in **IMPROVEMENTS.md** (status table at top).
Work items one at a time; mark them done there and commit.

Operational facts (non-obvious, verified 2026-07-12):

- **The live app runs against the dev Convex deployment**
  (`fearless-porpoise-401`, set in `.env.local`). The prod deployment
  (`proficient-hound-901`) is unused. Data on dev IS live data — migrations
  run there affect the real app.
- Deploy backend: `npx convex dev --once`. Deploy frontend:
  `npm run deploy` (Cloudflare, https://task-manager.odd-fog-93e2.workers.dev).
- **Auth** (token-exchange model, since 2026-07-23): the app does NOT use
  Google's ~1h ID token as the Convex session. Login flow: Google Identity
  Services yields an ID token → the client POSTs it to `POST /auth/session`
  (`convex/http.ts`) → that endpoint verifies the Google token + `ALLOWED_EMAILS`
  and mints our own **30-day sliding session JWT**, signed with `JWT_PRIVATE_KEY`
  (deployment env var, RS256). Convex trusts those tokens via `customJwt` in
  `convex/auth.config.ts`, verified against the JWKS served at
  `/.well-known/jwks.json` (from the `JWKS` deployment env var). Every
  query/mutation still calls `requireUser` (`convex/lib/auth.ts`), which checks
  `ALLOWED_EMAILS` (fails closed). Client side: `src/hooks/useAuth.jsx` +
  `ConvexProviderWithAuth`. `AUTH_GOOGLE_CLIENT_ID` is still used server-side to
  verify the Google token's audience inside `/auth/session`.
- **Session length**: the session token lasts 30 days and is renewed silently
  (no Google prompt) via `POST /auth/session` with the current session token —
  `useAuth.jsx` renews on load/focus once the token is >1 day old, so ordinary
  use slides the expiry forward indefinitely. Google One Tap is only needed for
  the first login or after ~30 days of not opening the app. Key generation +
  `JWT_PRIVATE_KEY`/`JWKS` env vars are per-deployment; a new deployment needs
  fresh keys (generate an RS256 keypair, set the PKCS8 PEM as `JWT_PRIVATE_KEY`
  and the public JWKS JSON as `JWKS`). Rotating keys invalidates live sessions.
- **`requireUser` claim quirk**: `customJwt` identities expose `email_verified`
  raw (snake_case), unlike OIDC's normalized `emailVerified` — `requireUser`
  accepts both. Don't "simplify" that back to one field.
- **Auth gotcha**: the Convex client force-refreshes tokens after login and on
  reconnects. `initialAuthTokenReuse: true` (src/main.jsx) plus the fallback
  logic in `useAuth.jsx` `fetchAccessToken` prevent premature logouts. Our
  session token is long-lived so force-refresh just returns the current token
  (no re-mint per reconnect). Don't simplify that logic without re-reading the
  comments there. The `task_manager_session` localStorage key was bumped to
  `task_manager_session_v2` when this model shipped (old Google-token sessions
  are intentionally ignored).
- Tasks reference projects via `projectId`; `tasks.get` joins the project
  name in as `project`, so the frontend still works with names.
