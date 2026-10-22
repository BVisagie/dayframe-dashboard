# CI, privacy and maintenance

Routine `CI` runs on pull requests and pushes to `main`, with three jobs:

- **Quality:** types, Svelte, lint, workflow-tooling types, unit tests and the
  production build. It uploads the `dayframe-build` artifact.
- **Browser and screenshots:** selected existing Chromium tests tagged
  `@smoke`: 34 cases, comprising 18 functional cases and 16 screenshots. Eight
  screenshots run at each of 1280×720 and 390×844, at device pixel ratio 1.
  These cover all five Default views and Summary in the other themes'
  supported schemes.
- **Secret history:** full-history gitleaks with the isolated default policy.

README images live in `docs/images/showcase/`, separate from the test
baselines. `npm run showcase` captures nine views and themes at 1440×900 and
device pixel ratio 2, from the production build, with the reference clock and
seed and no live requests. No test compares against them, so CI never fails on
them; recapture them in the pull request that makes a visible change. Broader
optional baselines record historical captures until compared with the current
build.

Feature-branch pushes do not start a second copy of PR CI. Concurrency groups
include the event name and branch. A new run cancels an older run only within
that group; manual dispatches cannot cancel PR or push runs, or be cancelled
by them. Jobs use Ubuntu 26.04 and exact Node 26.12.1; browser tests run in
`mcr.microsoft.com/playwright:v1.64.1-resolute`, matching Playwright 1.64.1.
The workflow pins its OCI digest, and capture guards require Resolute.
The browser report and build are retained for seven days. Every browser run
builds and serves the production bundle, uses two workers and has zero retries.

The browser command is:

```sh
npm run test:browser
```

These 34 existing cases are the complete CI browser requirement for every
change, including Bootstrap and Playwright upgrades and substantial theme
changes. Upgrades also need targeted manual review of affected components,
themes and viewports, preserving keyboard operation, visible focus, WCAG 2.2 AA
contrast, reduced motion and forced colours. No complete engine or viewport
matrix run is required.

Broader existing tests, project configurations and baselines remain optional
local tools. Run a focused file in an extra engine directly, for example:

```sh
npx playwright test tests/browser/dashboard.spec.ts --project=firefox
```

Use the direct CLI because the npm command appends its fixed projects and
`@smoke` selection. The reduced scope does not permit changing tags to evade
coverage, weakening assertions or loosening screenshot tolerances.

For intentional visual changes, review CI failure actuals and traces before
copying only the exact needed, reviewed actuals into their baselines. Local
baseline updates must use the pinned Playwright container and satisfy the
existing `updateSnapshots` guards. Host-generated baselines are refused.

Screenshot projects fix font subpixel positioning and Skia's runtime CPU path;
functional projects retain normal rendering. The font setting addresses a
reproduced fresh-load/reload metric difference. Cross-host curve rasterization
can still vary slightly; comparisons use the approved colour tolerance below.

## Screenshot comparison and review

The maintainer explicitly approved this one-time change from `threshold: 0`
to `threshold: 0.005`, retaining `maxDiffPixels: 0`, zero retries and the
installed comparator's existing antialiasing heuristic. This is a small colour
tolerance, not exact pixel equality: even a whole area shifted by one RGB
level may pass. Any pixel counted beyond the tolerance still fails because
the pixel budget is zero; a one-pixel image-height change also fails. The
general rule against skipping or loosening tests still applies.

The initial 400 Chromium baselines were reviewed. The canonical replacement
set comes from completed pinned Noble run `39637681760` at `13b227a`, whose app
visual source is identical to `d3be160`. It captures the production preview
with font subpixel positioning disabled and Skia's CPU path fixed. It replaces
321 original PNGs. Two independent reviewers reviewed all 322 comparison
changes and reported no P2 findings. An independent cross-check of all 400
official captures passed with the approved comparator settings; 13 image pairs
contained 21 pixels of one-RGB-level noise in total.

The footer build credit added at `ed6da29` intentionally updates all 400
baselines, using pinned Noble capture run `39648459626`. All 400 capture cases
passed. Visual review covered all 16 routine screenshots, plus footer samples
at every viewport and device pixel ratio and the compact console Weather view.
All six desktop image dimensions still fit their viewports. These images add
the exact stack versions and tighten existing footer spacing; no theme or
capture settings changed. That historical capture did not replace the normal
comparison check.

