# UI redesign: fill the frame, sharpen the glance

Reviewed on 2026-11-04 against `AGENTS.md`, the frontend-design skill
(the local mirror matches upstream byte for byte), the three theme briefs, the
roadmap's feature map and the October [once-over](ui-once-over.md). The
once-over fixed defects and set the component vocabulary. This pass is about
composition: the dashboard should read as one designed instrument at every
desktop size, not as a stack of correct parts.

## Method

- 27 captures from the production build with `?clock=2026-11-03T09:30:00Z`
  and `?seed=reference`: every view in Default light and dark, Nebuchadnezzar
  and Tideline at 1920×1080; Summary at 1280×720 in all three themes; Summary
  at 3440×1440 and 390×844; the `running-low` and `reminder-due` scenarios.
- Source read for the shell, `layout.css`, `app.scss`, `Panel`, `AgentCard`,
  the agent simulation and the theme folders. Bootstrap `6.0.0-alpha.1`'s
  `scss/` was checked for every class this plan names.

## What already works

The single navbar row, the tab-pane views, the three panel grades, the series
colour rules, the range bars, the hourly strip, the theme menu, keyboard
focus, forced colours and the phone reading order. Keep all of it. Nothing in
this plan changes a Bootstrap component for a custom one.

## Findings

Ranked by how much they cost the glance.

