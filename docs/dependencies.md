# Dependency audit

Rechecked on 4 November 2026 against public npm metadata, official release/tag
records and container manifests. Ordinary dependencies use current stable
releases; Bootstrap follows the newest published v6 prerelease. The exact
package graph is in `package-lock.json`; workflow Actions use full commit SHAs.

## Application and development packages

All direct pins were checked against their supported release tracks:

| Package                                           | Pin                                 |
| ------------------------------------------------- | ----------------------------------- |
| `@floating-ui/dom`                                | `1.8.0`                             |
| `@fontsource-variable/atkinson-hyperlegible-mono` | `5.3.0`                             |
| `@fontsource-variable/atkinson-hyperlegible-next` | `5.3.0`                             |
| `@fontsource-variable/geist`                      | `5.3.0`                             |
| `@fontsource-variable/geist-mono`                 | `5.3.0`                             |
| `@fontsource-variable/martian-mono`               | `5.3.0`                             |
| `bootstrap`                                       | `6.0.0-alpha.1`                     |
| `bootstrap-icons`                                 | `1.13.2`                            |
| `svelte`                                          | `5.57.3`                            |
| `vanilla-calendar-pro`                            | `3.4.0`                             |
| `@axe-core/playwright`                            | `4.14.0`                            |
| `@eslint/js`                                      | `10.0.1`                            |
| `@playwright/test`                                | `1.64.1`                            |
| `@sveltejs/vite-plugin-svelte`                    | `7.3.1`                             |
| `@types/node`                                     | `26.6.6`                            |
| `@typescript/native`                              | `npm:typescript@7.0.2`              |
| `eslint`                                          | `10.14.0`                           |
| `globals`                                         | `17.14.0`                           |
| `lightningcss`                                    | `1.33.0`                            |
| `postcss`                                         | `8.5.32`                            |
| `prettier`                                        | `3.9.10`                            |
| `prettier-plugin-svelte`                          | `4.1.1`                             |
| `sass`                                            | `1.107.1`                           |
| `svelte-check`                                    | `4.7.8`                             |
| `typescript`                                      | `npm:@typescript/typescript6@6.0.2` |
| `vite`                                            | `8.3.5`                             |