The review fixes at `e9f6780` replace all 400 images from pinned Noble
[capture run `39656395929`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39656395929).
Independent visual reviews covered Default's 160, Tideline's 160 and
Nebuchadnezzar's 80 candidates, with no P1/P2 findings. Root verified every
accepted PNG's SHA-256 against that artifact. All 16 previously reviewed
routine cases also match under the unchanged comparator settings; 11 are
byte-identical across jobs. Changes reflect supported Bootstrap controls,
theme-owned hero tokens, today's agenda and compact feed pagination. The 32
narrow-layout height changes preserve content; all desktop dimensions remain
unchanged. Required CI comparisons use these refreshed baselines.

Routine [run `39660061306`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39660061306)
at `0556e33` passed Quality, all 34 selected browser/screenshot cases and
Secret history against that accepted Noble set. The later dependency upgrade
moves capture to Resolute. Its first full run, `39661128611` at `1398a98`,
passed all 606 functional cases and 399 screenshots. The remaining Default
dark Summary image at 1280×720 DPR 1 differed only at rounded navigation and
hero edges: 29 raw changed pixels, of which one exceeded the unchanged colour
tolerance. Independent visual and trace review found no content or layout
regression.

Resolute [capture run `39665070867`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39665070867)
supplied all 400 candidates. The artifact SHA-256 is
`725d88b8bb0c998634c922848d48c3f7a297e5500ba6edd8774a211cf4a917b0`.
All 399 other images are byte-identical to the committed set. Only
`screenshots-1280x720-dpr1/default-dark-summary.png` is updated for the intended
capture-environment change. Its SHA-256,
`4be78c58a70cc73d037303375c30a52cb931702ed3082088f25d9edc7765750d`,
exactly matches the independently reviewed actual from the first Resolute
run. The comparator, pixel budget, assertions and screenshot dimensions are
unchanged. The final follow-ups do not alter the frozen, lens-off screenshot
states. These capture results are historical evidence; each candidate needs
the three CI jobs and 34 selected browser cases, with current results recorded
in the pull request.

The header-spacing follow-up replaces eight 1280×720 DPR 1 baselines with exact
actuals from pinned Resolute [run `39757442503`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39757442503):
all five Default light views, Nebuchadnezzar dark Summary, and Tideline light
and dark Summary. Every changed pixel lies within the header's existing height;
the wider horizontal gaps do not move the page content. All eight phone
comparisons passed unchanged. Screenshot assertions and tolerances are unchanged.

The optional matrix covers eight viewports × two device pixel ratios × five views ×
five supported theme/scheme combinations = 400 images. Default and Tideline
each contribute 160; Nebuchadnezzar contributes 80. Comparisons store CSS-pixel
images and assert the browser's actual device pixel ratio separately. In the
earlier font-normalization set, fourteen phone/tablet images changed height by
1–3 pixels relative to the initial set. All six desktop dimensions still fit without vertical
overflow; phone and tablet views scroll as designed.

Pinned Noble [run `39643918557`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39643918557)
at `8c58cba` passed 84 unit tests, 188 functional tests in each of Chromium,
Firefox and WebKit, and all 400 screenshot comparisons: 964 browser tests.
GitGuardian also passed on that commit. This records the complete suite
before CI was reduced; it does not certify later candidates. Local checks at
`a2a4926` passed type, lint, tooling, build and all 104 unit checks. All 48
targeted Chromium/Firefox cases passed, covering source integration, tooltip
updates, modal and lens positioning, pointer access,
Settings breakpoints, programmatic Range resets and city labels. The pull
request records current three-job CI results for the final candidate.
Host-generated baselines are not accepted.

The remaining-allowance redesign at `7fce2c6` uses exact reviewed actuals from
pinned Resolute [run `39725217194`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39725217194).
It intentionally replaces ten focused baselines: `default-light-agents`,
`default-light-summary`, `nebuchadnezzar-dark-summary`, `tideline-light-summary`
and `tideline-dark-summary` in both `screenshots-1280x720-dpr1` and
`screenshots-390x844-dpr1`. Agents now shows percentage remaining, independent
allowances and resets, and no repeated disclosure; Summary uses the limiting
allowance and updated attention item. All five desktop captures remain
1280×720. Phone Agents grows to retain every allowance; phone Summary becomes
slightly shorter with compact percentage readings. Each accepted PNG's SHA-256
matches its CI actual. The other six required screenshots and all 18 functional
cases passed unchanged in that capture run. All 80 local Agents/Summary
theme/scheme/standard-viewport combinations were checked for horizontal
overflow and desktop vertical fitting, with visual review of the affected
layouts. Comparison settings and the 34-case CI selection are unchanged; the
pull request records the fresh comparison run after these baseline updates.

