# Themes

Dayframe themes are self-contained folders discovered by Vite. Add a theme with
`npm run new-theme <id>`, review its generated brief, then change only that
folder. The starter copies Default's accessible light and dark seed system;
there is no registry list, stylesheet list or view code to edit.

| Theme          | Schemes     | Layout   | Direction                                        |
| -------------- | ----------- | -------- | ------------------------------------------------ |
| Default        | Light, dark | Standard | Cool porcelain, navy and cobalt mission control  |
| Nebuchadnezzar | Dark        | Console  | Black, phosphor green and olive instruments      |
| Tideline       | Light, dark | Standard | Nautical daylight and deep ocean, teal and coral |

The shared footer includes the exact build-stack versions. Its credit inherits
the footer's secondary foreground and body font in every theme; themes need no
additional token or style for it.

## Folder contract

```text
src/themes/<id>/
  theme.js     JavaScript manifest, typed through defineTheme
  theme.css    Bootstrap seeds and any token overrides
  brief.md     Palette, type roles, ASCII layout, principles and plan review
  effects.css  Optional, automatically discovered
```

The manifest imports `defineTheme` from `../define.ts`. Keeping manifests as
JavaScript lets Vite and Node's TypeScript stripping import the same source.
`themeSchema` and `validateTheme` describe and enforce supported schemes
(`light`, `dark`), layouts (`standard`, `console`), Boolean options and the four
six-digit preview colours (`canvas`, `surface`, `ink`, `accent`). The registry
also rejects duplicate IDs and IDs that differ from their folder names.

Settings generates Boolean switches from each option's `label` and `default`.
Options apply as root attributes, for example `data-theme-crt="on"` or `"off"`.
Unknown options are ignored, and switching themes clears previous option
attributes. Nebuchadnezzar clamps every colour preference to dark.

## API and discovery

`registry.ts` exports `themes: Theme[]`, `getTheme(id): Theme`, `themeSchema`,
`requiredTokens`, `roleNames`, `roleKeys`, `resolveScheme` and the theme types.
Unknown IDs throw so callers can explicitly recover to a valid stored default.

```ts
applyTheme(themeId, scheme, options?, sun?, now?): void
```

`scheme` accepts `light`, `dark`, `system` or `auto`. System consults the
browser's `prefers-color-scheme`; without a browser it defaults to light before
clamping to supported schemes. Auto uses valid sunrise and sunset values for
the supplied date, as local `HH:mm[:ss]` or ISO timestamps. It falls back to
07:00–19:00 in the browser's local time zone when data is missing, invalid or
stale. Sunrise is inclusive; sunset starts dark mode. Supplying `now` allows
the app's fixed clock to control this presentation deterministically. The app
calls the function again when its clock, system preference or settings change.
`applyTheme` validates the ID and safely avoids DOM work in Node.

The prepaint script applies the stored theme, scheme and layout before the app
starts. Auto uses the local 07:00–19:00 fallback at that point, so it can
briefly differ from the cached or live solar-time choice after initialization.

The applied root attributes are `data-theme`, `data-bs-theme`, `data-layout`
and one `data-theme-<option>` per declared option. `registry-core.ts` offers
`createThemeRegistry`, `validateThemes` and `findTheme` without Vite imports.
`apply.ts` offers `resolveScheme` and `applyThemeToRoot` independently. Build
scripts can import each static manifest without evaluating `import.meta.glob`.

## Tokens and layers

```css
@layer bootstrap, theme-base, theme, app, layout, theme-effects, bootstrap-utilities;
```

Bootstrap remains the component and utility system. The shared `theme-base`
layer derives values with `color-mix(in oklch, …)`; themes use `light-dark()`
for their supported schemes and can override any derived token in `theme`.
Utilities remain last. Do not use extra specificity or importance overrides.
The hero's `--card-bg` and `--card-border-color` defaults are on `.hero-panel`
in `theme-base`. Override them on the theme's `.summary-hero` in `theme`;
the shared defaults cannot block the theme's choices.

1. Set Bootstrap's `--bg-body`, `--bg-1`, `--fg-body`, `--body-font-family` and
   every role's `--<role>-base`. Shared `theme-base` derivations complete
   `--bg-2` through `--bg-4`, `--fg-1` through `--fg-4`, borders and type
   defaults. Bootstrap generates the radius and shadow scales.
2. Every role supplies all nine Bootstrap keys: `base`, `fg`, `fg-emphasis`,
   `bg`, `bg-subtle`, `bg-muted`, `border`, `focus-ring`, `contrast`. The roles
   are `primary`, `accent`, `secondary`, `success`, `warning`, `danger`, `info`,
   `inverse`, six agents (`codex`, `claude`, `cursor`, `grok`, `opencode`,
   `antigravity`) and `series-1` through `series-6`. Bootstrap's Sass map must
   include the dashboard roles to generate their `.theme-*` utilities.
3. App-only tokens cover gaps with no Bootstrap equivalent:
   `--calendar-weekend-bg`, `--calendar-outside-bg`, `--clock-face` and
   `--display-font-family`. Use Bootstrap spacing, shape and component tokens
   for everything else. Theme-specific card hierarchy sets Bootstrap's own
   card radius, spacing, border and shadow tokens.

