# Task Manager — Design Guidelines

A single source of truth for the visual language. Keep new UI consistent with these rules.

## Design principles

- **Editorial, not "dashboard-y".** Serif display type, generous whitespace, monospace metadata labels. It should read like a well-set document, not a SaaS admin panel.
- **Minimalism first.** No filler, no decorative gradients, no drop shadows on flat surfaces. Every element earns its place.
- **One dark anchor + warm-white canvas.** The deep indigo (`#211d3a`) grounds the layout (sidebar, dark cards, toasts); everything else sits on white/cream.
- **Accent used sparingly.** The lime accent marks the single most important action or the active state only — never as a fill for large areas.

## Color

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#211d3a` | Primary text, sidebar bg, dark cards/toasts, primary buttons on light |
| `--canvas` | `#ffffff` | Main content background |
| `--surface` | `#fdfbf6` | Panels / slide-over background (warm off-white) |
| `--cream` | `#f7f2e8` | Text/foreground on the dark ink surfaces |
| `--accent` | `#d8f24a` | Lime — active nav state, primary CTA, key highlights only |
| `--accent-danger` | `#c2542f` | Destructive/secondary accent (delete, overdue) |

Ink at opacity (on light):
- Text primary `#211d3a`
- Text secondary `rgba(33,29,58,0.55)`
- Muted / meta `rgba(33,29,58,0.4–0.45)`
- Hairline borders `rgba(33,29,58,0.1)`; dividers `rgba(33,29,58,0.14–0.18)`
- Row hover `rgba(33,29,58,0.03)`

Cream at opacity (on ink):
- Primary `#f7f2e8`
- Secondary `rgba(247,242,232,0.55)`
- Borders `rgba(247,242,232,0.2–0.24)`; hover fill `rgba(247,242,232,0.06–0.08)`

### Semantic colors

Status (label / bg / text):
- **To Do** — `rgba(33,29,58,0.08)` / `#4a4570`
- **Doing** — `rgba(79,111,176,0.16)` / `#3f5f9e`
- **Done** — `rgba(75,143,106,0.18)` / `#357a55`
- **Blocked** — `rgba(193,73,63,0.16)` / `#a83c33`

Urgency dot:
- High `#c1493f` · Medium `#c68a2e` · Low `#4b8f6a`

## Typography

Two families only:

- **Display / body:** `'Source Serif 4', Georgia, serif` — headings, task titles, body copy, buttons that read as text.
- **Labels / metadata:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` — eyebrow labels, table headers, counts, dates, section numbers. Uppercase, letter-spaced.
- **UI chrome fallback:** system sans (`-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`) is the root font; serif/mono are applied explicitly where used.

Load: `Source Serif 4` weights 400/500/600/700 (optical sizing 8–60).

### Scale

| Role | Size / weight | Family |
|---|---|---|
| Page title | 56px / 600, `letter-spacing:-0.015em` | serif |
| Section heading | 22–26px / 600 | serif |
| Card stat (big number) | 44–54px / 700, `line-height:1` | serif |
| Task title (row) | 15–16px / 400 | serif |
| Body | 13–15px | serif |
| Eyebrow label | 10–11px, `letter-spacing:0.08–0.14em`, uppercase | mono |
| Table header | 10.5px, `letter-spacing:0.08em`, uppercase, muted | mono |
| Meta / date | 11–12.5px | mono or sans |

Section eyebrows follow a `NN — LABEL` pattern (e.g. `01 — ALL RECORDS`) in muted mono.

## Layout & spacing

- **Sidebar:** fixed left, 250px, ink background, `padding:32px 24px`. Content area `margin-left:250px`, `padding:56px 40px 80px`, `max-width:1280px`.
- **Rhythm:** page title → `1px` hairline divider (`margin-bottom:28px`) → filters/content.
- **Spacing steps:** 8 / 12 / 14 / 20 / 24 / 28px. Use `display:flex`/`grid` with `gap` — never margin-per-child or inline-flow spacing.
- **Tables:** CSS grid with explicit column tracks, `gap:14px`, rows separated by `1px` `rgba(33,29,58,0.08)` borders. Wrap in `overflow-x:auto` with a `min-width` on the grid.

## Radii, borders, elevation

- Radii: inputs/buttons **8–9px**, cards **10–16px**, large stat cards **18px**, pills **999px**.
- Borders: `1px solid rgba(33,29,58,0.1)` for cards; `1.5px dashed rgba(33,29,58,0.25)` for empty/add states.
- Shadows: keep flat by default. Cards resting `0 2px 10px rgba(33,29,58,0.04)`; on hover `0 10px 26px rgba(33,29,58,0.1)`. Slide-over `-12px 0 32px rgba(33,29,58,0.18)`. Toast `0 18px 44px rgba(33,29,58,0.4)`.

## Components

**Buttons**
- Primary (on light): `background:#d8f24a; color:#211d3a; font-weight:700; radius:9px; padding:12px 20px`. Hover `filter:brightness(0.93)`.
- Primary (on ink surface): same lime fill, ink text.
- Ghost (on ink): `border:1px solid rgba(247,242,232,0.24); background:none; color:cream`. Hover fills `rgba(247,242,232,0.08)`.
- Text button: serif, underlined with `text-underline-offset:4px`, no background (e.g. "View tasks →").
- Destructive: `1.5px solid #c2542f`, transparent bg, `#c2542f` text.

**Nav item:** full-width, left-aligned, serif 15.5px, radius 8px. Active = cream text + 600 weight + a 3px lime bar (`width:3px;height:16px;radius:2px`) to the left; inactive = `rgba(247,242,232,0.55)`. Hover fills `rgba(247,242,232,0.06)`.

**Pills (status):** `padding:3px 10px; radius:999px; font-size:11.5px; font-weight:600` using the status bg/text pairs above.

**Inputs / selects:** `padding:10px 13px; radius:8–9px; border:1px solid rgba(33,29,58,0.16–0.18); background:#fff; outline:none`. Placeholder `rgba(33,29,58,0.35)`.

**Cards:** white, `1px` hairline border, radius 16px, `padding:28px`, subtle resting shadow, lift on hover.

**Slide-over panel:** fixed right, 460px (max 92vw), `#fdfbf6` bg, `padding:40px`, scrim `rgba(33,29,58,0.4)`, enters with `panelIn`.

**Reminder toast:** fixed bottom-right (`bottom:28px; right:28px`), ~372px, ink bg, cream text, radius 16px. Mono `REMINDER` eyebrow + lime project tag on the top row; serif 19px description; three buttons (lime "Make task" + two ghost). Enters with `reminderIn`.

## Motion

Subtle, short, ease-out. Keyframes in use:

```css
@keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes panelIn  { from { transform:translateX(24px); opacity:0; } to { transform:translateX(0); opacity:1; } }
@keyframes reminderIn { from { transform:translateY(16px); opacity:0; } to { transform:translateY(0); opacity:1; } }
```

- View transitions: `fadeInUp 0.45s ease`.
- Hover transitions on cards: `transform`/`box-shadow` `0.15–0.2s ease`.
- Toast entrance: `reminderIn 0.4s cubic-bezier(0.16,1,0.3,1)`.

## Do / Don't

- **Do** use serif for anything a person reads, mono for anything a machine emits (labels, counts, dates).
- **Do** reserve lime for one action or the active state per view.
- **Don't** introduce new hues, gradients, emoji, or heavy shadows.
- **Don't** space UI groups with inline flow or per-element margins — use flex/grid `gap`.
- **Don't** go below 11px for readable text; keep hit targets ≥ 40px.