The October 2026 UI once-over at `9a07f64` replaces all sixteen required
baselines with the exact actuals from pinned Resolute
[run `39750157322`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39750157322):
the five Default views and the Nebuchadnezzar and Tideline summaries in both
`screenshots-1280x720-dpr1` and `screenshots-390x844-dpr1`. Every capture
changes because the header is now a single navbar row with a theme-coloured
brand mark, and each view was rebuilt. All eight desktop captures remain
1280×720 with no vertical overflow; phone captures change height with their
content (Summary 2039, Agents 2003, Calendar 1104, Weather 1425, Feeds 1371,
and 1959 to 2024 for the other themes' summaries). Each accepted PNG's SHA-256
matches its CI actual. The same run passed all 18 functional cases.
Comparison settings and the 34-case selection are unchanged.

The Vite configuration fixes the Pages base at `/dayframe-dashboard/`.
`DAYFRAME_PUBLIC_LAUNCH` is the single repository variable passed to the build:
only the literal value `true` enables indexing. An unset variable, `false` or
any other value produces both the `noindex, nofollow` meta tag and a
`robots.txt` that disallows crawling. Prelaunch builds use indexing disabled;
the [public launch](#public-launch) records the approved change to the flag.
Pages setup and deployment require approval and passing gates.

## Trusted privacy gate

`Secret checks and deployment` runs after each completed `CI` run through
`workflow_run`. Its workflow and scanner come from trusted `main`. The scanner
job has only `contents: read`. It never installs dependencies, executes a
candidate script, restores a candidate cache or consumes a candidate build.
It initializes a fresh bare repository and fetches all base-repository branches
and tags, plus the exact candidate commit. It scans the candidate and all
reachable history as passive Git objects. Nothing from a fork or Dependabot
branch is checked out or executed by this trusted job. This separation follows
[GitHub's guidance on untrusted code and privileged workflows](https://docs.github.com/en/actions/reference/security/secure-use).

Fork and Dependabot pull requests follow the same passive-data boundary.
There is no `pull_request_target` checkout. The candidate SHA and repository
identity are validated before fetching, and all Git subprocess output is
withheld. The fetch invokes Git without a shell and disables system/global
configuration and replacement objects. Its fresh bare repository contains no
candidate hooks or filesystem-monitor configuration. It does not invoke diff
drivers, text converters, checkout filters or submodules. The fetch has a
two-minute timeout and a 1 GiB per-file write
limit; fetch errors and limits fail the check.

A separate job, with `statuses: write`, publishes `Privacy / private history`
on the exact tested commit. This legacy required context now certifies only
the trusted full-history secret scan. Failed, cancelled or skipped scans
cannot pass; failure to publish leaves the required status unsatisfied. The
trusted job repeats gitleaks with trusted policy, so modifying a PR's CI
scanner or suppression files cannot bypass the gate. No `DAYFRAME_DENYLIST`,
personal access token or external credential is needed; repository access
and status publication use the scoped `GITHUB_TOKEN`.

GitHub activates this `workflow_run` listener only after its workflow is
installed on `main`. **Before merging that first installation**, independently
scan the exact candidate and complete reachable history for secrets using
independent trusted gitleaks policy. The candidate's own workflow cannot
certify its installation. Record the candidate SHA and nonsensitive results.
The listener is now installed on `main`; its post-merge scan and status
publication are recorded below. That success does not establish that the
independent pre-merge check ran. Historical pre-installation evidence and
verification on a real fork or Dependabot PR were not established; the
maintainer excluded further work on those items from the approved launch
scope on 2026-10-22. Current full-history scanning remains required.

Private credentials, private contact details and addresses, home-directory
paths, private hostnames, private account/project IDs and private repository
references must stay out of tracked content, commit messages and PR text.
Review remains necessary for private details a secret scanner cannot detect.
Public author credits, attribution and legal notices are allowed. Simulated
data still uses invented people, organisations and places; never connect real
accounts or read local credentials. No mandatory private denylist or legal-name digest
exception process remains.

Both secret checks use the pinned gitleaks container, all reachable history
and its default rules. The runner creates an isolated policy; candidate
`.gitleaks.toml`, `.gitleaksignore` and
`gitleaks:allow` comments are not honored. No licence, vendor path or historical
commit is excluded. Secret output and reports stay out of CI logs and artifacts.
The container has no network, a read-only filesystem, a 512 MiB memory limit
and a three-minute scanner timeout. Decoding and archive traversal are bounded
to five and three levels respectively. Scanner failures fail the job. See the
[gitleaks CLI reference](https://github.com/gitleaks/gitleaks#usage).

## Pages gate and required repository setup

Pages deployment accepts only a successful `CI` run caused by a push to `main`
in this repository. It also requires the trusted privacy job and its status
publication to succeed. The gate queries the run and confirms that Quality,
Browser and screenshots, and Secret history all succeeded. It rejects skipped
jobs, an unexpected workflow path and an obsolete main SHA. It checks freshness
again after acquiring the deployment
lock. The deploy job receives only the static artifact from that exact run;
it does not rebuild it. Only this job has `pages: write` and `id-token: write`.

The following external settings define the deployment policy. The verified
setup is recorded below. Each repository settings change, Pages setup or
deployment, indexing change, visibility change and public announcement needs
separate approval; implementation does not authorize them:

1. Select GitHub Actions as the Pages source and allow the `github-pages`
   environment to deploy from `main`. Leave `DAYFRAME_PUBLIC_LAUNCH` unset or
   explicitly `false` until launch is approved.
2. Protect `main` with required pull requests and checks: Quality,
   Browser and screenshots, Secret history, and
   `Privacy / private history`. Require an up-to-date branch and checks for the
   current candidate SHA, resolve review conversations and enforce the rules
   for administrators. While there is one maintainer, do not require approving
   reviews, Code Owner reviews or approval of the most recent push. The
   maintainer reviews the diff before merging their own PR after CI passes.
   Disable force pushes and deletion; revisit approvals when another reviewer
   joins. Do not require a successful deployment before merging, because Pages
   deploys only after a push to `main`.
   Fork/Dependabot status verification is outside the maintainer-approved
   launch scope. Changes to these settings remain external work.
3. Permit Actions to create pull requests for scheduled maintenance. Keep the
   weekly workflow's write permissions limited to contents and pull requests.
   No bot PAT, external service credential or change to local Git identity is
   required.

## Prelaunch deployment evidence

Verified on 2026-10-22:

- The live demo at [Dayframe](https://bvisagie.github.io/dayframe-dashboard/)
  returns HTTP 200 over HTTPS. Pages uses the GitHub Actions publishing source
  and enforces HTTPS.
- At `3d669944c2c349d60456c9c93282fa4a7cfca829`, `CI` run `39718379913`
  passed Quality, Browser and screenshots, and Secret history.
  `Secret checks and deployment` run `39718533185`, attempt 2, succeeded after
  Pages setup. Its trusted full-history scan, exact-SHA status publication,
  deployment gate and Pages deployment passed. The initial attempt stopped at
  deployment because Pages was not enabled.
- `DAYFRAME_PUBLIC_LAUNCH` is unset. The deployed HTML contains
  `noindex, nofollow`, and the deployed `robots.txt` returns
  `User-agent: *` with `Disallow: /`.
- The `github-pages` environment permits only the `main` branch. Classic
  branch protection requires PRs, all four checks from GitHub Actions, an
  up-to-date branch and resolved conversations. Administrator enforcement is
  enabled. Required approvals are zero; Code Owner reviews, last-push approval,
  force pushes and deletion are disabled.

This records the initial prelaunch setup, not public-launch approval. Current
verification and the remaining evidence gaps follow below.

## Launch readiness evidence

Verified on 2026-10-22 against main commit
`989c971f751d2ac6d9dae83277ba2e03738babd0`:

- [CI run `39765176659`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39765176659)
  passed Quality, Browser and screenshots (all 34 required cases), and Secret
  history. Trusted
  [run `39765335024`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39765335024)
  passed the independent full-history scan, status publication, deployment gate
  and Pages deployment. The commit's `Privacy / private history` status is
  `success` and points to that trusted run.
- The repository is already public. Protection still requires all four
  checks from GitHub Actions, an up-to-date branch, PRs and resolved
  conversations, including for administrators. Required approvals remain zero;
  force pushes and deletion remain disabled. The Pages environment permits
  only `main`, uses Actions and enforces HTTPS.
- The live demo and `robots.txt` return HTTP 200 over HTTPS. The launch variable
  is unset, HTML contains `noindex, nofollow`, and `robots.txt` disallows
  crawling. Visibility alone has not enabled indexing.
- Manually dispatched
  [weekly maintenance run `39766411779`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39766411779)
  passed both jobs. The skill matches canonical upstream bytes and the exact
  Bootstrap pin is current. Both update-draft steps were skipped as intended.
  This verifies hosted checks, not a timer-triggered run or draft creation.
- Local builds were checked with the launch variable unset and with the literal
  `true`: the former emits `noindex, nofollow` and `Disallow: /`, while the
  latter emits `index, follow` and `Allow: /`. The default build was restored
  afterward; no repository variable was changed.

The historical pre-installation scan, fork/Dependabot status path and
maintenance draft creation were not verified by this readiness check. The
maintainer removed further work on those items from the launch scope on
2026-10-22. Actions' draft-creation permission remains disabled; this launch
does not change maintenance automation settings or certify automatic drafts.

## Public launch

On 2026-10-22 the maintainer approved enabling indexing, deploying a checked
launch build and recording the result. Publication of the announcement and
upstream feedback belongs to the maintainer; no posting is part of this work.

The launch uses the existing `DAYFRAME_PUBLIC_LAUNCH=true` build flag and the
unchanged main-push deployment gate. The release PR updates the README's
prelaunch notice. Live verification is pending deployment: require HTTP 200
over HTTPS, `index, follow` in the HTML and `Allow: /` in `robots.txt`, then
record the deployed commit and successful CI and deployment runs here.

M5 remains open until the maintainer supplies publication links. The
[roadmap checklist](roadmap.md#launch-checklist) tracks that remaining item.

## Weekly maintenance

The [dependency audit](dependencies.md) records the current package, action,
runtime and container pins, plus upstream-managed compatibility exceptions.
TypeScript 7 supplies the tooling CLI while Svelte retains its supported
TypeScript 6 API through the official compatibility aliases.

Dependabot checks npm dependencies and Actions weekly, excluding `bootstrap`
and `@playwright/test`. Bootstrap stays an exact pin and uses a dedicated
upgrade PR. A separate Monday registry check reads all published Bootstrap 6
versions, including alpha/beta/rc releases, compares
them using SemVer precedence, and selects only a version greater than the
current pin. This avoids relying on Dependabot to discover a prerelease from
a default-version range. It never selects Bootstrap 5 or downgrades the pin.
An upgrade draft changes only `package.json`, `package-lock.json`, the
Bootstrap log and a pending feature-map review note. Lockfile generation
disables lifecycle scripts. The draft explicitly requires token/component
review, the CSS footprint, targeted manual review of affected components,
themes and viewports, and passing three-job CI with the 34 browser cases
before merge.

Playwright updates are manual and coordinated: change the exact
`@playwright/test` package pin and the matching CI container image together,
run the same 34-case browser requirement, and review affected rendering and any
screenshot baseline refresh in that upgrade. Dependabot's development-tools
group cannot update Playwright by itself.

The same schedule checks canonical frontend-design bytes at a fixed resolved
upstream commit. `node scripts/sync-skill.mjs --check` is read-only;
`node scripts/sync-skill.mjs` writes only the two unmodified upstream files
and their `UPSTREAM.md` provenance. Public upstream author credits, attribution
and legal notices may remain. The script fetches both files before writing,
bounds response sizes and timeouts, refuses symlink destinations and fails if
the expected licence format changes.
An update opens a dedicated draft with only those paths staged.

Maintenance uses branches identified by the upstream content digest or exact
Bootstrap version and leaves an existing open draft
untouched. It never force-pushes or merges. A draft created with the default
`GITHUB_TOKEN` does not trigger another workflow automatically; a maintainer
must dispatch `CI` on its branch, review the trusted privacy result and mark
it ready. No actual maintenance PR is opened during implementation. The PR
template records Bootstrap-first questions, accessibility, static/privacy
constraints, docs, validation results and intended screenshot baseline changes.
