# Improvement Plan

Findings from a full project review (2026-07-12). Ordered roughly by priority.
Check items off as they land; each numbered section is intended to be one unit of work.

## Status overview

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Real backend authentication | Critical | ☐ Not started |
| 2 | Schema hardening (indexes, literal types, project IDs) | High | ☑ Done (2026-07-12) |
| 3 | Recurring-task edge cases | High | ☐ Not started |
| 4 | Split App.jsx into components | Medium | ☐ Not started |
| 5 | Tests, linting, CI | Medium | ☐ Not started |
| 6 | Convert frontend to TypeScript | Medium | ☐ Not started |
| 7 | Date-only deadline storage | Medium | ☐ Not started |
| 8 | Small UX/safety fixes | Low | ☐ Not started |
| 9 | New features | Backlog | ☐ Not started |

---

## 1. Real backend authentication (Critical)

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

## 3. Recurring-task edge cases (High)

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

## 4. Split App.jsx into components (Medium)

`src/App.jsx` is ~2,700 lines: auth, six views, edit panel, toasts,
drag-and-drop, and date utilities in one component.

- Every keystroke (e.g. search filter) re-renders the whole app; derived data
  (`getFilteredTasks`, `getProjectStats`, weekly stats) is recomputed each
  render with no `useMemo`.
- Proposed split:
  - `components/` — FocusView, TasksView, BoardView, ProjectsView,
    AnalyticsView, WeeklyReportView, TaskPanel, Sidebar, toasts.
  - `hooks/` — auth hook, update-checker hook.
  - `lib/dates.js` — pure date helpers (also makes them unit-testable).
- Add `useMemo` for derived data where it matters.

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