Form controls use the emphasized border token so their boundaries meet 3:1
without strengthening every decorative panel divider. Switch thumbs use body
ink when off and the primary contrast colour when on. Alpha.1 declares
`--switch-checked-indicator-bg` but does not consume it; the shared layer
bridges it to `--switch-indicator-bg` in the checked state. This token bridge
can be removed when Bootstrap consumes its checked-indicator token directly.

A theme may bundle fonts: Default imports `@fontsource-variable/geist` and
`@fontsource-variable/geist-mono` at the top of its `theme.css`, so the
`@font-face` rules ship in the single stylesheet while the browser downloads a
family only when the active theme uses it. Record each font's licence in
`public/third-party-notices.txt`. Tideline and Nebuchadnezzar keep system
stacks; monospace is reserved for the clock and readings except in the console.

The brand mark is an inline SVG filled with `--primary-bg`, `--primary-contrast`
and `--accent-bg`, so a theme recolours it through its roles with no extra
asset or token. Bootstrap generates the radius and shadow scales from `$radius`
and `$shadows`; themes change radii per token (as Nebuchadnezzar does) and tint
shadows through `--shadow-color` rather than redefining the scales.

## Layout integration

The shared navbar gives the brand, view navigation and controls a wider column
gap from `md`, and the clock divider wider gaps from `sm`. Phone spacing and
the navigation's separate row below `md` stay compact across all themes.

Use Bootstrap layout and spacing utilities inside and around these classes:

| Class                                                        | Responsibility                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| `.dashboard-shell`                                           | Full-height page shell and optional CRT overlay anchor          |
| `.grid.dashboard-grid`                                       | Summary's named areas; switches with `data-layout`              |
| `.summary-hero`                                              | Urgent Summary item; use on a Bootstrap card                    |
| `.summary-agents`                                            | Compact Summary capacity panel                                  |
| `.summary-calendar`                                          | Summary's today-only "Coming up" panel                          |
| `.summary-weather`                                           | Summary forecast panel                                          |
| `.summary-feeds`                                             | Quiet Summary feed strip                                        |
| `.grid.gap-3`                                                | Agent cards using responsive Bootstrap column and gap utilities |
| `.grid` with `g-col-12 lg:g-col-8` and `g-col-12 lg:g-col-4` | Calendar's month and selected-day agenda columns                |
| `.grid` with `g-col-12 lg:g-col-7` and `g-col-12 lg:g-col-5` | Weather's forecast and hourly columns                           |
| `.month-grid` and `.month-day`                               | Seven equal month columns and readable day-button dimensions    |
| `.dashboard-panel`                                           | Allows panel content to shrink within a grid column             |
| `.dashboard-clock`                                           | Optional static CRT glow target                                 |

Only `.dashboard-grid` adds custom column definitions to Bootstrap's `.grid`.
Agent cards use `g-col-12 md:g-col-6 lg:g-col-4`, preserve every allowance in
compact desktop layouts, and let content determine each card's height. Primary
readings and progress bars show percentage remaining; each allowance retains
its own reset countdown. Themes supply the existing typography and semantic
colours without adding agent-specific units or a separate styling system.
Both Summary layouts use three columns at ordinary
desktop widths: the hero spans the first two beside weather, with capacity,
calendar and feeds beneath. At 21:9 and wider, the standard layout moves the
agenda beside the hero and gives capacity two columns below; console uses four
columns. Below 68.75rem viewport width, both Summary layouts become one
scrolling column in hero, agents, calendar, weather, feeds order.

Calendar and Weather use Bootstrap's default 12-column grid and responsive
`g-col-*` utilities, stacking their panels below `lg`. The calendar's inner
`.month-grid` is the custom seven-column event grid; `.month-day` sets its day
buttons' minimum height, with smaller dimensions in compact and narrow views.
These views have no separate calendar-grid or weather-grid layout contract.

Root font scaling is `max(.875rem, min(100dvh / 1080, 100vw / 1920) * 16 *
var(--display-scale, 1))`: the nominal 1920×1080 view has a 1rem root, all
Bootstrap rem dimensions scale together, and the floor remains legible.
Set `--display-scale` to a ratio such as `1` or `.85`. There is no upper cap.

## Accessibility and validation

Body and small text require 4.5:1 contrast; large text and interface colours
require 3:1. Role foregrounds, emphasis, muted surfaces, solid backgrounds,
contrast text, borders and focus rings must be checked as actual resolved
browser colours in every supported scheme. Keep state words or icons alongside
colour. Required token names are exported for the browser contract.

The CRT finish is static and ignores pointer input. It and its glow switch off
under both reduced motion and forced colours. Theme CSS never removes focus
outlines or opts out of the browser's forced colours.

Run `npm run check`, `npm test`, `npm run build` and `npm run test:browser`.
The Node suite checks every discovered manifest, schema failures, option
cleanup, scheme boundaries and the generator's no-overwrite behaviour. Browser
checks cover resolved tokens, contrast, focus and screenshots. The 34-case
default is the complete CI browser requirement for all changes, including
substantial theme changes and upgrades. Broader tests and the roadmap viewport
matrix remain optional local tools. Manually review affected components,
themes and viewports in supported schemes, preserving the accessibility floor.
Review intentional baseline changes before updating them in the pinned
container. A generated starter still needs its own design review and the same
CI validation before acceptance.
