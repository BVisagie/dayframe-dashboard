# UI once-over: findings and plan

Reviewed on 2026-10-22 against `AGENTS.md`, the frontend-design skill, the
three theme briefs and the roadmap's feature map. The goal is a benchmark
Bootstrap 6 dashboard: every visual decision should be a Bootstrap component,
utility or token used the way its documentation intends, and the result should
read as designed rather than assembled.

## Method

- 51 captures from the production build with the fixed clock
  `2026-11-03T09:30` and the default seed: every theme, scheme and view at
  1920×1080; Summary at 1280×720 and 3440×1440; Summary, Feeds and Calendar at
  390×844; every Settings tab, About, the theme menu, the datepicker, an event
  popover, the Bootstrap lens, forced colours, keyboard focus, and the
  `running-low`, `reconnect`, `reminder-due` and `offline` scenarios.
- Live DOM measurements for each suspected root cause, so every defect below
  names the rule that produces it.
- Bootstrap `6.0.0-alpha.1` source read for the components and tokens the plan
  proposes. Class names below are checked against `scss/`.

## Findings

### Defects

These are wrong today and have a single, identifiable cause.

| #   | What you see                                                                                                                                                           | Cause                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The logo is a navy tile with a cyan rule in every theme, including Nebuchadnezzar's black console and Tideline's teal.                                                 | `src/assets/dayframe.svg` has literal fills and is loaded through `<img>`, so no token or `currentColor` can reach it.                                                                                                                                                                                                                                                                                                                                            |
| D2  | On Weather and Calendar the heading sits 60–90 px lower than on Summary, leaving a dead band under the nav.                                                            | Bootstrap's `.nav-overflow` sets `flex: 1 1 0` ("fill the free space when the wrapper is itself a flex item"). The nav is a direct child of the `d-flex flex-column` shell, so it shares the free space with `main`. Measured: nav height 133 px on Weather; adding `flex-grow-0` returns it to 46 px.                                                                                                                                                            |
| D3  | A full-width white bar behind the view pills; porcelain stripes on every list row inside white cards; grey cell backgrounds in both weather tables; porcelain dialogs. | Dayframe maps `--bg-body` to the tinted canvas and `--bg-1` to the white surface. In Bootstrap's light mode `--bg-1` is one step _darker_ than body, so every component that paints `--bg-1` (nav pills, alerts, card caps, menu hover) pops instead of receding, and everything that paints `--bg-body` (list groups, tables, dialogs, menus, popovers, toasts) shows the canvas colour inside white cards. Measured on Feeds: card `#fff`, list item `#f3f6fa`. |
| D4  | Feed excerpts sit 580 px to the right of their headline.                                                                                                               | The excerpt uses `.prose`, which is Bootstrap's long-form article container: `max-width: 1000px; margin-inline: auto`. It centres the paragraph inside the row.                                                                                                                                                                                                                                                                                                   |
| D5  | Theme choices in Settings are centred buttons with the swatches, name and description on one line.                                                                     | `.btn` is `display: flex; justify-content: center`; `.theme-choice` only sets `text-align: start`.                                                                                                                                                                                                                                                                                                                                                                |
| D6  | Every hour in the hourly outlook shows the same rain chance (78 % for twelve rows).                                                                                    | `simulateWeather` copies `day.precipitation` into every hour (`src/lib/data.ts`, the `hours` map). Hours carry their own `code` but the view ignores it.                                                                                                                                                                                                                                                                                                          |
| D7  | An agent card headlines "76 % left · Weekly" beside a "Nearly exhausted" badge; the hero says "Codex is running low" when 0 % remains.                                 | The headline uses the primary allowance while the badge uses the limiting one; the hero copy has no exhausted state.                                                                                                                                                                                                                                                                                                                                              |
| D8  | Theme-base redefines `--radius-1…9` and `--box-shadow*`, replacing Bootstrap's generated radius scale and its layered, dark-mode-aware shadow system.                  | Overrides in `src/styles/theme-base.css`. Bootstrap derives both from `$radius` and `$shadows` with `--shadow-color` and `--shadow-strength`; setting Sass options is step 3, replacing the tokens is step 4 without a logged gap.                                                                                                                                                                                                                                |

