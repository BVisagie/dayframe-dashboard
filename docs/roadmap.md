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

| Topic | Decision |
| --- | --- |
| Name | Dayframe |
| Repository | `dayframe-dashboard`, private while building, then public |
| Licence | MIT |
| Hosting | GitHub Pages, deployed from `main` by GitHub Actions |
| Stack | Svelte 5, Vite, Bootstrap 6 (exact version pinned). See [Stack](#stack) |
| Interactivity | Bootstrap's own JavaScript plugins, attached through Svelte actions |
| Icons | Bootstrap Icons |
| Browsers | Bootstrap 6's support floor: Chrome and Edge 130+, Firefox 132+, Safari and iOS 18+ |
| Agent names | Real product names as plain text, no logos. All usage data is simulated |
| Before launch | Deployed but marked `noindex`, and `robots.txt` disallows crawling |
| AI agents | `AGENTS.md` is read by Codex directly and by Claude Code through `CLAUDE.md`. UI design follows Anthropic's frontend-design skill; a copy in `.agents/skills/` is synced from upstream every week |

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

| Dashboard need | Bootstrap 6 |
| --- | --- |
| Page shell and view layouts | CSS grid (`.grid`), grid and gap utilities, containers |
| Panels that adapt to their own size | Container-query breakpoint mixins |
| Panels, agent cards, event details | `card` |
| View navigation | `nav` with `nav-overflow`, which moves views that don't fit into a menu |
| Header controls | `button-group`, `vr`, stack helpers, `tooltip` |
| Quota meters | `progress`, coloured by theme roles |
| Plan, status and account labels | `badge`, `chip` |
| Agent marks and event attendees | `avatar` and avatar stacks, showing initials instead of logos |
| Agenda, headlines and story lists | `list-group`, `stretched-link`, text truncation, `icon-link` |
| Story excerpts and event descriptions | `prose` |
| Seven-day forecast and hourly details | `table` |
| Event details on the calendar | `popover` |
| Jumping to a date | `datepicker` |
| Feed paging | `pagination` |
| Loading states | `placeholder`, `spinner` |
| Reminders | `toast` |
| "Demo data" notice, offline and stale states | `banner`, `alert` |
| Settings | `dialog`, or `drawer` on narrow screens, with `tab` or `scrollspy` between sections |
| Theme, view and scenario pickers | `menu` |
| City search | `combobox` |
| Display scale | `range` |
| Toggles, choices and numbers | `switch`, `check`, `radio`, `form-field`, floating labels, `form-adorn` for units, `input-group`, validation |
| Feed categories | `chips` |
| Colour schemes | `data-bs-theme`, `color-scheme` and `light-dark()` |
| Theme colours | Bootstrap's theme roles and `.theme-*` classes. See [Token tiers](#token-tiers) |
| Focus, hover and motion | `focus-ring` and `hover-lift` helpers, transition and animation utilities, `$enable-reduced-motion` |
| Icons, including weather | Bootstrap Icons |

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
single-key shortcuts navigate between views. Optional rotation cycles through
the views and pauses during interaction.

### Data sources

Every source implements one small contract, so views never know whether data is
live or simulated:

```js
{ id, subscribe(listener), refresh(), status } // status: fresh | stale | offline | reconnect
```

| View | Source | Fallback |
| --- | --- | --- |
| Agents | Simulated | — |
| Calendar | Simulated | — |
| Weather | Live: Open-Meteo forecast and geocoding APIs | Simulated forecast |
| Feeds: Bootstrap | Live: Bootstrap blog feed and `twbs/bootstrap` GitHub releases | Last cached copy, then simulated |
| Feeds: other categories | Simulated stories | — |

Open-Meteo, the Bootstrap blog feed and the GitHub REST API all allow
cross-origin requests from any site. Responses are cached in `localStorage`.
GitHub release data is refreshed at most hourly, which stays well within the
unauthenticated limit of 60 requests per hour per visitor.

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
- **Attribution:** the footer credits Open-Meteo, as its licence requires.

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
  plausible.
- **Feeds:** invented headlines and excerpts in a few categories, attributed to
  fictional publications.
- **Determinism:** the seed is the ISO week plus an optional `?seed=` value.
  `?clock=2026-11-03T09:30` freezes time, and the tests and screenshots use it.
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

| Axis | Values | Owner |
| --- | --- | --- |
| Theme | `default`, `nebuchadnezzar`, … | Theme folder |
| Colour scheme | light, dark, system, auto (sunrise and sunset), applied with `data-bs-theme` | Visitor, limited to the theme's supported schemes |
| Layout | `standard`, `console`, … | The theme names a layout. Layouts are separate modules any theme can use |
| Theme options | Declared by each theme, such as a CRT finish | Visitor |
| Display scale | 70–150% | Visitor |

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
  preview: { canvas: '#010301', surface: '#141b0c', ink: '#a8c39a', accent: '#3cbf5c' },
});
```

- **Registry:** `src/themes/registry.js` discovers themes with
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

| Status | Bootstrap role |
| --- | --- |
| Healthy | `success` |
| Running low | `warning` |
| Nearly exhausted | `danger` |
| Stale | `secondary` |
| Notices | `info` |

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
- **Text floor:** text never drops below a minimum size, for legibility.
- **Fitting:** rows that don't fit collapse into "+N more", so a smaller scale
  automatically shows more content.
- **Narrow windows:** below about 1100 CSS pixels wide, the dashboard switches
  to a scrolling layout for laptops in split view, tablets and phones.
- **Container queries:** panels adapt to their own size, so layouts can
  rearrange without global breakpoints.
- **Ultrawide (21:9 and wider):** uses the extra width with additional columns
  rather than side margins.

Standard test viewports, in CSS pixels:

| Viewport | Represents |
| --- | --- |
| 1280×720 | 1080p at 150% scaling |
| 1920×1080 | 1080p at 100%, 4K at 200% |
| 2560×1440 | 1440p, 4K at 150%, 5K at 200% |
| 3008×1692 | 6K at 200% |
| 3440×1440 | Ultrawide |
| 3840×2160 | 4K at 100% |
| 1024×768, 390×844 | Tablet, phone |

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
  - functional tests in Chromium, Firefox and WebKit;
  - screenshot comparisons in Chromium only, for the full matrix of view ×
    theme × scheme × standard viewport, using a fixed `?clock` and `?seed`;
  - all runs in Playwright's pinned container image, so fonts render
    consistently.
- **Accessibility:** keyboard-only operation, visible focus, reduced motion,
  forced colours and the contrast checks above.
- **Bootstrap-first review:** the pull request template asks two questions.
  Does a Bootstrap component, utility or token already cover this? Does every
  new custom rule carry a comment saying what Bootstrap lacks?
- **Privacy checks** run on every push and pull request, and before every
  deploy:
  - `gitleaks` scans for secrets;
  - a check fails the build if any string from a private denylist appears. The
    denylist is stored as a GitHub Actions secret and in a local file outside
    the repository, and is never committed.
- **Commits** use a GitHub noreply address.

## Deployment and launch

On every push to `main`, GitHub Actions builds the site and runs every test and
privacy check. If they pass, it deploys to GitHub Pages. Vite's `base` is
`/dayframe-dashboard/`. Pull request builds are attached as workflow artifacts.

Until launch, the site is live but excluded from search engines with `noindex`
and `robots.txt`. A single build flag controls both.

Launch checklist:

1. README with screenshots, a live link and a short tour of the themes.
2. `docs/themes.md` and `docs/bootstrap-log.md` are up to date.
3. The privacy checks pass on the full history, not only the latest commit.
4. Turn off the `noindex` build flag and redeploy.
5. Make the repository public and protect `main`.
6. Share the project in Bootstrap's GitHub Discussions (Show & Tell) and
   contribute findings to the v6 Feedback threads.

## Milestones

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Scaffold | Licence, README stub, `AGENTS.md` and `CLAUDE.md`, and a Svelte, Vite and Bootstrap build. CI runs the tests and privacy checks, and the weekly skill-sync workflow is in place. A placeholder deploys to Pages with `noindex` |
| M1 | Views on simulated data | All five views, Settings, keyboard navigation, rotation and scenarios work on simulated data. They are built from Bootstrap components and plugins as the feature map lists. A fixed clock gives identical renders |
| M2 | Token architecture | Theme registry, token tiers, layers, scale unit, and the `standard` and `console` layouts. Default and Nebuchadnezzar ported. Contract checks and screenshot matrix pass |
| M3 | Live sources | Weather and Bootstrap feeds are live, with caching and fallbacks. They degrade gracefully offline and under rate limits |
| M4 | Bootstrap tracking | Dependabot and the release log are running. The Bootstrap lens and About Bootstrap panel are built, and the custom CSS footprint is recorded |
| M5 | Launch | Launch checklist complete |
| M6 | New theme | A third theme built only through the theme contract |

## Risks

| Risk | Mitigation |
| --- | --- |
| Bootstrap alphas make breaking changes | Expected. The pinned version, upgrade pull requests and screenshot diffs make each change visible, and the log records it |
| Open-Meteo or GitHub is unavailable or rate-limited | Cached responses, then simulated fallbacks; the source's status appears in the UI |
| Open-Meteo terms | Free for non-commercial use with attribution; review them again before launch |
| Product names and trademarks | Plain-text names only, no logos, with a visible disclaimer |
| Font licences | Self-host only fonts licensed under the SIL Open Font License, and keep each licence beside its font |
| Unreliable screenshots | Fixed clock and seed, pinned container image, and fonts bundled with the app |

## Out of scope

Real agent accounts, calendars, email, OAuth, credentials, servers, analytics,
user tracking, and server-side feed proxies.
