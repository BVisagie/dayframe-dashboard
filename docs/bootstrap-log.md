# Bootstrap release log

## 6.0.0-alpha.1 — initial application

The initial dependency is exactly `6.0.0-alpha.1`. No upgrade is included in
this build. The feature map in `roadmap.md` follows the published package.

Bootstrap is compiled through its Sass module API. Complete dashboard colour
roles extend `$theme-colors`. A build plugin nests Bootstrap's own layers in
`bootstrap` and moves its generated utilities to `bootstrap-utilities` after
theme and application rules. Global property registrations remain global.
The CSS target explicitly preserves native `light-dark()` at Bootstrap's
browser floor. Runtime tests exercise tokens and component colours in each
supported scheme.

Bootstrap's `banner` Sass module emits its copyright header; it is not a UI
component. The feature map uses `alert` for notices. Feed category filters use
native buttons styled with `chip`; the editable `Chips` input plugin is not a
category filter. Other interactive components attach their real plugins with
Svelte actions, which dispose them when their elements leave the view.

Summary, Agents, Calendar, Weather and Feeds are implemented. The mobile
navigation keeps Bootstrap NavOverflow's menu: application clicks delegate
from the common ancestor so cloned items navigate, and the action refreshes
clones when the original links' active classes or `aria-current` change.
The Datepicker action updates selected dates in place and recreates the
plugin when configuration such as locale or first weekday changes. Svelte
continues to own the selected day and input node when the calendar peer restores
a clone during disposal. Global shortcuts yield to the datepicker and open
dialogs, and resume when the native dialog closes. Settings can disable all
single-character shortcuts, and modified keys, including Shift, are ignored.
About, Settings and the full agenda use scrollable Dialog bodies on desktop
and Drawer bodies on narrow screens. Dismiss buttons close through Bootstrap's
plugin before Svelte unmounts the dialog, preserving focus restoration.

Datepicker's default `left` placement always opens below its input. The
Calendar uses the plugin's `auto` option so the calendar peer chooses the side
with room and adjusts horizontally. This fixes the popup falling below the
viewport without custom positioning or a dependency change.

Agent cards use one Bootstrap Progress per allowance, with a fill and accessible
value expressing percentage remaining. Shared windows, optional model pools,
reset countdowns and Codex reset credits replace the old unit counts and SVG
history charts for every agent. Bootstrap's responsive column utilities lay
out one, two or three columns; compact desktop cards use spacing utilities to
keep every window visible. The repeated Agents alert is removed; the footer
retains the simulation disclosure.

The feature map lists only components and helpers used by the app. Alpha.1
buttons use `btn-text` or a themed `btn-outline`; loading indicators use
`spinner-border spinner-sm`. Display scale uses `form-range` with a
`form-range-input` child, so Bootstrap's Range plugin attaches. Unused helpers
remain explicitly listed as available rather than demonstrated.

Combobox alpha.1 registers itself and its internal Menu on the same toggle,
which Bootstrap's instance registry rejects. This emits one construction
warning. Menu's delegated capture handler constructs additional unregistered
instances on keyboard navigation; their submenu listeners remain attached
after the owned plugin is disposed. Probes measured listener accumulation,
not heap growth. A bubble listener cannot prevent this capture-phase path.
Desktop and drawer regressions verify three choices, arrows, Home, End,
Escape, selection and reopening. The warning and additional listeners remain
upstream limitations; no warning is suppressed or dependency patched. Track
[Bootstrap issue 42965](https://github.com/twbs/bootstrap/issues/42965).

### UI once-over (October 2026)

A full review against the frontend-design skill and the theme briefs is
recorded in `docs/plans/ui-once-over.md`; this entry records what it changed
in how Dayframe uses Bootstrap.

- **Shell.** The header is a `navbar`: `navbar-brand` with an inline SVG mark
  filled with theme tokens, the view `nav` inside `nav-overflow`, the clock
  and the control `btn-group`. Below `md` a `w-100 order-last md:d-contents`
  wrapper moves the nav to its own row without custom CSS.
- **Views as tabs.** The five views are `tab-pane`s shown by the Tab plugin.
  Application state follows `shown.bs.tab` and asks the plugin to show a view
  for shortcuts, rotation and the URL. NavOverflow clones the triggers into
  its menu, so the action strips `role`, `aria-selected`, `aria-controls`,
  `tabindex` and `data-bs-target` from the clones; delegated clicks on
  `[data-view]` still navigate. The two plugins do not coordinate keyboard
  focus: Tab's arrow keys focus the next trigger even when NavOverflow has
  hidden it, which blurs the tablist, and its roving tabindex leaves no tab
  stop when the active trigger sits in More. The navigation action handles
  the arrow, Home and End keys before Tab sees them, keeps focus on the
  trigger or on the More toggle, and gives the first visible trigger the tab
  stop whenever the active one is hidden. This is a candidate for upstream
  feedback alongside the drafts below.
- **Header menu.** `menu-header`, `menu-divider`, `menu-item-icon` swatches,
  `menu-item-content` with `menu-item-description`, and `selected` with
  `menu-item-check` make one menu switch both theme and colour scheme.
- **Surface mapping.** Dayframe paints its canvas with `--bg-body` and raised
  panels with `--bg-1`, the reverse of Bootstrap's light-mode order. The
  component token maps that assumed the body is the raised surface are
  re-pointed in the Sass configuration: list group and table backgrounds are
  transparent, nav and pill backgrounds use `--bg-2`/`--bg-3`, and dialog,
  menu, popover, toast and datepicker surfaces use `--bg-1`. This removed the
  striped list rows, grey table cells and the white bar behind the view pills
  without any app-layer CSS. The missing "raised surface" role is drafted as
  upstream feedback.
- **Scales.** Theme-base no longer redefines `--radius-1…9` or the
  `--box-shadow*` tokens; Bootstrap's `$radius` and `$shadows` (with
  `--shadow-color` and `--shadow-strength`) now apply, so dark mode deepens
  shadows on its own.
