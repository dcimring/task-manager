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
- **Auth**: Google Identity Services ID tokens, verified by Convex via
  `convex/auth.config.ts` (OIDC, audience = `AUTH_GOOGLE_CLIENT_ID`
  deployment env var). Every query/mutation calls `requireUser`
  (`convex/lib/auth.ts`) which checks `ALLOWED_EMAILS` (deployment env var,
  fails closed). Client side: `src/auth.jsx` + `ConvexProviderWithAuth`.
- **Auth gotcha**: the Convex client force-refreshes tokens after login and
  on reconnects; Google ID tokens can't be silently re-minted on demand.
  `initialAuthTokenReuse: true` (src/main.jsx) plus the fallback logic in
  `src/auth.jsx` `fetchAccessToken` prevent premature logouts. Don't
  simplify that logic without re-reading the comments there.
- Google ID tokens expire hourly; silent One Tap renewal is attempted 5 min
  early. If users report hourly logouts, upgrade path is Convex Auth/Clerk
  (documented in IMPROVEMENTS.md item 1).
- Tasks reference projects via `projectId`; `tasks.get` joins the project
  name in as `project`, so the frontend still works with names.