TypeScript 7.0.2 supplies `tsc` for tooling checks. Svelte checking retains
TypeScript API 6.0.3 through the 6.0.2 compatibility facade: TypeScript 7.0
has no programmatic compiler API, and the current Svelte checker requires
TypeScript 5 or 6. This uses [Microsoft's documented npm aliases](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0),
with no experimental checker flag or peer override. `npm run check` keeps the
complete Svelte checker. See [the checker peer metadata](https://registry.npmjs.org/svelte-check/4.7.8).

Bootstrap's npm `latest` tag points to v5, so using it would downgrade the
demonstrator. [Published metadata](https://registry.npmjs.org/bootstrap) confirms
6.0.0-alpha.1 is current on the v6 track; this audit needs no Bootstrap upgrade
PR. Other prereleases, including Playwright and Prettier alphas, are excluded.

The original graph audit covered 181 lockfile nodes and 176 package names.
It found no compatible lock-only refreshes and no registry advisory findings
for those versions. Thirty-four transitive package names had newer releases
outside their parents' ranges; upstream constraints are preserved. The
TypeScript aliases add their locked compatibility/native packages. No forced
overrides replace third-party internals.

The alias-migration audit snapshot contained 203 lockfile nodes and 197 actual
package names. That audit's registry advisory query returned no findings, and
`npm ls --all` reported no invalid dependency or peer edges.

The current lockfile, recounted on 22 October 2026 after adding the bundled
Geist and Geist Mono fonts, contains 205 non-root package nodes and 199 distinct
actual package names, resolving aliases to their package names. This recount
does not repeat the registry advisory audit.

On 4 November 2026 Tideline's Atkinson Hyperlegible Next and Mono and
Nebuchadnezzar's Martian Mono were added (all SIL OFL 1.1, licences in
`public/third-party-notices.txt`). The lockfile then contains 208 non-root
package nodes and 202 distinct actual package names; `npm audit --omit=dev`
reported no vulnerabilities.

## Follow-up sweep, 4 November 2026

The development-tools PR upgrades `@types/node`, ESLint, PostCSS and Sass,
plus `globals` 17.14.0 and `svelte-check` 4.7.8 found by the follow-up sweep.
All 26 direct dependencies were checked against public npm release metadata,
resolving the two TypeScript aliases to their actual package names. Svelte
5.57.3 is handled separately in [PR #13](https://github.com/BVisagie/dayframe-dashboard/pull/13).
Bootstrap remains the newest published v6 release, 6.0.0-alpha.1; Playwright's
current stable release remains 1.64.1. No Bootstrap or Playwright upgrade is
needed, and no prerelease tooling is selected.

A compatible lockfile refresh updates Rolldown and its platform bindings to
1.2.16, `@oxc-project/types` to 0.156.0, `@types/estree` to 1.0.10 and the
Vite plugin's `magic-string` to 1.4.5. Svelte keeps its compatible 0.30.21 copy.
All 208 non-root nodes and 202 distinct actual package names were checked
against registry metadata. Parent ranges and exact upstream pins are retained;
`npm ls --all` verifies the installed dependency and peer graph. No forced
transitive overrides are used.

`npm audit --omit=dev` reports **zero production vulnerabilities**. The full
audit reports **seven affected development nodes** (five moderate and two low),
representing two underlying advisories:

- [minimatch globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249):
  ESLint 10.14.0 and its config-array retain minimatch 10.2.6; the advisory's
  fix is on the incompatible 11.x line. ESLint's current stable release has
  not adopted that major. Five affected nodes include propagated findings.
- [deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4):
  the current Svelte Vite plugin uses 4.3.1, which is still deepmerge's latest
  release; no patched release is published. Two affected nodes include the
  plugin's propagated finding.

These packages process checked-in lint patterns and build configuration in
this project; they are not used by the deployed dashboard. Retain the
upstream-supported graph and recheck when the owning tools release fixes.
Do not run `npm audit fix --force`: its proposed ESLint downgrade does not
preserve this project's tooling. This records the findings rather than
claiming that the full audit is clean.

Node is updated to 26.13.0 throughout CI and the documented local setup. The
[official release](https://github.com/nodejs/node/releases/tag/v26.13.0)
marks Node 26 as LTS and otherwise retains 26.12.1's behavior. All six direct
Actions, the Gitleaks release and both image digests were rechecked. Gitleaks
is unchanged. The Playwright 1.64.1 Resolute tag was republished: CI now pins
its current OCI index, `sha256:f76885029244e5a384243a930ff283cef67d90653978ee27a77dd4cff8882fb4`,
while retaining the matching package version and existing screenshot checks. The vendored design
skill still matches canonical upstream bytes. The TypeScript compatibility
aliases remain current and satisfy the checker's supported TypeScript 6 API.

## Actions and execution environment

| Dependency                                                                                             | Selected release                   |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1)                                    | 7.0.1                              |
| [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0)                                | 7.1.0                              |
| [upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.2)                      | 7.0.2                              |
| [download-artifact](https://github.com/actions/download-artifact/releases/tag/v8.0.2)                  | 8.0.2                              |
| [upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0)          | 5.0.0                              |
| [deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1)                            | 5.0.1                              |
| [Node](https://github.com/nodejs/node/releases/tag/v26.13.0)                                           | 26.13.0                            |
| [Hosted runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md) | Ubuntu 26.04 GA, x64               |
| [Playwright container](https://playwright.dev/docs/docker)                                             | 1.64.1-resolute, pinned OCI digest |
| [Gitleaks](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)                                  | 8.30.1, pinned OCI digest          |

All 24 direct workflow references were audited, including trusted deployment
and maintenance. These upgrades preserve permissions, deployment gates,
required job names and the three-job, 34-case browser requirement for all
changes, including upgrades.

The latest official Pages upload composite embeds upload-artifact 7.0.0,
behind the direct 7.0.2 pin. This upstream-owned dependency is retained with
the newest released composite; packaging is not forked solely to force a
nested patch upgrade. Its [pinned source](https://github.com/actions/upload-pages-artifact/blob/fc324d3547104276b827a68afc52ff2a11cc49c9/action.yml)
records that nested reference.

Git, GitHub CLI, Docker and action-internal Node runtimes remain managed by
the official runner/action images. Bundled tools can trail upstream; using
the current GA image does not make every executable the latest standalone
release. No custom runner or daemon installation is added. GitGuardian is an
externally managed service, with no repository version to upgrade.

The vendored frontend-design skill and licence already match upstream bytes.
The Resolute capture audit preserves 399 images and updates only the reviewed
Default dark Summary rounded-edge rendering at 1280×720 DPR 1. [CI evidence](ci.md#screenshot-comparison-and-review)
records its historical provenance; older Noble evidence remains labelled
Noble. Each candidate must pass three-job CI, including the 34 browser cases,
with current results recorded in the pull request. Upgrades also need targeted
manual review of affected components, themes and viewports. Broader browser
projects and baselines remain optional local tools. The trusted listener is
installed on `main`; the separately approved prelaunch Pages setup and
deployment are recorded in [CI evidence](ci.md#prelaunch-deployment-evidence).
Historical evidence limitations and the completed public launch are recorded
in [CI and launch evidence](ci.md#launch-readiness-evidence). This audit does
not change repository settings or deployment policy.