- **Grid.** Responsive `g-col` utilities are container queries against the
  nearest `.grid`, not viewport media queries. Nested grids therefore use the
  breakpoint that matches their own width (the hero's aside splits at `md`).
- **Nav overflow.** `.nav-overflow` is `flex: 1 1 0`. As a direct child of a
  column flex shell it grew into the free height and pushed the view heading
  down by up to 90 px. Placing it in the navbar's row removes the growth; the
  column case is drafted as an upstream bug report.
- **Prose.** `.prose` sets `max-width: 1000px; margin-inline: auto`, so a
  feed excerpt using it was centred inside its row. `prose` now styles only
  the About dialog's running text.
- **Fonts.** The Default theme imports `@fontsource-variable/geist` and
  `@fontsource-variable/geist-mono` in its own `theme.css`; the `@font-face`
  rules ship in the single stylesheet and the browser downloads a family only
  when the active theme uses it. Licences are appended to the third-party
  notices.
- **Weather.** The seven-day forecast is a borderless table whose rows hold a
  `progress-stacked` temperature range on the week's shared scale; the hourly
  outlook is a table laid out as `list-group list-group-horizontal` inside a
  `contains-inline` container, each hour with its own icon and a `progress`
  rain bar; a `placeholder-glow` skeleton covers the first live load. The
  horizontal list does not wrap or scroll, so the page size follows the
  strip's measured width and the time format: twelve-hour labels need wider
  cells, and a 1024-pixel tablet shows eight hours per page instead of
  twelve.
- **Feeds.** Stories and a live Bootstrap rail in a two-column `.grid`; story
  rows carry a series-coloured `border-start` rule. `theme-border` sets the
  whole border shorthand and `theme-*` on a card cascades into nested list
  items, so the rule sits on an inner wrapper with `border-<role>`. Alpha.1's
  `.chip:focus-visible { outline: 0 }` draws no ring, so chips carry the
  `focus-ring` helper, and the active filter chip keeps a check icon so it
  survives forced colours.
- **Settings, About and lens.** Sections use `nav-pills-vertical`; theme
  choices are `card card-subtle` toggle buttons with a swatch strip; fields use
  `form-field`, `form-text` and `input-group`; About lists every component as
  a `badge` link; lens labels are badges placed with utilities, which removed
  the custom label and placement rules. A docs-section map now resolves each
  `data-bs-component` name to the right documentation path.
- **Agents and Calendar.** Agent cards are graded by status with
  `card-subtle` theme roles, `card-header`, `card-footer` and an
  `avatar-status` dot; the headline is the limiting allowance with its reset.
  Month cells show event titles as series-coloured badges at desktop heights
  and dots elsewhere; the month grid remains the one custom layout, day
  buttons get their height through `--btn-min-height`, and the selected day
  paints the system Highlight pair under forced colours. The jump-to-date
  field moved beside the month controls as a small adorned control.
- **Simulation.** Hourly precipitation now drifts around the day's chance,
  and dry hours of a wet day show cloud, so the hourly strip has something
  to show.

The three upstream drafts (nav-overflow growth, surface token, prose
centring) are in `docs/plans/upstream-feedback.md`, checked against open and
closed issues, pull requests and the v6 Feedback discussions on 2026-10-22.

### Custom code inventory

Bootstrap does not provide these dashboard-specific capabilities:

- Clock, deterministic simulation, URL overrides, persisted settings and live
  source adapters. These are application state and data rather than replacement
  Bootstrap controls.
- Theme discovery, validation, prepaint selection and token derivation from
  minimal theme seeds. Complete role values drive Bootstrap components.
- Viewport and visitor display-scale composition with a `0.875rem` root floor
  (14 CSS pixels at the default browser size), named dashboard layout areas
  and height-aware content fitting. Compact desktop views reduce preview
  rows, expose more-content controls and page hourly forecasts and feeds;
  they do not lower the root floor to fit. Bootstrap's grid, utilities,
  container queries and Pagination remain the layout primitives. Agent readings
  use Bootstrap’s `set-container` and `container-breakpoint-up` Sass mixins
  to keep wide panels on one line while narrow readings wrap.
- Feed page windowing. Bootstrap's Pagination supplies styling and semantics;
  application state limits the numbered pages to the first, last and current
  page with its neighbours, separated by ellipses, so long feeds fit phones.
- Svelte state integration for NavOverflow's cloned menu items and changing
  Datepicker options. Bootstrap owns both controls; the actions bridge their
  lifecycle and updates to application state.
- Tooltip titles and Range fills follow Svelte updates through the plugins'
  own APIs, including shortcut changes and programmatic settings resets.
- Shell dimensions, the hero's optional display face, tabular figures for
  readings and the clock (Bootstrap has no `font-variant-numeric` utility),
  compact quota rows and source attribution. These rules live in the `app`
  layer and use Bootstrap tokens and rem units.
- A calendar month event grid with day-button heights, series-coloured
  event dots, and the selected day's forced-colours pair. Date selection
  enhancements use Bootstrap Datepicker; event details use Popover. All-day membership compares date-only values with exclusive ends;
  timed events use local midnight boundaries, including daylight-saving
  transitions. Browser time zones cannot shift an all-day event onto an
  adjacent date.
- A component-inspection lens: a dashed outline on marked components. Its
  labels are Bootstrap badges placed with utilities and linked to the right
  documentation section. Dialog elements are excluded because the lens's
  positioning must not replace modal or drawer positioning.
- Theme-specific console effects. Reduced motion and forced colours disable
  decorative finishes.
- Alpha.1's checked switch thumb token is declared but not consumed by its
  pseudo-element. The app layer bridges it to the indicator token; the theme
  layer supplies accessible role values. A minimal upstream reproduction uses
  different checked and unchecked thumb colours without any Dayframe code.
- Alpha.1's Range plugin writes `--bs-range-fill`, while its Sass reads
  `--range-fill`. The app layer bridges those tokens on `.form-range` so the
  plugin's fill follows the display-scale value. Remove the bridge when the
  plugin and Sass agree on the token name.

The switch token gap is a confirmed Bootstrap defect and is reported in
[Bootstrap issue 43143](https://github.com/twbs/bootstrap/issues/43143)
as required by the project's Bootstrap-first rule. The dashboard-specific
entries add capabilities rather than replace framework components.

Calendar and Weather use Bootstrap's `.grid` with responsive `g-col-*`
utilities. Unused `.calendar-grid`, `.weather-grid` and `.calendar-cell` rules
and the unused `.contains-inline` claim were removed; the custom month cells
use `.month-day`.
Hero card background and border defaults moved to `theme-base`, below `theme`,
so themes can override those component tokens from their own folders.

The footer credits the exact installed Bootstrap, Svelte and Vite versions.
Vite reads package metadata at build time; About Bootstrap uses the same
values. Bootstrap's stack and spacing utilities arrange the credit under the
demo disclosure, using the existing footer typography and theme colours.
This adds no custom CSS or runtime request.

### CSS footprint

`npm run build` writes `dist/css-footprint.json`. `appCssBytes` measures the
UTF-8 source bytes of `src/styles/app.scss`, including comments;
`appCssGzipBytes` measures gzip of that same source. It is an SCSS source metric,
not the compiled CSS size or the complete custom CSS footprint: `layout.css`,
theme styles and Bootstrap are excluded. About Bootstrap shows the source byte
count. The report's `bootstrap` version comes from the installed
`node_modules/bootstrap/package.json`, so it follows dedicated upgrades.

The review candidate measured **6,111 source bytes / 1,903 gzip bytes** with
Bootstrap **6.0.0-alpha.1**. After the October 2026 once-over the app layer
measures **3,079 source bytes / 1,209 gzip bytes**: the brand, clock,
heading, panel-title, agent-row, quota, agenda, theme-swatch, settings-grid
and lens-label rules all moved to Bootstrap components, tokens and utilities. The report is included in the build artifact;
compare the same metric on future upgrades.

All 400 intended baseline updates for the review fixes were visually reviewed
and accepted from Noble capture run `39656395929`, with exact artifact hashes
verified before copying. Resolute capture run `39665070867` preserves 399
images byte-for-byte and updates only Default dark Summary at 1280×720 DPR 1
for reviewed rounded-edge rasterization. The image dimensions, comparator and
pixel budget are unchanged. These captures record historical provenance;
current CI results are recorded in the pull request, and historical passes do
not certify later candidates.

### Upgrade checklist

Keep upgrades in dedicated PRs. Review tokens, plugin signatures, feature-map
entries, custom gaps and CSS footprint. Run `npm run check`, `npm test`,
`npm run build` and `npm run test:browser`. The same three CI jobs and 34
browser cases apply to upgrades. Manually review affected components, themes
and viewports, including keyboard focus, contrast, reduced motion and forced
colours. Broader browser projects and baselines remain optional local tools.
Review intentional visual changes before updating their baselines in the
pinned container; remove custom workarounds when Bootstrap gains the missing
capability.
