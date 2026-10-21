# Dayframe roadmap

Dayframe is a glanceable dashboard for AI agent usage, calendar, weather and
feeds. It runs as a static site on GitHub Pages, with realistic simulated data
where live data would need accounts or credentials.

It doubles as a long-running Bootstrap 6 demo. It tracks Bootstrap from the
first alpha to stable, and records what each release changes in a real
application.

## Principles

- **Static only.** Dayframe has no server, accounts, credentials or analytics.
  Every live request goes from the visitor's browser straight to a public API.
- **Simulated, not faked.** Simulated data moves over time, follows real-world
  shapes, and stays the same for a given date and seed.
- **Bootstrap first.** Dayframe is a Bootstrap 6 demonstrator. Every feature
  uses whatever Bootstrap provides for it: components, JavaScript plugins,
  layout, utilities, helpers, tokens, colour modes and icons. Custom code covers
  only what Bootstrap cannot. See [Bootstrap first](#bootstrap-first).
- **Themes are first-class.** Adding a theme means adding one folder, and the
  automated checks decide whether it is complete.
- **Every screen size.** Desktop displays from 1080p to 6K are the primary
  target. Laptops, tablets and phones remain usable.

## Decisions

| Topic         | Decision                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name          | Dayframe                                                                                                                                                                                          |
| Repository    | `dayframe-dashboard`, private while building, then public                                                                                                                                         |
| Licence       | MIT                                                                                                                                                                                               |
| Hosting       | GitHub Pages, deployed from `main` by GitHub Actions                                                                                                                                              |
| Stack         | Svelte 5, Vite, Bootstrap 6 (exact version pinned). See [Stack](#stack)                                                                                                                           |
| Interactivity | Bootstrap's own JavaScript plugins, attached through Svelte actions                                                                                                                               |
| Icons         | Bootstrap Icons                                                                                                                                                                                   |
| Browsers      | Bootstrap 6's support floor: Chrome and Edge 130+, Firefox 132+, Safari and iOS 18+                                                                                                               |
| Agent names   | Real product names as plain text, no logos. All usage data is simulated                                                                                                                           |
| Before launch | Deployed but marked `noindex`, and `robots.txt` disallows crawling                                                                                                                                |
| AI agents     | `AGENTS.md` is read by Codex directly and by Claude Code through `CLAUDE.md`. UI design follows Anthropic's frontend-design skill; a copy in `.agents/skills/` is synced from upstream every week |

## Bootstrap first

### The rule

For each piece of UI, work down this list and stop at the first step that
covers it:

1. A Bootstrap component, with its JavaScript plugin where it has one.
2. Bootstrap's layout, utilities and helpers.
3. Bootstrap configuration: root and theme tokens, Sass module options, extra
   theme colour roles, or the utilities API.
4. Custom CSS or JavaScript in the `app` layer, with a short comment saying what
   Bootstrap lacks.

Every step-4 gap is recorded in `docs/bootstrap-log.md`. If the gap is a
limitation or bug in Bootstrap, rather than something specific to the
dashboard, it is also reported upstream. Dayframe never reimplements a
component that Bootstrap ships.

### Feature map

This table shows how the dashboard uses Bootstrap `6.0.0-alpha.1`. It is
reviewed with every Bootstrap release.

| Dashboard need                               | Bootstrap 6                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Page shell and view layouts                  | CSS grid (`.grid`), grid and gap utilities, containers                                                       |
| Panels that adapt to their own size          | Container-query breakpoint mixins                                                                            |
| Panels, agent cards, event details           | `card`                                                                                                       |
| View navigation                              | `nav` with `nav-overflow`; delegated clicks reach cloned menu items, and active state stays synchronized     |
| Header controls                              | `button-group`, `vr`, stack helpers, `tooltip`                                                               |
| Quota meters                                 | `progress`, coloured by theme roles                                                                          |
| Plan, status and account labels              | `badge`, `chip`                                                                                              |
| Agent marks and event attendees              | `avatar` and avatar stacks, showing initials instead of logos                                                |
| Agenda, headlines and story lists            | `list-group`, `stretched-link`, text truncation, `icon-link`                                                 |
| Story excerpts and event descriptions        | `prose`                                                                                                      |
| Seven-day forecast and hourly details        | `table`                                                                                                      |
| Event details on the calendar                | `popover`                                                                                                    |
| Jumping to a date                            | `datepicker`; the Svelte action synchronizes selection and applies locale and first-weekday changes          |
| Feed and hourly forecast paging              | `pagination`; compact desktop views reduce rows per page                                                     |
| Loading states                               | `placeholder`, `spinner`                                                                                     |
| Reminders                                    | `toast`                                                                                                      |
| "Demo data" notice, offline and stale states | `alert`                                                                                                      |
| Settings                                     | `dialog`, or `drawer` on narrow screens, with `tab` between sections                                         |
| Theme, view and scenario pickers             | `menu`                                                                                                       |
| City search                                  | `combobox`; known alpha.1 instance warnings and listener accumulation are tracked in the Bootstrap log       |
| Display scale                                | `range`                                                                                                      |
| Toggles, choices and numbers                 | `switch`, `check`, `radio`, `form-field`, floating labels, `form-adorn` for units, `input-group`, validation |
| Feed categories                              | `chip` buttons (the editable `Chips` plugin is for input)                                                    |
| Colour schemes                               | `data-bs-theme`, `color-scheme` and `light-dark()`                                                           |
| Theme colours                                | Bootstrap's theme roles and `.theme-*` classes. See [Token tiers](#token-tiers)                              |
| Focus, hover and motion                      | `focus-ring` and `hover-lift` helpers, transition and animation utilities, `$enable-reduced-motion`          |
| Icons, including weather                     | Bootstrap Icons                                                                                              |

Not used yet, and reconsidered with each release: `accordion`, `breadcrumb`,
`carousel`, `otp-input`, `strength` and `stepper`. Rotation switches whole
views, so it isn't a carousel. `stepper` could suit a first-visit tour.

### Showing Bootstrap at work

- **Bootstrap lens.** Settings → Demo, or `?lens=1`, outlines each Bootstrap
  component on screen. Each outline is labelled with the component name and a
  link to its Bootstrap documentation, so visitors can see what Bootstrap
  renders and what is custom.
- **About Bootstrap.** Shows the bundled version, the components and plugins in
  use, and the latest Bootstrap releases.
- **Custom CSS footprint.** The size of the `app`-layer CSS is recorded with
  every Bootstrap upgrade. It should shrink as Bootstrap grows.

## Stack

- **Svelte 5.** Templates are plain HTML, so Bootstrap's markup and classes read
  exactly as they do in Bootstrap's documentation. Runes update only what
  changes, which suits a live dashboard, and the compiled output is small.
- **Bootstrap's JavaScript through Svelte actions.** Each plugin attaches with
  `use:` to the element it enhances, for example `use:menu` or
  `use:datepicker`. Svelte owns application state; Bootstrap owns component
  behaviour.
- **Vite.** Builds the static site and compiles Bootstrap through its Sass
  module API. Bootstrap is configured with Sass module options, not by
  overriding its compiled CSS.
- **CSS target.** `build.cssTarget` matches Bootstrap's browser floor. Vite's
  default CSS minifier is Lightning CSS. With a lower target it rewrites
  `light-dark()` as a polyfill, and colours stop following `data-bs-theme`.
- **Types.** The theme API (`defineTheme`, the registry and the token list) is
  written in TypeScript, so theme authors get autocomplete and errors. Other
  modules can use TypeScript or typed JSDoc; `svelte-check` checks both.
- **Considered and rejected:**
  - Astro: worth it only if Dayframe grows many content pages, and it could host
    these Svelte components later.
  - React or Vue: their wrapper libraries replace Bootstrap's JavaScript and
    hide its markup.
  - Web Components: shadow DOM blocks Bootstrap's global styles.

## Architecture

### Application

The app is a single page with five views: Summary, Agents, Calendar, Weather
and Feeds. Settings open from any view. Arrow keys, number keys and the existing
single-key shortcuts (`s`, `a`, `c`, `w`, `f`) navigate between views. Shortcuts
ignore editable controls, and `,` opens Settings. Optional rotation cycles through
the views and pauses during interaction.

### Data sources

Every source implements one small contract, so views never know whether data is
live or simulated:

```js
{
  (id, subscribe(listener), refresh(), status);
} // status: fresh | stale | offline | reconnect
```

| View                    | Source                                                         | Fallback                         |
| ----------------------- | -------------------------------------------------------------- | -------------------------------- |
| Agents                  | Simulated                                                      | —                                |
| Calendar                | Simulated                                                      | —                                |
| Weather                 | Live: Open-Meteo forecast and geocoding APIs                   | Simulated forecast               |
| Feeds: Bootstrap        | Live: Bootstrap blog feed and `twbs/bootstrap` GitHub releases | Last cached copy, then simulated |
| Feeds: other categories | Simulated stories                                              | —                                |

Open-Meteo, the Bootstrap blog feed and the GitHub REST API all allow
cross-origin requests from any site. Responses are cached in `localStorage`.
GitHub release data is refreshed at most hourly, which stays well within the
unauthenticated limit of 60 requests per hour per originating IP. Shared networks
can exhaust that allowance, so rate limits trigger backoff and cached fallbacks.
The blog feed provides headlines, dates and links, without article excerpts.
Source and location requests have a default ten-second deadline, covering both
the request and response-body reading. Expiry settles pending state, retains
validated cached data or labelled simulated fallbacks, and respects backoff.
Cancellation and late responses cannot overwrite a disposed source.

### Weather location

- **Default:** the city in the browser's time zone (for example `America/Chicago`
  gives Chicago), resolved through Open-Meteo geocoding. This needs no
  permission prompt.
- **Fallback:** a fixed, neutral city when the time zone has no city, such as
  `UTC`.
- **Alternatives:** visitors can search for a city, or choose "Use my location".
  The browser asks for permission only after that click.
- **Privacy:** Dayframe sends coordinates only to Open-Meteo, and stores them
  only in the visitor's browser.
- **Attribution:** every live weather panel credits Open-Meteo and links its
  data licence; city search also credits GeoNames.

### Simulated data

- **Agents:** Codex, Claude, Cursor, Grok, OpenCode and Antigravity. Each
  follows the general shape of its real plan, such as short session windows,
  weekly windows, monthly allowances or per-model quotas. All numbers are
  invented. Usage rises through each window and resets on schedule.
  Occasionally an account goes stale or needs reconnecting.
- **Calendar:** several calendars with invented people, places and
  organisations. Includes repeating meetings, all-day and multi-day events,
  overlapping events, and an event inside the reminder window. Events are
  generated relative to the current date, so today and this week always look
  plausible. All-day dates use exclusive end dates and date-only membership,
  so browser time zones cannot shift them onto adjacent days. Timed events
  intersect local midnight boundaries, including daylight-saving transitions.
- **Feeds:** invented headlines and excerpts in a few categories, attributed to
  fictional publications.
- **Determinism:** the seed is the ISO week plus an optional `?seed=` value.
  `?clock=2026-11-03T09:30` freezes time, and the tests and screenshots use it.
  A frozen clock also selects simulated sources so a replay never depends on
  changing live responses. Other scenarios likewise use controlled demo data.
- **Scenarios:** Settings → Demo, or `?scenario=`, switches between `steady`,
  `running-low`, `reconnect`, `reminder-due`, `stale` and `offline`. Each
  scenario shows UI states a visitor would rarely see otherwise.
- **Disclaimer:** a visible "Demo data" note explains that agent, account and
  calendar data is simulated. It also states that product names belong to their
  owners and Dayframe is not affiliated with them.

### Settings and URL parameters

All settings live in the browser under one versioned `localStorage` key, with
migrations between versions. Settings has six sections:

- Appearance
- Display: scale, startup view and rotation
- Weather: location and units
- Calendar: first day of the week and reminders
- Feeds: categories
- Demo: scenario and reset

Locale, date format, 12- or 24-hour time, first day of the week and units
default to the browser's locale. Settings can override each one.
Date format is persisted independently of locale and time format: locale
default, day/month/year, month/day/year or ISO. It updates the header and
selected-day heading while preserving semantic month and weekday headings.

URL parameters override stored settings for that visit only, so any state can
be shared as a link: `?view=`, `?theme=`, `?scheme=`, `?scale=`, `?scenario=`,
`?clock=` and `?seed=`.

## Theme system

### Goals

- A theme sets Bootstrap's own root tokens. App tokens derive from those, so a
  single theme definition styles Bootstrap's components and Dayframe's panels
  together.
- A minimal theme needs only a few seed values. An elaborate theme can override
  any derived token, add effects, or choose a different layout.
- Themes are self-contained folders, discovered automatically.
- Automated checks catch an incomplete or inaccessible theme before it merges.

### Axes

The following choices are independent:

| Axis          | Values                                                                       | Owner                                                                    |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Theme         | `default`, `nebuchadnezzar`, …                                               | Theme folder                                                             |
| Colour scheme | light, dark, system, auto (sunrise and sunset), applied with `data-bs-theme` | Visitor, limited to the theme's supported schemes                        |
| Layout        | `standard`, `console`, …                                                     | The theme names a layout. Layouts are separate modules any theme can use |
| Theme options | Declared by each theme, such as a CRT finish                                 | Visitor                                                                  |
| Display scale | 70–150%                                                                      | Visitor                                                                  |

### Theme folder

```text
src/themes/<id>/
  theme.js      manifest
  theme.css     Bootstrap and app tokens, scoped to the theme
  effects.css   optional finishes (glow, scanlines, textures)
  brief.md      the theme's brief and design plan: palette, type, layout, principles
  fonts/        optional self-hosted fonts, with their licences
```

```js
export default defineTheme({
  id: 'nebuchadnezzar',
  name: 'Nebuchadnezzar',
  description: 'Phosphor green, void black and olive glass.',
  schemes: ['dark'],
  layout: 'console',
  options: {
    crt: { type: 'boolean', label: 'CRT finish', default: true },
  },
  preview: {
    canvas: '#010301',
    surface: '#141b0c',
    ink: '#a8c39a',
    accent: '#3cbf5c',
  },
});
```

- **Registry:** `src/themes/registry.ts` discovers themes with
  `import.meta.glob('./*/theme.js', { eager: true })` and validates each
  manifest. Validation checks for a unique `id`, known schemes and layouts, a
  well-formed options schema, and the required preview colours.
- **Generated settings controls:** Settings → Appearance builds its theme
  picker and option controls from the registry.
- **Option attributes:** options become attributes such as `data-theme-crt="on"`
  on the root element.

### Token tiers

Bootstrap's own tokens are the theme API. A theme sets them and Bootstrap's
components follow. Dayframe adds tokens only where Bootstrap has no equivalent.

1. **Bootstrap tokens**, set by each theme:
   - surfaces and text: `--bg-body`, `--bg-1` to `--bg-4`, `--fg-body`, `--fg-1`
     to `--fg-4`, and the border tokens;
   - theme roles: `primary`, `accent`, `secondary`, `success`, `warning`,
     `danger`, `info` and `inverse`. Each role has `base`, `fg`, `fg-emphasis`,
     `bg`, `bg-subtle`, `bg-muted`, `border`, `focus-ring` and `contrast`
     values;
   - type and shape: `--body-font-family`, `--font-mono`, and the radius,
     border-width and shadow tokens.

   A minimal theme sets only the body surface, body text and each role's `base`.
   The shared `theme-base` layer derives the rest with
   `color-mix(in oklch, …)`, much as Bootstrap derives its defaults. Themes that
   support both schemes can use `light-dark()`.

2. **Dashboard roles**, added to Bootstrap's `$theme-colors` map through its
   Sass module API:
   - one role per agent: `codex`, `claude`, `cursor`, `grok`, `opencode` and
     `antigravity`;
   - six chart series.

   Bootstrap generates their tokens and `.theme-*` classes. Each role's values
   point at CSS custom properties, so themes can recolour them at runtime. For
   example, `.theme-claude` on an agent card colours its progress bars, badges
   and borders without any custom CSS.

3. **App tokens**, only where Bootstrap has no equivalent: for example,
   calendar weekend and outside-month surfaces, the clock face, and theme
   effects. These derive from tiers 1 and 2.

Status colours map to Bootstrap's roles, so alerts, badges and progress bars
show status with no extra styling:

| Status           | Bootstrap role |
| ---------------- | -------------- |
| Healthy          | `success`      |
| Running low      | `warning`      |
| Nearly exhausted | `danger`       |
| Stale            | `secondary`    |
| Notices          | `info`         |

Token names follow the pinned Bootstrap release. If an alpha renames a token,
the contract checks fail and the release log records the change.

### Cascade layers

```css
@layer bootstrap, theme-base, theme, app, layout, theme-effects, bootstrap-utilities;
```

- Bootstrap's own sub-layers sit inside `bootstrap`.
- Utilities load last, so utility classes keep working as Bootstrap intends.
- Themes never need extra specificity or `!important`.

### Loading and persistence

- **No flash on load:** a small inline script, generated at build time from the
  registry, applies the stored theme, scheme and layout before first paint.
- **Fonts:** themes load fonts with `@font-face`, which the browser downloads
  only when that font is used. All theme CSS can ship in one bundle while each
  visitor downloads only the active theme's fonts.
- **Accessibility:** effects switch off under `prefers-reduced-motion` and
  `forced-colors`.

### Contract checks

Each theme must pass these checks in every scheme it supports:

- every required Bootstrap token, dashboard role and app token resolves to a
  valid value;
- text and surface pairs meet WCAG 2.2 AA contrast: 4.5:1 for body text, 3:1
  for large text and interface elements;
- state colours meet 3:1 against their surface, and every state also has a
  text or icon cue;
- screenshots match the approved baselines at the standard viewports.

Tooling:

- `npm run new-theme <id>` creates a starter folder that passes these checks.
- `docs/themes.md` documents the contract.

## Display scaling

- **Scale through the root font size.** Bootstrap sizes its type, spacing and
  components in `rem`. Dayframe therefore sets the root font size from the
  viewport, using `min(100vh / 1080, 100vw / 1920)` multiplied by the visitor's
  display scale. Bootstrap's components and the dashboard then scale together,
  with no upper limit. Dayframe's own sizes use `rem` and Bootstrap's spacing
  and type tokens, not pixels.
- **Root floor:** the root font size stays at or above `0.875rem` (14 CSS pixels
  with the default browser font size). Fitting never lowers that floor.
- **Fitting:** compact desktop mode depends on usable height in root units.
  Summary limits agent, agenda and headline previews, with controls to reach
  the remaining content. The compact console shows one agent plus a more-agents
  control. Calendar limits the selected-day agenda, Weather pages hourly rows,
  and Feeds reduces stories per page. All five views fit at 1280×720 and
  1920×1080 at the default display scale in all three themes; this is local
  fitting evidence, not completion of the screenshot matrix.
- **Narrow windows:** below about 1100 CSS pixels wide, the dashboard switches
  to a scrolling layout for laptops in split view, tablets and phones.
- **Container queries:** panels adapt to their own size, so layouts can
  rearrange without global breakpoints.
- **Ultrawide (21:9 and wider):** uses the extra width with additional columns
  rather than side margins.

Standard test viewports, in CSS pixels:

| Viewport          | Represents                    |
| ----------------- | ----------------------------- |
| 1280×720          | 1080p at 150% scaling         |
| 1920×1080         | 1080p at 100%, 4K at 200%     |
| 2560×1440         | 1440p, 4K at 150%, 5K at 200% |
| 3008×1692         | 6K at 200%                    |
| 3440×1440         | Ultrawide                     |
| 3840×2160         | 4K at 100%                    |
| 1024×768, 390×844 | Tablet, phone                 |

Each viewport runs at device pixel ratios of 1 and 2.

## Tracking Bootstrap

- **Pinned version:** Bootstrap is pinned to an exact version. Dependabot opens
  a pull request for each new 6.x release, including pre-releases.
- **Upgrade checks:** every upgrade pull request runs the unit tests, browser
  tests, theme contract checks and screenshot comparisons. The diffs show what
  the release changed.
- **Release log:** `docs/bootstrap-log.md` records, per Bootstrap release, what
  changed in Dayframe. That covers renamed tokens, adopted components,
  workarounds added or removed, and issues reported upstream.
- **Feature map review:** each upgrade reviews the
  [feature map](#feature-map). It adopts new or changed components, and removes
  custom code that Bootstrap now covers.
- **Following upstream:** Dayframe follows Bootstrap's v6 milestones, pull
  requests and Discussions, and tries new capabilities soon after they land.
  Where Bootstrap's approach differs from Dayframe's, Dayframe moves to
  Bootstrap's approach, even if that means reworking its own code.
- **Upstream bugs:** each bug Dayframe finds in Bootstrap is reported upstream
  with a minimal reproduction and linked from the log.

## Quality

- **Unit tests** (`node:test`) cover the simulation engine, date and recurrence
  handling, formatting, settings migrations and the theme registry.
- **Browser tests** (Playwright):
  - routine CI selects existing Chromium tests and a small desktop/phone
    screenshot set tagged `@smoke`;
  - the complete functional suite in Chromium, Firefox and WebKit remains
    available, together with the full screenshot matrix, through manual CI
    with `full_suite` enabled. Run it on the current candidate before merging
    Bootstrap upgrades or substantial theme changes;
  - screenshot comparisons in Chromium only, for the full matrix of view ×
    theme × scheme × standard viewport, using a fixed `?clock` and `?seed`;
  - all runs in Playwright's pinned container image, so fonts render
    consistently, against the production build;
  - screenshot projects fix font positioning and Skia's CPU path; functional
    projects keep normal browser rendering. The explicitly approved colour
    threshold is `0.005` with `maxDiffPixels: 0` and the existing antialiasing
    heuristic. Tiny colour differences may pass; counted pixels beyond the
    tolerance and image-dimension changes fail. This is not exact pixel
    equality. See [CI and review evidence](ci.md#screenshot-comparison-and-review).
- **Accessibility:** keyboard-only operation, visible focus, reduced motion,
  forced colours and the contrast checks above.
- **Bootstrap-first review:** the pull request template asks two questions.
  Does a Bootstrap component, utility or token already cover this? Does every
  new custom rule carry a comment saying what Bootstrap lacks?
- **Routine CI** has three jobs: Quality (types, lint, unit tests and build),
  Browser and screenshots, and Secret history. It runs on pull requests and
  pushes to `main`; feature-branch pushes do not duplicate PR runs.
- **Privacy checks** run with routine CI, and before every
  deploy once the trusted listener is installed on `main`:
  - `gitleaks` scans the complete reachable history for secrets;
  - the trusted listener fetches the exact candidate and complete history as
    passive Git objects, then repeats the secret scan using trusted `main`
    policy. Candidate configuration and suppressions cannot bypass it;
  - the legacy required status `Privacy / private history` now certifies only
    that trusted secret scan. No `DAYFRAME_DENYLIST`, personal access token or
    provider account is needed. See [CI and privacy](ci.md) for the independent
    trusted full-history scan required before the listener's first merge.
- **Content privacy:** keep private credentials, private contact details and
  addresses, home-directory paths, private hostnames, private account/project
  IDs and private repository references out of tracked content, commits and
  PR text.
  Public author credits, attribution and legal notices are allowed. Simulated
  data uses invented people, organisations and places; never connect real
  accounts or read local credentials.
- **Commits** use a GitHub noreply address.

## Deployment and launch

The implemented workflows build and test pushes to `main`. A trusted listener
then scans the exact candidate and permits Pages deployment only when every
required job and privacy status succeeds. Vite's `base` is
`/dayframe-dashboard/`. Pull request builds are configured as workflow artifacts.
The canonical 400-image replacement set has been reviewed and all comparisons
passed at `8c58cba`. Every candidate still requires its applicable CI, the trusted
full-history secret scan and separately approved Pages setup before deployment.

Prelaunch builds exclude search engines with `noindex` and `robots.txt`. A
single build flag controls both. Pages setup/deployment, repository settings,
enabling indexing, making the repository public and public announcements each
require separate maintainer approval.

The trusted `workflow_run` listener activates only after installation on
`main`. It is not activated yet. Before that first installation merges, an
independent check must scan the exact candidate and full reachable history for
secrets using trusted policy. This requirement applies before merge and
deployment, not only before public launch. Verify the listener and its exact-SHA
status publication after installation, including on a fork or Dependabot PR;
never treat activation as a secret-scan pass.

Launch checklist:

1. README with screenshots, a live link and a short tour of the themes.
2. `docs/themes.md` and `docs/bootstrap-log.md` are up to date.
3. The privacy checks pass on the full history, not only the latest commit.
4. Turn off the `noindex` build flag and redeploy.
5. Make the repository public and protect `main`.
6. Share the project in Bootstrap's GitHub Discussions (Show & Tell) and
   contribute findings to the v6 Feedback threads.

## Milestones

### Implementation evidence

Pinned Noble [run `39643918557`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39643918557)
at `8c58cba` passed 188 functional tests per browser plus all 400 screenshot
comparisons (964 browser tests total), 84 unit tests, types, lint, build and
secret scanning. GitGuardian also passed. Routine CI now uses the smaller
approved selection; full mode remains required for Bootstrap upgrades and
substantial theme changes. The
[baseline review evidence](ci.md#screenshot-comparison-and-review) records the
400-image replacement set and the approved comparison tolerance.

| Area                   | Implemented                                                                                                                                                                  | Pending proof or external setup                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Views and state        | All five views, Settings, navigation, rotation and deterministic scenarios; independent persisted date format; full three-browser checks passed at `8c58cba`                    | Routine CI on later changes                                                                                                                              |
| Bootstrap integration  | Real plugins through Svelte actions; Datepicker updates and NavOverflow clone navigation/active-state synchronization; full browser checks passed                               | Full mode for Bootstrap upgrades                                                                                                                         |
| Layout and themes      | Default, Nebuchadnezzar and Tideline; reviewed 400-image canonical set passed at `8c58cba`; all six desktop dimensions fit without lowering the root floor                        | Full mode for substantial theme changes; routine desktop/phone selection otherwise                                                                         |
| Sources                | Allowed live adapters, caching, fallbacks, backoff and default ten-second deadlines; hosted adapter checks passed                                                               | No real account connections are needed                                                                                                                    |
| Bootstrap tracking     | Exact `6.0.0-alpha.1` pin, lens, About panel, gap log and measured app CSS footprint                                                                                         | Hosted maintenance workflow verification                                                                                                                 |
| Privacy and deployment | Trusted full-history secrets gate and gated static artifact deployment workflows                                                                                            | Independent trusted secrets scan before first merge, listener/status verification on `main` and separately approved repository/Pages settings              |

Milestone completion requires the proof in each definition below. Implemented
code and local fitting checks do not complete pending CI, privacy or launch work.

| #   | Milestone               | Done when                                                                                                                                                                                                                                                                   |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Scaffold                | Licence, README, `AGENTS.md` and `CLAUDE.md`, and a Svelte, Vite and Bootstrap build. CI runs the tests and privacy checks, and the weekly skill-sync workflow is in place. The complete prelaunch dashboard supersedes the placeholder and deploys to Pages with `noindex` |
| M1  | Views on simulated data | All five views, Settings, keyboard navigation, rotation and scenarios work on simulated data. They are built from Bootstrap components and plugins as the feature map lists. A fixed clock gives identical renders                                                          |
| M2  | Token architecture      | Theme registry, token tiers, layers, scale unit, and the `standard` and `console` layouts. Default and Nebuchadnezzar built from their recorded briefs. Contract checks and screenshot matrix pass                                                                          |
| M3  | Live sources            | Weather and Bootstrap feeds are live, with caching and fallbacks. They degrade gracefully offline and under rate limits                                                                                                                                                     |
| M4  | Bootstrap tracking      | Dependabot and the release log are running. The Bootstrap lens and About Bootstrap panel are built, and the custom CSS footprint is recorded                                                                                                                                |
| M5  | Launch                  | Launch checklist complete                                                                                                                                                                                                                                                   |
| M6  | New theme               | A third theme built only through the theme contract                                                                                                                                                                                                                         |

## Risks

| Risk                                                | Mitigation                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap alphas make breaking changes              | Expected. The pinned version, upgrade pull requests and screenshot diffs make each change visible, and the log records it |
| Open-Meteo or GitHub is unavailable or rate-limited | Cached responses, then simulated fallbacks; the source's status appears in the UI                                         |
| Open-Meteo terms                                    | Free for non-commercial use with attribution; review them again before launch                                             |
| Product names and trademarks                        | Plain-text names only, no logos, with a visible disclaimer                                                                |
| Font licences                                       | Self-host only fonts licensed under the SIL Open Font License, and keep each licence beside its font                      |
| Unreliable screenshots                              | Fixed clock and seed, pinned container image, and fonts bundled with the app                                              |

## Out of scope

Real agent accounts, calendars, email, OAuth, credentials, servers, analytics,
user tracking, and server-side feed proxies.
