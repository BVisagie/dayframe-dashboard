# Dependency audit

Checked on 21 October 2026 against public npm metadata, official release/tag
records and container manifests. Ordinary dependencies use current stable
releases; Bootstrap follows the newest published v6 prerelease. The exact
package graph is in `package-lock.json`; workflow Actions use full commit SHAs.

## Application and development packages

All direct pins were checked against their supported release tracks:

| Package                        | Pin                                 |
| ------------------------------ | ----------------------------------- |
| `@floating-ui/dom`             | `1.8.0`                             |
| `bootstrap`                    | `6.0.0-alpha.1`                     |
| `bootstrap-icons`              | `1.13.2`                            |
| `svelte`                       | `5.57.2`                            |
| `vanilla-calendar-pro`         | `3.4.0`                             |
| `@axe-core/playwright`         | `4.14.0`                            |
| `@eslint/js`                   | `10.0.1`                            |
| `@playwright/test`             | `1.64.1`                            |
| `@sveltejs/vite-plugin-svelte` | `7.3.1`                             |
| `@types/node`                  | `26.6.5`                            |
| `@typescript/native`           | `npm:typescript@7.0.2`              |
| `eslint`                       | `10.13.0`                           |
| `globals`                      | `17.13.0`                           |
| `lightningcss`                 | `1.33.0`                            |
| `postcss`                      | `8.5.31`                            |
| `prettier`                     | `3.9.10`                            |
| `prettier-plugin-svelte`       | `4.1.1`                             |
| `sass`                         | `1.106.0`                           |
| `svelte-check`                 | `4.7.7`                             |
| `typescript`                   | `npm:@typescript/typescript6@6.0.2` |
| `vite`                         | `8.3.5`                             |

TypeScript 7.0.2 supplies `tsc` for tooling checks. Svelte checking retains
TypeScript API 6.0.3 through the 6.0.2 compatibility facade: TypeScript 7.0
has no programmatic compiler API, and the current Svelte checker requires
TypeScript 5 or 6. This uses [Microsoft's documented npm aliases](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0),
with no experimental checker flag or peer override. `npm run check` keeps the
complete Svelte checker. See [the checker peer metadata](https://registry.npmjs.org/svelte-check/4.7.7).

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

After the alias migration, the graph contains 203 lockfile nodes and 197
package names. A fresh registry advisory query returned no findings, and
`npm ls --all` reported no invalid dependency or peer edges.

## Actions and execution environment

| Dependency                                                                                             | Selected release                   |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1)                                    | 7.0.1                              |
| [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0)                                | 7.1.0                              |
| [upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.2)                      | 7.0.2                              |
| [download-artifact](https://github.com/actions/download-artifact/releases/tag/v8.0.2)                  | 8.0.2                              |
| [upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0)          | 5.0.0                              |
| [deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1)                            | 5.0.1                              |
| [Node](https://github.com/nodejs/node/releases/tag/v26.12.1)                                           | 26.12.1                            |
| [Hosted runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md) | Ubuntu 26.04 GA, x64               |
| [Playwright container](https://playwright.dev/docs/docker)                                             | 1.64.1-resolute, pinned OCI digest |
| [Gitleaks](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)                                  | 8.30.1, pinned OCI digest          |

All 24 direct workflow references were audited, including trusted deployment
and maintenance. These upgrades preserve permissions, deployment gates,
required job names and the three-job, 34-case routine selection.

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
Resolute capture review and the full existing suite must pass before merge;
older Noble evidence remains labelled Noble. Trusted deployment/maintenance
activation still requires installation on `main` and the separately approved
repository setup in [CI setup](ci.md).
