# Improvement Plan

Findings from a full project review (2026-07-12). Ordered roughly by priority.
Check items off as they land; each numbered section is intended to be one unit of work.

## Status overview

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Real backend authentication | Critical | ☑ Done (2026-07-12) |
| 2 | Schema hardening (indexes, literal types, project IDs) | High | ☑ Done (2026-07-12) |
| 3 | Recurring-task edge cases | High | ☑ Done (2026-07-12) |
| 4 | Split App.jsx into components | Medium | ☑ Done (2026-07-12) |
| 5 | Tests, linting, CI | Medium | ☐ Not started |
| 6 | Convert frontend to TypeScript | Medium | ☐ Not started |
| 7 | Date-only deadline storage | Medium | ☐ Not started |
| 8 | Small UX/safety fixes | Low | ☐ Not started |
| 9 | New features | Backlog | ☐ Not started |

---

## 1. Real backend authentication (Critical) — DONE

Completed 2026-07-12. Convex now verifies Google ID tokens cryptographically
(OIDC via `convex/auth.config.ts`, `domain: accounts.google.com`, audience =
the existing `AUTH_GOOGLE_CLIENT_ID` deployment var). Every query/mutation
calls `requireUser` (`convex/lib/auth.ts`), which requires a verified email
matching the `ALLOWED_EMAILS` deployment var — fails closed if unset. The
client uses `ConvexProviderWithAuth` with a `GoogleAuthProvider`
(`src/auth.jsx`) that stores the GIS credential and hands it to Convex.
Verified: unauthenticated CLI calls and a forged localStorage session both
get zero data and fall back to the login screen.

Design notes / follow-ups:
- Google ID tokens expire after ~1 hour. On expiry (or server rejection) the
  app attempts a silent One Tap re-auth; if that fails it signs out to the
  login screen. If hourly One Tap becomes annoying, the upgrade path is
  Convex Auth or Clerk with refresh tokens — requires the Google OAuth
  client secret and a redirect-URI change in Google Cloud Console.
- The live app still points at the dev Convex deployment
  (`fearless-porpoise-401`); the prod deployment is unused. If that's ever
  cleaned up, remember to set `AUTH_GOOGLE_CLIENT_ID` and `ALLOWED_EMAILS`
  on the new deployment (auth fails closed without them).

Original findings:

The current login is frontend-only and provides no actual security:

- Every Convex query/mutation in `convex/tasks.ts` and `convex/projects.ts` is
  public. The deployment URL is embedded in the shipped JS bundle, so anyone
  who finds it can read/modify/delete all data without seeing the login screen.
- The Google JWT is base64-decoded in `App.jsx` (`decodeJwt`), never
  cryptographically verified — a forged token claiming the allowed email works.
- The "session" is a plain `localStorage` value (`task_manager_user`); setting
  it manually in dev tools bypasses login entirely.

**Plan:**
- Wire real auth into Convex (Convex Auth or Clerk — the `convex-setup-auth`
  skill is already installed in this repo).
- Check `ctx.auth.getUserIdentity()` in every query and mutation; reject
  unauthenticated calls and restrict to the allowed account.
- Remove the hand-rolled JWT decode + localStorage session in `App.jsx` in
  favor of the auth provider's client.

## 2. Schema hardening (High) — DONE

Completed 2026-07-12. Indexes (`projects.by_name`, `tasks.by_projectId`),
literal-type enums for urgency/status/recurrence/dateType, and tasks now
reference projects via `projectId`. `tasks.get` joins the project name in, so
the client API is unchanged; project renames are a single patch. Data was
migrated in place via one-off migrations (since deleted).

Note discovered during this work: the deployed frontend points at the **dev**
Convex deployment (`fearless-porpoise-401`), not the prod one
(`proficient-hound-901`). Worth cleaning up when tackling item 1 (auth).

Original findings:

Current code diverges from the project's own Convex guidelines
(`convex/_generated/ai/guidelines.md`):

- **No indexes; `.filter()` table scans everywhere.** Project-by-name lookups
  (`projects.ts` create/update, `tasks.ts` save) and tasks-by-project
  (`projects.update` rename) scan full tables.
  - Add `index("by_name", ["name"])` on `projects` and
    `index("by_project", ["project"])` on `tasks`; switch to `withIndex`.
- **Loose string types.** `urgency`, `status`, `recurrence`, `dateType` are
  `v.string()` in `convex/schema.ts`.
  - Replace with `v.union(v.literal(...))` enums so invalid states are
    rejected at the API boundary.
- **Tasks reference projects by name, not ID.** This forces
  `projects.update` to patch every task on rename, and the check-then-insert
  in `tasks.save` can race and create duplicate projects.
  - Store `projectId: v.id("projects")` on tasks; migrate existing data
    (the `convex-migration-helper` skill is installed).

## 3. Recurring-task edge cases (High) — DONE

Completed 2026-07-12. Extracted a shared `computeStatusUpdate` helper
(`convex/tasks.ts`) used by both `tasks.save` and `tasks.moveStatus`. It
derives `dateStarted`/`dateCompleted` for a status transition and, when a
transition just completed a recurring task, computes (and validates) the
next clone via `calculateNextDeadline` — all before either mutation performs
any `ctx.db.patch`/`insert`. A malformed deadline now throws before the task
is touched, instead of after it's been patched to done; verified via
`npx convex run` that the original task is left completely unchanged when
`calculateNextDeadline` throws (Convex also rolls back the whole transaction
on any throw, but this ordering removes the optimistic-UI flicker where the
client briefly shows "done" before the server rejects it).