| #   | What you see                                                                                                                                                                                                                                                                                                           | Cause                                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Every desktop view leaves a dead band above the footer: about 230 px (21 %) of Summary at 1920×1080, about 290 px on Feeds, 225 px on Weather, 215 px on Calendar and 140 px on Agents. Nebuchadnezzar's black canvas makes it look like a broken page.                                                                | `.dashboard-grid` has no row sizing, so rows take their content height, and `main` grows without its children following. Because the root font scales with `min(100dvh/1080, 100vw/1920)`, a 16:9 screen is the 1920×1080 layout in `rem`, so the band appears on every 16:9 desktop, not just one size. |
| F2  | Lists stop early while space sits empty: Summary shows 2 events with "+3 more events", 3 stories, and two forecast days; at 1280×720 it shows 2 agents and "+4 more agents" above 70 px of nothing; Nebuchadnezzar at 1920×1080 shows 3 agents and "+3 more agents" above 300 px of nothing; Feeds pages at 4 stories. | Fitting is one boolean (`compactDesktop`, height under 60 rem) feeding fixed caps (`max={compactDesktop ? 1 : 2}`, `summaryAgentCount`, `previewDays`). The caps don't know how much room their panel has.                                                                                               |
| F3  | Four of six agents are "Running low" in the steady scenario, so the warning colour is the page's main colour and stops meaning anything.                                                                                                                                                                               | Every session window is `floor(time / 5 h)`, so all session allowances share UTC boundaries and run out together. At 09:30 they are all 4½ hours into a 5-hour window.                                                                                                                                   |
| F4  | The hero says the same thing three times: the card title "Needs attention", the line "Agent capacity" above the heading, then "OpenCode is running low". In the event state, the aside holds only two small badges and one "Then…" line.                                                                               | Labels added per state with no review of the whole stack. The skill lists "unnecessary typographic labels above content" as a tell.                                                                                                                                                                      |
| F5  | Each view spends a row on an `h1` that repeats the selected pill ("Calendar" above "November 2026"; "Your day, in focus" is a tagline).                                                                                                                                                                                | Shell heading row from before the navbar merge.                                                                                                                                                                                                                                                          |
| F6  | Agent cards repeat the limiting allowance: the headline, the prose line under it, then the first bar row say "Session resets in 30m" again. Single-allowance cards (Grok) are half empty. Graded warning cards in Default light are tan rather than amber.                                                             | `AgentCard` renders the headline and the full allowance list without deduplicating. Default's `--warning-base` `#77510a` gives a brown `bg-subtle`.                                                                                                                                                      |
| F7  | Weather's range bars run 780 px wide at 1920 and dominate the view; the "now" block is small beside them. "7 °C" separates the number from its unit by a wide gap.                                                                                                                                                     | The bar column takes all free width in the table. The unit is a separate superscript element.                                                                                                                                                                                                            |
| F8  | Feeds shows two near-identical chip rows: the filter (All, Bootstrap, Technology…) and the Sources toggles (Bootstrap, Technology…). In a replay the Bootstrap rail is a panel holding one sentence.                                                                                                                   | Filters and source settings both live on the view. The rail has no replay content.                                                                                                                                                                                                                       |
| F9  | Calendar weekends are solid grey slabs that outweigh weekdays with events, and the day panel is half empty after five events.                                                                                                                                                                                          | `--calendar-weekend-bg` fill; the day panel shows only the selected day.                                                                                                                                                                                                                                 |
| F10 | Tideline reads as Default in teal: same composition, same weights, and `system-ui` type. Nebuchadnezzar's `ui-monospace` renders as a different face on each OS (DejaVu Sans Mono in Linux captures).                                                                                                                  | Theme folders change colour tokens only; neither brief bundles a face. Bootstrap's own stack omits `system-ui` because of non-Latin rendering (twbs/bootstrap#42703), and Settings offers `ja-JP`.                                                                                                       |
| F11 | The footer takes three lines (about 75 px) at 1920×1080.                                                                                                                                                                                                                                                               | Disclaimer and build credit stack on the left at every width.                                                                                                                                                                                                                                            |

## Design plan

### Brief, restated

Subject: an always-on dashboard for people who work with AI coding agents.
Primary job: from across a desk, tell me what needs attention: capacity, the
next event, the weather. Hero: the most urgent Summary item. Secondary job:
show Bootstrap 6 at its best.

### The one bold move

**The hero takes the colour of its state.** The hero becomes `card-subtle` in
the role that matches the situation: `theme-warning` when an agent is running
low, `theme-danger` when an allowance is used up, `theme-primary` for the next
event, `theme-success` for a clear stretch. Status reads before any word does,
and from two metres. Everything else stays quiet: supporting panels keep
neutral surfaces, healthy agents lose their badges, and the only other
saturated colour on Summary is the series rules.

Inside the hero, the headline grows to `text-5xl` and states the situation once.
The aside leads with the one number that decides what to do next, set in the
theme's mono face: the reset countdown ("30 min") for capacity, or the time
until the event ("in 3 min") for the calendar. "Big number, small label" is a
default treatment, so it is allowed here only, where the number is the
decision. Nowhere else on Summary uses it.

### Palette

Each brief keeps its palette. Two token changes, both inside theme folders and
both checked by the contract:

| Theme    | Change                                                                                                                                                      | Why                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Default  | `--warning-base` moves from tan `#77510a` towards a clearer amber, about `#8a5a00` in light (final value set by the 4.5:1 text check); dark stays `#edcd85` | Warning hero and graded cards must read amber, not brown, now that the hero takes the role |
| Tideline | No hex changes; signal coral `#ad3d35` becomes the hero's danger and warning edge rather than a fill                                                        | The brief reserves coral for meaningful action                                             |

Default for reference: porcelain `#f3f6fa`, midnight `#13243b`, cobalt
`#224cbb`, ocean `#176776`, steel `#52647c`.

### Type

| Theme          | Body and headings                     | Mono (clock and readings)             | Status     |
| -------------- | ------------------------------------- | ------------------------------------- | ---------- |
| Default        | Geist Variable                        | Geist Mono Variable                   | Unchanged  |
| Tideline       | Atkinson Hyperlegible Next (proposed) | Atkinson Hyperlegible Mono (proposed) | Decision 2 |
| Nebuchadnezzar | Martian Mono (proposed)               | Martian Mono                          | Decision 2 |

Atkinson Hyperlegible was drawn for legibility at a distance and at small
sizes, which is the chartroom's job and this dashboard's viewing distance
(0.8–1.8 m). Its mono sibling keeps readings in the same voice. Martian Mono
has a width axis (to confirm in the Fontsource package before building), so console headings can be set wide and dense readings
narrow while staying in one face, and it renders the same on every OS. All
three packages are `@fontsource-variable` 5.3.0 under the SIL OFL 1.1, and
each downloads only while its theme is active.

Scale, in Bootstrap's font-size utilities: hero headline `text-5xl`, hero
decision number `text-6xl` mono, panel titles `fs-lg`, readings `fs-md`
semibold, meta `small fg-2`. Weight does the work; no capitals, no tracking.

### Layout

The page fills the viewport on desktop. Rows share the height left after the
navbar and footer; lists inside panels show as many rows as fit and end with
"+N more" only when something is actually hidden.

Summary at 1920×1080 (standard layout):

```text
+--------------------------------------------------------------------------------------+
| [D] Dayframe  Summary  Agents  Calendar  Weather  Feeds        9:30  Tue 3 Nov | ⟡ ⚙  |
+------------------------------------------------------------+-------------------------+
| (warning-tinted hero)                                      | Outside now             |
| [! Running low]                                            | ⛅ 7°C  Partly cloudy    |
| OpenCode is running low                   Resets in        | Willowmere  feels 6°    |
| 14% of the session allowance remains.     30 min           | Today  1%  2° ░▮▮▮▮ 12° |
| The monthly allowance still has 90%.      ▮▮░░░░░░░ 14%    | Wed   21%  5° ░░▮▮▮ 14° |
| [Review agent capacity]                   Use instead      | Thu   66%  3° ░▮▮▮░ 13° |
|                                           CU Cursor   93%  | (days fit to height)    |
|                                           GR Grok     74%  |                         |
+--------------------------+---------------------------------+-------------------------+
| Agent capacity  View all | Today                           | Across your feeds       |
| CX Codex       62% left  | All day  Release week           | Lanternbyte Journal     |
| ▮▮▮▮▮▮░░░░               | 9:15     Daily build check      | A tiny compiler…        |
| CL Claude      48% left  | 9:45     Pause and plan         | Willowglass Review      |
| ...six readings, 2 cols  | 10:00    Quiet build time       | Designing a dashboard…  |
| (badges only off-normal) | 10:45    Prototype critique     | (stories fit to height) |
|                          | (+N more only if hidden)        |                         |
+--------------------------+---------------------------------+-------------------------+
Simulated demo data. Product names belong to their owners.    Bootstrap 6.0.0-alpha.1  About Bootstrap  ↻
```

The view heading becomes `visually-hidden`: the selected pill and each
panel's title already name what is on screen, and screen readers keep the
`h1`. The scenario badge moves into the navbar beside the clock.

Agents: a 3×2 grid whose rows split the height. Each card shows the headline
reading once, then only the allowances the headline doesn't already cover, so
no line repeats. Graded cards tint the header and border only.

```text
+--------------------------+--------------------------+--------------------------+
| CX Codex  Pro            | CL Claude  Max           | CU Cursor  Pro           |
| 62% left                 | [Running low]  21% left  | 93% left                 |
| Session resets in 2h 10m | Session resets in 30 min | Monthly resets in 27d    |
| Weekly       76% ▮▮▮▮▮░  | Weekly        78% ▮▮▮▮░  | Other models 89% ▮▮▮▮▮░  |
| Updated 3 min ago        | Weekly Fable  79% ▮▮▮▮░  | Cursor models 92% ▮▮▮▮▮░ |
+--------------------------+--------------------------+--------------------------+
| ...second row, same height                                                     |
+--------------------------------------------------------------------------------+
```

Calendar: the month grid's six rows split the panel height, so cells grow on
tall screens and event titles get room. Weekends lose their fill and take
`fg-2` numerals instead. The day panel adds a "Later this week" list below the
selected day's agenda, fitted to the remaining height.

Weather: the "now" block and the week share the top row at equal weight; the
week's range bars are capped near 24 rem so the temperatures sit close to
their days; the hourly strip spans the bottom row. The degree sign stays
attached to the number ("7°") with the unit beside the condition.

```text
+-------------------------------------+------------------------------------------+
| Willowmere        Location and units| This week                                |
| ⛅ 7°  Partly cloudy, °C             | Today ⛅  1%   2° ░▮▮▮▮▮▮▮░ 12°           |
| Feels like 6°   Wind 22 km/h        | Wed   ⛅ 21%   5° ░░░▮▮▮▮▮▮ 14°           |
| Humidity 66%    Rain chance 1%      | ...                                      |
| Sunrise 07:44   Sunset 16:56        |                                          |
+-------------------------------------+------------------------------------------+
| Next hours                                                     ‹ 09:00 21:00 › |
| 09 10 11 12 13 14 15 16 17 18 19 20                                            |
+--------------------------------------------------------------------------------+
```

Feeds: one filter row of chips on the story list, which fits to height and
pages. The rail keeps Bootstrap blog posts and releases; in a replay it shows
the bundled release and a link to Bootstrap's releases page instead of a
sentence. Source selection lives in Settings → Feeds, reached from a "Manage
sources" button on the list (decision 3).

Ultrawide and console layouts keep their existing column plans; they gain the
same row sizing. Below the 68.75 rem threshold nothing changes: one scrolling
column in today's reading order.

### Principles

1. **Fill the frame.** On desktop, no view leaves empty canvas above the
   footer. Space goes to more rows of real content, never to bigger padding.
2. **State is colour, once.** The hero carries the situation's role. Healthy
   things are quiet; only exceptions get a badge.
3. **Say it once.** Every fact appears one time per panel. No eyebrows over
   headings, no headings that repeat the nav.
4. **Bootstrap decides how.** Tints are `card-subtle theme-*`, sizes are
   Bootstrap font-size utilities, lists are `list-group`, hidden headings are
   `visually-hidden`, row sizing is the `.grid` `--rows` token. The only new
   custom code is the row-fitting action (logged as a step-4 gap).
5. **Each theme earns its own voice.** Type and structure, not only hue, tell
   the three themes apart.

### Review against the brief

Ideas tried against the brief and changed:

- **A giant clock as the hero.** It is the first thing a wall dashboard
  usually shows, but the brief names the urgent item as the hero. The clock
  stays in the navbar at its current size.
- **Big-number tiles on every panel.** The default dashboard treatment; it
  would flatten the hierarchy the hero needs. Restricted to the hero's single
  decision number.
- **Sorting agents by urgency.** It would put the problem first, but rows that
  move between glances break the visitor's spatial memory. Fixed order stays;
  colour and badges carry urgency.
- **A gradient or glow behind the hero.** Decoration rather than state.
  Replaced by Bootstrap's `card-subtle` role tint.
- **Shrinking type to fit more rows.** The brief fixes the `0.875rem` root
  floor. Fitting changes row counts, never text size.
- Kept from the once-over: left alignment everywhere, no all-caps labels, no
  appended arrows, mono only for the clock and readings outside the console.

## Unslop audit

A second lens: [unslop](https://github.com/heydamir/unslop) by Damir
Sokolovsky (CC BY 4.0), read on 2026-11-04 from its `skills/unslop/SKILL.md`
and `references/`. It was applied as a review method, not installed.

**Verdict: light slop.** The screen is designed; no gradients, glows, emoji,
gradient text, looping motion or capitals. Unslop's rule for light slop is a
polish pass that keeps palette, type and layout. The fixes below are that
pass. The larger moves in this plan (filling the frame, the state-tinted hero,
theme faces) go beyond it because you asked for a substantially better UI;
unslop's own checklist item "the first screen is composed as a whole with no
dead empty band" supports the biggest of them.

**Direction, in unslop's five lines:**

- **Product.** An always-on desk dashboard that shows developers which coding
  agent has capacity, what is next on the calendar and what the weather is
  doing.
- **Character.** Steady, exact, unhurried.
- **World.** A mission-control desk on a long shift: instruments, status
  boards, a clock you trust. (Default's brief already names it.)
- **Moments.** The hero in its state colour, and the week's temperature
  ranges. Everything else stays neutral.
- **Signature.** Keycaps. Dayframe is driven from the keyboard (1–5, `s`, `a`,
  `c`, `w`, `f`, `,`), so showing the shortcut keys is a detail only this
  product would have.

**Signs found:**

| #   | Sign                                 | Where                                                                                                                                | Fix                                                                                      |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| U1  | Meta strings joined with middle dots | "Tue 3 Nov · replay", "Feels like 6° · Wind 22 km/h · 66% humidity", "OpenCode · Session", "Weekly · Fable", the reminder toast      | Separate items with layout (`hstack` gaps, label–value pairs)                            |
| U1  | Trailing full stop on a caption      | "Simulated forecast · no live location selected."                                                                                    | "Simulated forecast, no live location" without the stop                                  |
| U1  | Mixed time formats                   | Sunrise "07:44" beside the clock's "9:30" and the agenda's "9:15"; countdowns "30m" in one place and "30 min" proposed in another    | One format from `formatTime` and one countdown format everywhere                         |
| U2  | Weight for hierarchy                 | `fw-semibold` on every title, name, reading and the hero                                                                             | `fw-medium` for titles; size and `fg-*` colour carry hierarchy                           |
| U3  | Every element highlighted            | Four warning badges; all seven range bars and every healthy allowance bar in full role colour                                        | Healthy bars and other days neutral (`theme-secondary`); colour for exceptions and today |
| U4  | Pills for counts and plain readings  | "+3" badges in calendar cells; "93% monthly" badges in "Ready to use"; "Available" badges                                            | Quiet `small fg-2 tabular-nums` text; badges only for state                              |
| U5  | Icons that add nothing               | A droplet before every rain percentage in the week and Summary; a battery icon in every status badge                                 | One column label for rain; keep icons only where they explain                            |
| U6  | Same thing, different size           | The three lower Summary panels put their titles at three heights (468, 473 and 479 px) because card and quiet grades pad differently | One title row geometry for every panel grade                                             |
| U7  | No signature detail                  | Shortcuts exist but are invisible until a tooltip                                                                                    | `<kbd>` keycaps (decision 6)                                                             |
| U8  | Equal cards side by side             | Agents view: six identically structured cards                                                                                        | Vary by content (fixes in F6); or a comparison table (decision 8)                        |
| U9  | Coloured dashboard surfaces          | Default dark canvas `#0c1727` reads as navy; unslop wants near-neutral surfaces in dashboards                                        | The brief chooses navy, and `AGENTS.md` says the brief wins; decision 7                  |

**Where unslop and this repo disagree, the repo wins:**

- Unslop's tokens are pixels on a 4 px grid, lucide icons, its own hex ramps,
  shadows and easing curve. Dayframe sizes in `rem` with Bootstrap's spacer
  scale, uses Bootstrap Icons, takes colour from the theme briefs and
  Bootstrap's shadow and transition tokens. Only the principles transfer.
- Unslop puts the hero's richness in a generated image or rendered object.
  Its own guidance says dashboards rarely need one, and Bootstrap has no
  component for it, so the hero's moment is its state colour and decision
  number instead.
- Unslop's story video and image generation are out of scope.

## Bootstrap mapping

| Need                                   | Bootstrap 6                                                                                                                                                                                   | Step | Notes                                                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rows that share the viewport height    | Bootstrap's own `.grid` row token: `--rows: 2` (it already sets `grid-template-rows: repeat(var(--rows), 1fr)`); `card` `h-100`; `main` and `tab-content` as `d-flex flex-column flex-grow-1` | 2–3  | Delete the `grid-template-rows: none` override in `layout.css` that currently switches Bootstrap's row sizing off. No new custom CSS                   |
| Lists that fit their panel             | Svelte action `use:fitRows` with `ResizeObserver`: measures the panel's free block size and row heights, renders N rows and a `btn btn-link` "+M more"                                        | 4    | Replaces `compactDesktop` caps; deterministic for a viewport; logged in `bootstrap-log.md` with the private edition's "+N more" behaviour as precedent |
| Hero tinted by state                   | `card card-subtle theme-warning/danger/primary/success`                                                                                                                                       | 1    | Theme hero tokens (radius, spacing) keep working; `--card-bg` takes the role's `bg-subtle`                                                             |
| Hero status cue                        | `badge theme-<role>` with icon                                                                                                                                                                | 1    | Replaces the eyebrow line and the visible card title                                                                                                   |
| Hero decision number                   | `text-6xl font-monospace tabular-nums`                                                                                                                                                        | 2    |                                                                                                                                                        |
| Hidden view heading                    | `visually-hidden` on the `h1`                                                                                                                                                                 | 2    | Panel `aria-label`s unchanged                                                                                                                          |
| Hero title hidden, section still named | `visually-hidden` on the hero's `h2`                                                                                                                                                          | 2    |                                                                                                                                                        |
| Quiet healthy agents                   | No badge when healthy; `avatar-status` and the bar colour remain, with a `visually-hidden` "Available"                                                                                        | 1–2  | Contract rule "every state has a text cue" still holds                                                                                                 |
| Agent card without repetition          | `card-header`, `card-body` with `vstack`, `card-footer`                                                                                                                                       | 1    | Template change only                                                                                                                                   |
| Calendar rows that fill                | Month grid rows as `1fr`                                                                                                                                                                      | 4    | The month grid is already the logged custom layout                                                                                                     |
| Quieter weekends                       | `fg-2` numerals; remove `--calendar-weekend-bg`                                                                                                                                               | 2    | Removes an app token                                                                                                                                   |
| Week ahead list                        | `list-group list-group-flush` with series `border-start` rules                                                                                                                                | 1    | Same `Agenda` component                                                                                                                                |
| Capped range bars                      | `progress-stacked` in a column sized with `max-width`                                                                                                                                         | 1–2  |                                                                                                                                                        |
| One feed filter row                    | `chip` buttons; "Manage sources" `btn btn-text` opening Settings → Feeds                                                                                                                      | 1    | Removes `FeedSources` from the view                                                                                                                    |
| Replay rail                            | `card` + `list-group` with the bundled version as `badge badge-subtle` and an `icon-link` to the releases page                                                                                | 1    | A plain link, not a request; no new origin                                                                                                             |
| One-line footer at `xl`                | `d-flex flex-wrap justify-content-between`, `xl:flex-nowrap`                                                                                                                                  | 2    |                                                                                                                                                        |
| Theme faces                            | `@fontsource-variable` imports in each theme's `theme.css`; `--body-font-family`, `--font-mono`                                                                                               | 3    | Only if decision 2 is yes                                                                                                                              |
| Staggered session windows              | Per-agent phase in `quotaWindow`, derived from the seed with `hash`                                                                                                                           | —    | Deterministic; no `Math.random()` or clock reads                                                                                                       |
| Quiet headings                         | `fw-medium` (500) for panel and card titles; `fw-semibold` only for the hero headline and readings                                                                                            | 2    | U2                                                                                                                                                     |
| Neutral bars, accent on what matters   | `progress-bar theme-secondary` for healthy allowances and non-today forecast days; role colours only for low allowances and today                                                             | 1    | U3                                                                                                                                                     |
| Quiet counts and readings              | Plain `small fg-2 tabular-nums` text for "+3" day counts and "93% monthly"; badges stay for state only                                                                                        | 2    | U4                                                                                                                                                     |
| Shortcut keycaps                       | `<kbd>` (styled by Bootstrap's reboot tokens) beside each view pill from `xl`, and in tooltips; hidden when shortcuts are off                                                                 | 1–2  | U7, decision 6                                                                                                                                         |

## Work packages

One branch and one pull request, one commit per package, so review can follow
the steps. Every package runs `npm run check`, `npm test` and
`npm run test:browser`.

### WP0: data and small fixes

- F3: give each agent's session window a deterministic phase offset, so a
  steady replay usually shows one agent low and the rest healthy. Update unit
  tests that pin specific percentages to the new, intended values and say so
  in the PR.
- F7: attach the degree sign; move the unit beside the condition.
- F11: one-line footer at `xl`.
- F5: `visually-hidden` view headings; scenario badge into the navbar.
- U1–U6 from the [unslop audit](#unslop-audit): meta strings, one time
  format, heading weights, neutral bars, quiet counts, repeated icons,
  aligned panel headers.

### WP1: fill the frame

- Row sizing for the standard, console and ultrawide grids, and for the
  Agents, Calendar, Weather and Feeds layouts.
- `use:fitRows` for Summary's agents, agenda, stories and forecast days, the
  Calendar day panel, and Feeds' page size. Remove the fixed caps;
  `compactDesktop` stays only for density choices (avatar size, dense cards).
- Measure at 1280×720, 1920×1080, 2560×1440 and 3440×1440 in all three
  themes: no dead band, no clipped row, every hidden item reachable through
  "+N more".

### WP2: hero

- State-tinted `card-subtle`, status badge, `text-5xl` headline, one context
  sentence, one action.
- Aside per state: capacity (countdown, limiting bar, "Use instead" list);
  event (time until, attendees `avatar-stack`, calendar and location badges,
  the next event after it); clear stretch (three best agents).
- Default `--warning-base` adjustment, verified by the contrast contract.

### WP3: Agents and Calendar

- Agent cards without repetition; badges only off-normal; graded header and
  border.
- Calendar rows that fill, quieter weekends, "Later this week".

### WP4: Weather and Feeds

- Weather two-up top row, capped range bars, hourly strip across the bottom.
- Feeds single filter row, "Manage sources", replay rail content.

### WP5: theme voices

Only if decision 2 is yes.

- Tideline: Atkinson Hyperlegible Next and Mono; flat ruled panels (no shadow,
  transparent card caps with a `border-bottom` rule); coral only on the
  hero's edge in warning and danger states. Brief updated.
- Nebuchadnezzar: Martian Mono, wide headings and narrow readings through the
  width axis. Brief updated.
- `docs/dependencies.md` gains the two packages.

### Documentation

`docs/design.md` (wireframe and principles), each theme brief's plan and
screenshot critique, the roadmap feature map (`visually-hidden`, hero
`card-subtle`, row fitting), `docs/bootstrap-log.md` (the fitting action, the
removed `grid-template-rows` override, removed weekend token), `docs/themes.md` if the hero tint changes
what themes must supply. `npm run showcase` refreshes the README images.

## Baselines

All 16 smoke screenshots change, intentionally: the hidden heading, row
sizing and footer touch every capture, and the data change alters readings.
Each is reviewed against the matching capture before it is accepted, following
[CI and review evidence](../ci.md#screenshot-comparison-and-review).

## Risks

- **Functional tests that click "+N more events".** They run at 1280×720,
  where the Calendar day panel is expected to still hide events with fitting.
  If it doesn't, the fit is wrong or the test needs a fixture that overflows;
  either way it comes back to you before any assertion changes.
- **Fitting jitter.** Row counts depend on measured heights, so fonts must be
  loaded before the first fit (`document.fonts.ready`) and refits must be
  debounced to resize, not to data ticks, or rows would flicker once a minute.
- **Font weight.** Two more theme faces add roughly 150–250 KB of woff2 each,
  downloaded only by visitors who choose those themes.
- **Hero tint contrast.** Every role's `bg-subtle` must hold 4.5:1 for the
  hero's text in every theme and scheme. The contract checks decide; no check
  is relaxed.

## Decisions needed

1. **Scope.** All of WP0–WP5 in one PR (recommended: they share the baseline
   churn), or WP0–WP2 first and the rest after you have seen the new Summary.
2. **Theme faces.** Bundle Atkinson Hyperlegible for Tideline and Martian Mono
   for Nebuchadnezzar (recommended), or keep their briefs' system fonts.
3. **Feeds sources.** Move source selection into Settings behind "Manage
   sources" (recommended), or keep the Sources card on the view.
4. **Steady data.** Stagger session windows so the default replay shows one
   low agent (recommended), or keep today's simulation and accept four
   warnings on first visit.
5. **Hidden view headings.** Hide the `h1` visually on every view
   (recommended), or keep it on Summary only with a plain name instead of
   "Your day, in focus".
6. **Keycap signature.** Show shortcut keycaps on the view pills at `xl` and
   wider (recommended), or keep shortcuts in tooltips only.
7. **Default dark surfaces.** Keep the brief's navy (recommended for now; the
   brief wins), or amend the brief to move dark surfaces towards a near-neutral
   ink, as unslop advises for dashboards.
8. **Agents view form.** Keep six cards with the fixes above (recommended), or
   trial a single comparison `table` with one row per agent and progress cells.
9. **unslop in the repo.** Use it as a review lens only (what this plan does),
   or vendor it into `.agents/skills/unslop/` with its CC BY 4.0 credit and
   name it in `AGENTS.md` beside frontend-design. Vendoring changes the agent
   instructions, so it would be its own small PR.
