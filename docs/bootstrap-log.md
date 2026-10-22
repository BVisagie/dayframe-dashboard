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
- Dashboard typography hierarchy, branded shell dimensions, compact quota
  rows, source attribution and theme-preview swatches. These rules live in
  the `app` layer and use Bootstrap tokens and rem units.
- A calendar month event grid, weekend/outside-month surfaces and event dots.
  Date selection enhancements use Bootstrap Datepicker; event details use
  Popover. All-day membership compares date-only values with exclusive ends;
  timed events use local midnight boundaries, including daylight-saving
  transitions. Browser time zones cannot shift an all-day event onto an
  adjacent date.
- Small usage-history charts. Accessible SVG sparklines accompany numeric
  quotas rather than replacing them.
- A component-inspection lens. Marked component outlines include ordinary
  links to Bootstrap documentation. Dialog elements are excluded because the
  lens's positioning must not replace modal or drawer positioning. Labels sit
  above compact button groups so the controls remain clickable.
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

The review candidate measures **6,111 source bytes / 1,903 gzip bytes** with
Bootstrap **6.0.0-alpha.1**. The report is included in the build artifact;
compare the same metric on future upgrades.

All 400 intended baseline updates for the review fixes were visually reviewed
and accepted from Noble capture run `39656395929`, with exact artifact hashes
verified before copying. Resolute capture run `39665070867` preserves 399
images byte-for-byte and updates only Default dark Summary at 1280×720 DPR 1
for reviewed rounded-edge rasterization. The image dimensions, comparator and
pixel budget are unchanged. Final candidate comparisons and full container
validation are recorded in the pull request; historical passes do not certify
later candidates.

### Upgrade checklist

Keep upgrades in dedicated PRs. Review tokens, plugin signatures, feature-map
entries, custom gaps and CSS footprint. Run unit tests, all three functional
browser projects, every theme contract and the full screenshot matrix. Review
visual changes before updating their baselines; remove custom workarounds when
Bootstrap gains the missing capability.
