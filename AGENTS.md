# AGENTS.md

Instructions for AI coding agents working on Dayframe. Codex reads this file
directly, and Claude Code loads it through `CLAUDE.md`. `docs/roadmap.md` is
the plan of record. Before starting a task, read the roadmap sections it
touches.

## What Dayframe is

Dayframe is a static, glanceable dashboard for AI agent usage, calendar, weather
and feeds. It is also a long-running Bootstrap 6 demonstrator. It runs on GitHub
Pages using simulated data, and is built with Svelte 5, Vite and Bootstrap 6.

## Non-negotiable rules

1. **Static only.** Dayframe has no server, backend, accounts, credentials,
   OAuth, cookies, analytics or tracking.
   - The browser makes live requests to only three services: Open-Meteo
     (forecast and geocoding), the Bootstrap blog feed, and the GitHub REST API
     for `twbs/bootstrap`. Adding any other origin needs the maintainer's
     approval.
   - Fonts, icons and libraries are bundled with the site. Don't load them from
     a CDN.
2. **Simulated data.** Agent usage, calendars and every feed except the
   Bootstrap ones are always simulated. Never connect to a real account or
   provider API, and never read local credentials.
3. **Nothing personal.** None of the following may appear anywhere in the
   project:
   - real people's names, email addresses or street addresses;
   - precise locations, home-directory paths or hostnames;
   - account or project IDs;
   - references to private repositories.

   That covers code, tests, fixtures, screenshots, docs, commit messages and
   pull request text. The only exception is the copyright holder's name in
   `LICENSE`. Simulated data uses invented people, organisations and places.
   Don't change the repository's git identity.
   - Approved exception: mandatory third-party legal notices and the unmodified
     vendored frontend-design skill may retain upstream names. This exception
     does not apply to project-authored content or secret scanning.
4. **Bootstrap first.** For each piece of UI, work down this list and stop at
   the first step that covers it:
   1. a Bootstrap component, with its JavaScript plugin where it has one;
   2. Bootstrap's layout, utilities and helpers;
   3. Bootstrap configuration: tokens, theme roles, Sass module options, or the
      utilities API;
   4. custom code in the `app` layer, with a comment saying what Bootstrap
      lacks.

   Never reimplement a component that Bootstrap ships. Record every step-4 gap
   in `docs/bootstrap-log.md`.
5. **Bootstrap version.** Bootstrap is pinned to an exact version. Change it
   only in a dedicated upgrade pull request that updates both
   `docs/bootstrap-log.md` and the feature map in `docs/roadmap.md`. Never lower
   `build.cssTarget` below Bootstrap's browser floor: it breaks `light-dark()`.
6. **Accessibility floor.** Every change must meet all of these:
   - WCAG 2.2 AA contrast;
   - full keyboard operation with visible focus;
   - correct behaviour under `prefers-reduced-motion` and `forced-colors`.

   A change that breaks any of them is not done.

## UI design

Before planning or reviewing any UI work, read Anthropic's frontend-design
skill. UI work includes views, components, layouts, themes, copy and motion.

- **Canonical copy:**
  <https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md>
- **Local mirror:** `.agents/skills/frontend-design/SKILL.md`, used when the
  network is unavailable. If upstream is newer than the mirror, follow upstream
  and say so.

Apply the skill within this project's limits:

- **Brief.**
  - Subject: an always-on dashboard for people who work with AI coding agents.
  - Audience: developers, and Bootstrap users evaluating v6.
  - Primary job: show at a glance what needs attention (agent capacity, the
    next event, the weather) while showing Bootstrap 6 at its best.
  - Hero: the most urgent item on the Summary view.
- **Design decides what; Bootstrap decides how.** Express the design plan's
  palette, type and layout through Bootstrap tokens, theme roles, utilities and
  components. Never build a styling system alongside Bootstrap's.
- **Avoid identical cards.** `card` is the right component, but vary its radius,
  border, elevation and density to show hierarchy. Not every panel needs to be a
  card.
- **Each theme's brief wins.** A theme's brief takes precedence over the skill's
  list of generic defaults. Nebuchadnezzar's black-and-green console is
  deliberate; don't "correct" it. Where a brief leaves an axis free, don't spend
  it on a generic default.
- **Process:**
  1. Plan the palette (4–6 named hex values), the typefaces and their roles,
     the layout concept with ASCII wireframes, and the principles.
  2. Review the plan against the brief, and revise anything generic.
  3. Build it.
  4. Critique it from Playwright screenshots at the standard viewports, in light
     and dark. Remove anything that doesn't earn its place.
- **Copy:** sentence case, active voice and plain names. Errors and empty states
  must be specific.

## Themes

- A theme is one folder, `src/themes/<id>/`, containing:
  - `theme.js`: the manifest, defined with `defineTheme`;
  - `theme.css`;
  - `effects.css`, optional;
  - `brief.md`: the brief and the design plan.
- Adding a theme must not require editing files outside its folder. If it does,
  fix the registry instead.
- Themes set Bootstrap's tokens and theme roles first, and add app tokens only
  where Bootstrap has no equivalent.
- Every theme must pass the contract checks in every colour scheme it supports.
  Never weaken a check to make a theme pass.
- Create a new theme with `npm run new-theme <id>`.

## Code

- **Svelte 5** with runes. Svelte owns application state, and Bootstrap's
  plugins attach through Svelte actions.
- **Types:** the theme API is written in TypeScript. Elsewhere, use TypeScript
  or typed JSDoc. `svelte-check` must pass.
- **Cascade layers:** `bootstrap, theme-base, theme, app, layout,
  theme-effects, bootstrap-utilities`. Never use `!important` or specificity
  hacks.
- **Units:** size type, spacing and components in `rem` or with Bootstrap
  tokens, never in pixels. Hairline borders use Bootstrap's border tokens.
- **Determinism:** simulated data is fully reproducible for a given `?clock` and
  `?seed`. Simulation code must never call `Math.random()` or read the clock
  directly.
- **Style:** match the surrounding code's style, naming and comment density.
  Comments explain why, not what.

## Commands

<!-- Keep in sync with package.json. -->

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests |
| `npm run test:browser` | Playwright functional and screenshot tests |
| `npm run check` | Type, Svelte and lint checks |
| `npm run new-theme <id>` | Create a theme |

## Before you finish

- Run `npm run check`, `npm test` and the relevant `npm run test:browser`
  projects. Report failures as they are; never skip or loosen a test.
- Update screenshot baselines only for intended visual changes, and say which
  changed and why.
- Keep the docs current: the feature map in `docs/roadmap.md`,
  `docs/bootstrap-log.md` and `docs/themes.md`.
- Work on a branch and open a pull request. CI must pass before merging.
- Never commit `.env*` files or `.claude/settings.local.json`.