Decision: kept catch-up semantics — a long-overdue recurring task still
computes its next deadline from the *old* deadline, not `max(deadline,
now)`. This is explicit now (see comment in `computeStatusUpdate`) rather
than incidental.

Also fixed a latent inconsistency: `tasks.save`'s update path previously
cloned the recurring task's `dateType` from the *existing* row instead of
the just-submitted value, while every other field on the clone (description,
urgency, project) used the new value. The shared helper now uses the
post-mutation `dateType` consistently.

Original findings:

- `calculateNextDeadline` (`convex/tasks.ts`) throws on unknown recurrence
  values *after* the task has already been patched to done, leaving a
  half-applied mutation from the user's perspective. Literal types from
  item 2 mostly eliminate this; also validate before patching.
- Completing a long-overdue recurring task computes the next deadline from
  the *old* deadline, immediately spawning more already-overdue clones.
  Decide deliberately: keep catch-up semantics, or compute from
  `max(deadline, now)`.
- `tasks.save` and `tasks.moveStatus` duplicate the
  dateStarted/dateCompleted/recurrence-clone logic in two code paths.
  Extract a shared helper so they can't drift.

## 4. Split App.jsx into components (Medium) — DONE

Completed 2026-07-12. `src/App.jsx` is now ~400 lines (down from ~2,700) and
only holds state, Convex wiring, and action handlers; everything else moved
out:

- `components/` — `LoginScreen`, `Sidebar` (+ mobile header/drawer),
  `FocusView`, `TasksView`, `BoardView`, `ProjectsView`, `AnalyticsView`,
  `WeeklyReportView`, `TaskPanel`, `ReminderToasts`, `UpdateToast`.
- `hooks/useAuth.jsx` — the Google auth provider, moved verbatim from
  `src/auth.jsx` (no logic changes; see the auth gotcha notes in CLAUDE.md,
  which still apply).
- `hooks/useUpdateChecker.js` — the version-polling effect, extracted out of
  the update-toast state.
- `lib/dates.js` — pure date helpers (`fmtDate`, `formatAge`, `daysBetween`,
  `mondayOf`, `weekKeyOf`, `weekLabel`, `addDays`), now unit-testable.
- `lib/constants.js` — color/label maps (`urgencyColor`, `statusMeta`, etc.)
  shared across views.
- `lib/taskDerivations.js` — the pure derivation functions (`decorate`,
  `getFilteredTasks`, `getProjectStats`, `getFocusTasks`, `getBoardColumns`,
  weekly-stats helpers), each now taking explicit args instead of closing
  over component state.

`getFilteredTasks`, `getProjectStats`, `getFocusTasks`, `getBoardColumns`,
and the weekly-stats/analytics aggregates are now wrapped in `useMemo` in
`App.jsx`, keyed off `tasks`/`projects`/`filters`/`localDateStr`, so a
keystroke in the search box no longer recomputes them for the whole app.

Verified: `vite build` succeeds; manually exercised Focus, Tasks (including
search-filter reactivity), Board, Projects (including the quick-add form),
Analytics, and Weekly Report views, the new/edit task panel (urgency, date,
reminder-vs-deadline toggle, recurrence, clear, status, save/close), and the
mobile hamburger/drawer navigation — all behave identically to before the
split.

## 5. Tests, linting, CI (Medium)

There are currently no tests, no linter, and no CI.

- Add vitest with unit tests for the pure logic: `calculateNextDeadline`,
  date helpers, filtering/sorting, focus-column derivation. (The recent
  timezone off-by-one bug is exactly the class a small suite would catch.)
- Add ESLint (+ react hooks plugin).
- Add a `typecheck` script (`tsc -p convex`).
- GitHub Action running lint + typecheck + tests on push/PR.

## 6. Convert frontend to TypeScript (Medium)

The backend is TS but the frontend is untyped JSX. Converting
`App.jsx` → `App.tsx` (best done during/after the item-4 split) lets Convex's
generated types flow through `useQuery`/`useMutation`, catching schema drift
at compile time.

## 7. Date-only deadline storage (Medium)

Deadlines are date-only concepts stored as full ISO timestamps
(`new Date(draft.deadline).toISOString()` in `saveTask`), which caused the
timezone off-by-one bug family (see commit 7a42f5e). Store deadlines as plain
`YYYY-MM-DD` strings end-to-end to make that class of bug impossible.
Requires a small data migration and simplifies `fmtDate`.

## 8. Small UX/safety fixes (Low)

- `localDateStr` is computed once per render at the top of `App`; a tab left
  open overnight shows stale overdue state. Recompute on an interval or on
  visibility change.
- Replace the `alert()` validation for recurring tasks with an inline field
  error in the task panel.
- Task delete is a hard delete with no confirmation. Add a confirm step, or
  soft-delete (an `archived` status) with an undo.
- Consider gitignoring one of the duplicated `.claude/skills/` /
  `.agents/skills/` trees if both are tracked.

## 9. New features (Backlog)

- **Task notes / subtasks** — a single description line is cramped for
  multi-step work.
- **Keyboard shortcuts** — `n` = new task, `/` = focus search.
- **Export/backup** — "download JSON" as insurance until soft-delete exists.
- **Daily recurrence** — obvious missing option; fits
  `calculateNextDeadline` trivially.