D2, D3 and the `.prose` behaviour in D4 are also candidates for upstream
feedback (see [Upstream](#upstream-feedback)).

### Design quality

What looks generic or poor, in the order a visitor meets it.

- **Shell.** Header and nav take two rows and about 140 px at 1080p. The nav's
  white bar (D3) is the most visible element on the page. Each view then spends
  another row on a heading, a filler tagline ("A little room for what comes
  next.") and a floating "Demo workspace" badge. None of this helps the glance.
- **Hero.** Two thirds of the card is empty at 1920×1080 and more at
  ultrawide. The copy is a title, one sentence and a button with an appended
  arrow icon, which the skill lists as a tell.
- **Identical cards.** Every panel is the same white card with the same
  radius; only the hero differs. The brief asks for hierarchy through radius,
  border, elevation and density, and says not every panel needs a card.
- **Weather** (flagged). Two spreadsheet tables with bold column headers, a
  wide "Conditions" column holding a 16 px icon, twelve hourly rows that need
  pagination, no sunrise or sunset although the data has both, no sense of the
  temperature range, and the big reading isolated from its icon by 400 px of
  empty space.
- **Feeds** (flagged). One giant card; striped rows (D3); a heavy "Demo"
  badge on every row; headline left, excerpt centred (D4); the live Bootstrap
  releases, the one real feed, get no distinct treatment; half the width is
  unused at 1920.
- **Agents.** Six near-identical cards whose only difference is a coloured
  border per agent. Status is a small badge; the brief's "show at a glance what
  needs attention" is not met from across a room.
- **Calendar.** Outside-month and weekend days are large grey slabs that
  outweigh the days that matter; event dots are 6 px; calendars have no colour;
  the "Jump to a date" input spans the full panel width below the grid.
- **Settings and About.** A tall white pill column for six sections; weak
  theme picker (D5); the header theme menu lists three names with no current
  mark, no swatch and no colour-scheme switch, so changing the scheme needs the
  dialog.
- **Fitting.** At 1280×720 the lower row is half empty while agents are cut to
  two; at 3440×1440 the agent bars run 600 px wide and the hero is a void.
- **Type.** All themes use `system-ui`. Bootstrap's own stack deliberately
  omits it because it renders non-Latin text badly (twbs/bootstrap#42703), and
  Settings offers `ja-JP`. System fonts in every theme is itself a default.
- **Motion.** Views switch instantly; rotation is a hard cut. Bootstrap's tab
  panes fade with `@starting-style` and respect reduced motion for free.

### What already works

Keyboard focus is visible everywhere; forced colours keep every control and
bar legible; the toast, popover, datepicker and drawer behave; phone layouts
keep the reading order; the compact agent rows and the status words beside
colours are right. Keep all of it.

## Design plan

Each theme's brief still wins on palette. This plan changes composition,
components and copy, and proposes one typographic decision.

### Palette

Unchanged. Default keeps porcelain, midnight, cobalt, ocean and steel;
Nebuchadnezzar keeps void black, olive glass and phosphor; Tideline keeps salt
white, deep ocean, channel teal and signal coral. The only palette work is
semantic: calendars and feed sources get the six `series-*` roles so colour
carries meaning in agendas and headlines.

### Type

Decision for the maintainer (see [Decisions](#decisions-needed)). Proposed for
Default only: **Geist** for body and display and **Geist Mono** for the clock
and readings, from `@fontsource-variable/geist` and
`@fontsource-variable/geist-mono` (SIL OFL 1.1, both at 5.3.0). Geist has
tabular figures and a sibling mono, so the big numbers and the clock share one
voice. Tideline and Nebuchadnezzar keep their briefs' faces. If the answer is
no, switch `--body-font-family` to Bootstrap's own stack so non-Latin locales
render correctly.

### Layout

One-row header, then the view. ASCII at 1920×1080.

```text
+--------------------------------------------------------------------------------+
| [D] Dayframe   Summary  Agents  Calendar  Weather  Feeds        9:30  Tue 3 Nov  ⟡ ⚙ |
+--------------------------------------------------------------------------------+
| Needs attention                                      | Outside now              |
| Codex's session allowance is used up     | Session  | 10°  ☂  Rain showers      |
| Resets in 30 min. Weekly has 76 % left.  | [▮▮▮▮░]  | Feels 9°  Wind 6  85 %   |
| [Review agent capacity]                  | Next best| Tue  ☂ 78%  5° ▮▮▮▮ 14°  |
|                                          | Claude   | Wed  ☂ 54%  4° ▮▮▮  12°  |
|                                          | 83 % wk  | Thu  ☀ 21%  5° ▮▮▮▮ 13°  |
+------------------------------------------+----------+--------------------------+
| Agent capacity        View all | Coming up           | Across your feeds       |
| CX Codex ● used up     Session | 9:15 ▌Daily build   | ▌Bootstrap  v6 alpha.2  |
| CL Claude ● used up    Session | 9:45 ▌Pause and plan| ▌Lanternbyte  A tiny…   |
| CU Cursor ● available  Monthly | +3 more events      | ▌Willowglass  Designing…|
+--------------------------------+---------------------+-------------------------+
Demo data …                                               About Bootstrap  ↻
```

Hero: a `card` with a two-column body. Left, the message and one action.
Right, an aside that depends on the state: the limiting allowance's progress
and countdown plus the next-best agent when capacity is the problem; the
event's attendees as an `avatar-stack`, its calendar badge and location when an
event is the problem; the three best agents when the stretch is clear.

Weather view:

```text
+---------------------------------------------+------------------------------+
| Willowmere                   Location, units | Seven days                   |
| 10°  ☂  Rain showers                         | Tue ☂ 78%  5° ░▮▮▮▮░ 14°     |
| Feels 9° · Wind 6 km/h · Humidity 85 %       | Wed ☂ 54%  4° ░▮▮▮░░ 12°     |
| Sunrise 07:14 · Sunset 16:52                 | Thu ☀ 21%  5° ░▮▮▮▮░ 13°     |
|                                              | …                            |
| Next hours                 Now–20:00 | Later |                              |
| 9   10   11   12   13   14   15   16   17 … |                              |
| ☂   ☂    ☁    ☁    ☀    ☀    ☁    ☂    ☂    |                              |
| 10° 11°  12°  13°  13°  14°  14°  14°  13°  |                              |
| ▮▮  ▮▮   ▮    ░    ░    ░    ▮    ▮▮   ▮▮▮  |  (rain chance bars)          |
+---------------------------------------------+------------------------------+
```

Feeds view:

```text
+------------------------------------------------+---------------------------+
| Latest stories   [All] [Technology] [Design] … | Bootstrap releases  Live  |
| ▌Lanternbyte Journal              46 min ago   | v6.0.0-alpha.1   8 Oct    |
|  A tiny compiler makes room for better errors  | v5.3.8          25 Aug    |
|  The Lanternbyte team trades a little speed …  | …                         |
| ▌Willowglass Review                 4 h ago    +---------------------------+
|  Designing a dashboard around the next decision| Sources                   |
|  …                                             | [Bootstrap ✓] [Technology]|
| ‹ 1 2 3 ›                                      | [Design ✓] [Science]      |
+------------------------------------------------+---------------------------+
```

Everything stays left-aligned. Narrow screens keep today's single column and
reading order.

### Principles

1. **One glance.** Summary answers "what needs attention" with the hero's
   message, its aside and status colour that reads from two metres.
2. **Bootstrap decides how.** Every new visual is a documented Bootstrap
   pattern: range bars are `progress-stacked`, people are `avatar-stack`,
   categories are `chip`, lists are `list-group`, surfaces are `card`
   variants. No chart library and no custom SVG plots.
3. **Hierarchy by variation.** Three panel grades: the hero (large radius,
   primary-subtle surface, shadow), instrument panels (`card` with
   `card-header`), and quiet lists (no card, a `divide-y` list on the canvas).
4. **Copy earns its place.** No taglines, no appended arrows, no "Demo" on
   every row. States are specific: "used up, resets in 30 min".
5. **Quality floor unchanged.** AA contrast, visible focus, reduced motion and
   forced colours are verified per package, not at the end.

### Review against the brief

Checked against the skill's list of generic defaults:

- Rejected gradient washes, hover-lift on every card and fade-up entrances.
  The only motion added is Bootstrap's own tab-pane fade on view change.
- Rejected a monospace label system and all-caps eyebrows. Mono stays
  reserved for the clock and readings outside the console theme.
- Rejected the private edition's SVG hourly chart. Bootstrap has no chart, so
  the hourly strip uses `list-group-horizontal` cells with `progress` bars for
  rain chance. It is less expressive and entirely Bootstrap, which is the
  point of this project.
- Rejected appended `→` icons on buttons and "·"-joined meta strings where a
  layout can separate the items instead.
- Kept the asymmetric hero; it is the brief's one bold element.
- The SaaS-card kit is the current state's main tell. The three-grade panel
  system above is the fix.

## Bootstrap mapping

| Need                             | Bootstrap 6                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Step | Notes                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| Theme-aware logo                 | Inline SVG filled with `var(--primary-bg)`, `var(--primary-contrast)` and `var(--accent-bg)`; sized with `w-2 h-2`                                                                                                                                                                                                                                                                                                                                                       | 2    | Replaces `.brand-symbol`. Favicon stays static.                                                                            |
| One-row header                   | `navbar` with `navbar-brand`, the existing `nav-overflow` + `nav nav-pills` inside, `vr`, `btn-group`                                                                                                                                                                                                                                                                                                                                                                    | 1    | Keep `aria-label="Dashboard views"` on the inner `<nav>`; tests and NavOverflow depend on it. Add `flex-grow-0` (D2).      |
| Pills without the white bar      | `$nav-pills-tokens: (--nav-pills-bg: transparent)`                                                                                                                                                                                                                                                                                                                                                                                                                       | 3    | Part of the surface re-pointing in D3.                                                                                     |
| View change with a fade          | `tab-content` + `tab-pane`, nav links as `Tab` triggers                                                                                                                                                                                                                                                                                                                                                                                                                  | 1    | Reduced motion handled by Bootstrap (`tab-pane-instant`). See decision 3.                                                  |
| Theme and scheme from the header | `menu` with `menu-header`, `menu-item-icon` swatch, `menu-item-content` + `menu-item-description`, `selected` + `menu-item-check`, `menu-divider`                                                                                                                                                                                                                                                                                                                        | 1    | Two groups: Theme, Colour scheme. The CRT option can live here too.                                                        |
| Hero aside                       | Two-column `grid` inside the card body; `progress`; `avatar-stack avatar-stack-sm`; `badge badge-subtle`                                                                                                                                                                                                                                                                                                                                                                 | 1–2  | Attendees are invented names already in the event data.                                                                    |
| Panel grades                     | hero: theme card tokens as now; instruments: `card` + `card-header`; quiet lists: `list-group list-group-flush` or `divide-y` on the canvas                                                                                                                                                                                                                                                                                                                              | 1–3  | Removes the identical-card look without custom CSS.                                                                        |
| Temperature range bar            | `progress-stacked`: a transparent lead segment then a coloured span; widths from the week's min/max                                                                                                                                                                                                                                                                                                                                                                      | 1    | `role="progressbar"` with "Low 5°, high 14°" label; colour `theme-info` under 10°, `theme-warning` over 20°, else primary. |
| Hourly strip                     | `contains-inline` wrapper, `list-group list-group-horizontal`, each item: time, icon, temperature, `progress` for rain                                                                                                                                                                                                                                                                                                                                                   | 1    | Twelve hours per page; keep `pagination` for the second page.                                                              |
| Current conditions and sun times | `hstack`/`grid` of label–value pairs with `fg-2` labels; Bootstrap Icons `sunrise`, `sunset`, `wind`, `droplet`                                                                                                                                                                                                                                                                                                                                                          | 2    | Data already has sunrise and sunset per day.                                                                               |
| Loading states                   | `placeholder placeholder-glow` skeleton for weather and feeds                                                                                                                                                                                                                                                                                                                                                                                                            | 1    | Replaces spinner plus sentence while the first fetch runs.                                                                 |
| Feed rows                        | `list-group-item` with `border-start border-3 theme-border theme-series-N`, publication as `fw-semibold`, time `ms-auto fg-3`, excerpt `fg-2` (no `.prose`)                                                                                                                                                                                                                                                                                                              | 1–2  | `prose` stays for About only.                                                                                              |
| Live Bootstrap releases rail     | `card card-subtle theme-primary` + `list-group list-group-flush`, version as `badge badge-outline`, `icon-link`                                                                                                                                                                                                                                                                                                                                                          | 1    | Uses the GitHub release data already fetched.                                                                              |
| Source toggles                   | `chip` buttons with `aria-pressed` (as now), with `chip-icon` check on active                                                                                                                                                                                                                                                                                                                                                                                            | 1    |                                                                                                                            |
| Agent status at a glance         | `avatar theme-codex` + `avatar-status status-online/away/offline`; card gets `card-subtle theme-danger/warning` only when low                                                                                                                                                                                                                                                                                                                                            | 1    | Text status stays in the badge. Agent colour moves from the border to the avatar.                                          |
| Agent headline                   | Limiting allowance first, labelled with its reset countdown; primary allowance second                                                                                                                                                                                                                                                                                                                                                                                    | —    | Fixes D7.                                                                                                                  |
| Agent card footer                | `card-footer fg-2` for "Updated 3 min ago · Reset credits 0"                                                                                                                                                                                                                                                                                                                                                                                                             | 1    |                                                                                                                            |
| Calendar colour                  | A calendar → `series-N` map in simulated data; agenda items use `theme-border` left rules; cells show up to two `badge badge-subtle` titles with `text-truncate` at desktop heights                                                                                                                                                                                                                                                                                      | 1–2  | Dots remain in compact mode.                                                                                               |
| Month cell states                | outside-month: `fg-3` text, no fill; weekend: `bg-2`; today: `theme-primary` outline; selected: `btn-solid theme-primary`                                                                                                                                                                                                                                                                                                                                                | 2    | Drops the `--calendar-*-bg` app tokens if `bg-2` suffices.                                                                 |
| Jump to a date                   | `form-field` in the panel header, `form-control-sm w-auto`, calendar icon through `form-adorn`                                                                                                                                                                                                                                                                                                                                                                           | 1    | Datepicker plugin unchanged.                                                                                               |
| Settings sections                | `nav nav-pills nav-pills-vertical`                                                                                                                                                                                                                                                                                                                                                                                                                                       | 1    |                                                                                                                            |
| Theme picker                     | `radio` inputs with `card card-subtle` labels: four-stop swatch strip, name, description; selected gets `theme-primary`                                                                                                                                                                                                                                                                                                                                                  | 1    | Left-aligned; fixes D5.                                                                                                    |
| Surface re-pointing (D3)         | `@use "bootstrap/scss/bootstrap" with ($list-group-tokens: (--list-group-bg: transparent), $table-tokens: (--table-bg: transparent), $nav-pills-tokens: (--nav-pills-bg: transparent), $dialog-tokens: (--dialog-bg: var(--bg-1)), $menu-tokens: (--menu-bg: var(--bg-1), --menu-item-hover-bg: var(--bg-2)), $popover-tokens: (--popover-bg: var(--bg-1), --popover-header-bg: var(--bg-2)), $toast-tokens: (--toast-bg: var(--bg-1), --toast-header-bg: var(--bg-2)))` | 3    | One place, in `vite.config.ts`. See decision 1.                                                                            |
| Radius and shadows (D8)          | Remove the theme-base overrides; set `$radius` in Sass if the larger scale is wanted; themes set `--shadow-color`                                                                                                                                                                                                                                                                                                                                                        | 3    | Bootstrap's `--shadow-strength` then deepens shadows in dark mode automatically.                                           |
| Lens labels                      | `badge badge-subtle theme-info position-absolute top-0 end-0`                                                                                                                                                                                                                                                                                                                                                                                                            | 1–2  | Shrinks `.lens-label`.                                                                                                     |
| Toasts over content              | `toast` with `card-translucent`-style tokens is not available; keep `toast`                                                                                                                                                                                                                                                                                                                                                                                              | 1    | No change.                                                                                                                 |

New feature-map entries: `navbar`, `tab`, `progress-stacked`, `avatar-stack`,
`avatar-status`, menu descriptions and check marks, `list-group-horizontal`,
`nav-pills-vertical`, `radio`, `form-adorn`, `placeholder`, `divide-*`
utilities. Rows to remove from "available but unused": `placeholder`, `radio`,
`form-adorn`.

## Work packages

Each is one pull request with CI, the 34-case browser run and a visual review
of the affected views in all three themes. Baseline changes are listed so they
can be accepted knowingly.

### WP0: defects

Small, mechanical, and the base for everything after.

- D1 logo: inline SVG mark with token fills; drop `.brand-symbol`.
- D2 nav: `flex-grow-0` on the view nav.
- D3 surfaces: the Sass token block above; delete any app CSS that was
  compensating.
- D4 excerpt: `fg-2` paragraph instead of `.prose`.
- D5 theme choice: `justify-content-start` and `flex-column` now; the full
  picker comes in WP6.
- D6 hourly rain: per-hour deterministic variation around the day's value,
  using the existing hash and the hour's weather code; show the hour's icon.
- D7 copy: exhausted state for hero and badge; agent headline uses the
  limiting allowance.
- D8 tokens: remove the radius and shadow overrides; set `$radius` if needed.

Baselines: all 16 smoke screenshots (the logo and nav appear in every capture).
Docs: `bootstrap-log.md` (surface re-pointing rationale, removed overrides),
`themes.md` (logo tokens, shadow guidance).

### WP1: shell

- `navbar` single-row header with brand, views, clock and controls.
- Heading row: `h1` at `fs-2xl`, no tagline; the scenario badge only when the
  scenario is not `steady`, as `badge theme-warning` with an icon.
- Theme and scheme `menu` in the header.
- Views as `tab-pane`s with the Tab plugin, keeping keyboard shortcuts and
  rotation driving `Tab.show()`. Skip if decision 3 is no.

Baselines: all 16. Docs: feature map (`navbar`, `tab`), `design.md` wireframe.

### WP2: weather

- Current conditions block with measures and sun times.
- Seven-day list with `progress-stacked` range bars.
- Hourly `list-group-horizontal` strip with rain bars and two pages.
- Summary "Outside now" shows the three-day list; compact mode shows one day.
- `placeholder` skeleton while loading.

Baselines: default light weather and summary at both viewports, plus the
other themes' summary. Docs: feature map, `bootstrap-log.md` (no new custom
CSS expected; record it if any appears).

### WP3: feeds

- Two-column view: stories left, releases rail and sources right; one column
  below `lg`.
- Row structure, series colour rule, quieter Live/Demo treatment: a `badge
badge-outline` "Live" on live rows only; the footer disclosure covers demo
  stories, and Bootstrap-category fallbacks keep a "Demo" badge as the roadmap
  requires.
- Summary strip reuses the row structure.

Baselines: feeds and summary captures. Docs: feature map, roadmap "Feeds".

### WP4: summary hero and fitting

- Hero aside per state.
- Compact desktop: four agents (2×2) when the lower row has room; measured
  against 1280×720 in all themes.
- Ultrawide: agents in three sub-columns; hero aside takes the freed width.

Baselines: all summary captures. Docs: theme briefs' screenshot critique
sections, `design.md`.

### WP5: agents and calendar

- Avatar status, status-graded cards, card footer, limiting-allowance headline.
- Calendar colours, cell states, event titles at desktop heights, compact
  jump-to-date in the header.

Baselines: agents and calendar captures. Docs: feature map, `bootstrap-log.md`
(month grid remains the one custom layout).

### WP6: settings, about and lens

- Vertical pills, radio-card theme picker, About as a component inventory with
  `badge`s linking to docs, lens labels as badges.

Baselines: none in the smoke set (dialogs are not captured). Manual review.

### WP7: type

Only if decision 2 is yes: bundle Geist and Geist Mono under
`src/themes/default/fonts/` with licences, set the Default theme's font
tokens, re-check contrast and fitting at 1280×720.

Baselines: all 16.

## Decisions taken

On 2026-10-22 the maintainer agreed to every recommendation below: component
token maps are re-pointed in Sass; Default bundles Geist and Geist Mono; views
are Bootstrap tab panes; the header is a single navbar row; month cells show
event titles at desktop heights; and the three upstream drafts are prepared
after checking that nothing equivalent had been reported.

## Decisions needed

1. **Surface tokens.** Re-point component tokens in Sass (recommended; keeps
   every theme and the contract unchanged) or flip the mapping so
   `--bg-body` is the surface and the shell paints `bg-1`. The flip is closer
   to Bootstrap's semantics but changes every theme, the prepaint script, the
   dark-mode elevation direction and the contract checks.
2. **Fonts.** Bundle Geist and Geist Mono for Default (about 150 KB of woff2,
   downloaded only when Default is active) or stay on system fonts and adopt
   Bootstrap's stack for non-Latin correctness.
3. **Views as tabs.** Bootstrap-owned view switching with a fade, at the cost
   of all five views being mounted at once. The rotation and shortcut code
   calls the plugin instead of setting state. Recommended; it is the most
   Bootstrap-first way to express the dashboard.
4. **Navbar.** Collapse header and nav into one `navbar` row. Recommended;
   it returns about 90 px to every view at 1080p and makes the 1280×720 fit
   easier.
5. **Event titles in month cells** at desktop heights, or dots only.
6. **Upstream posts** (below), which need the maintainer's account.

## Upstream feedback

Candidates for the v6 Feedback discussions, each with a minimal reproduction
from this repository:

- `.nav-overflow` uses `flex: 1 1 0`, so inside a column flex parent it grows
  vertically and pushes content down. A row-only assumption; `flex: 1 1 0`
  with `align-self` or a documented note would help.
- No "surface" token distinct from `--bg-body`. A dashboard with a tinted
  canvas and raised panels has to re-point seven component maps because list
  groups, tables, dialogs, menus, popovers and toasts all assume the body is
  the raised surface.
- `.prose` centres itself with `margin-inline: auto` and a 1000 px cap. That
  surprises anyone using it for a paragraph in a list; a note in the docs, or
  a `prose-start` modifier, would prevent it.

## Verification

For every package: `npm run check`, `npm test`, `npm run test:browser`;
accept only the listed baselines after reviewing the actuals; review the
affected views in all three themes at 1280×720 and 1920×1080, in light and
dark where supported; tab through the changed controls; check
`prefers-reduced-motion` and `forced-colors` for anything that moves or paints
state. Record the result in the theme briefs' critique sections and in
`docs/bootstrap-log.md`.
