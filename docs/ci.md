# CI, privacy and maintenance

Routine `CI` runs on pull requests and pushes to `main`, with three jobs:

- **Quality:** types, Svelte, lint, workflow-tooling types, unit tests and the
  production build. It uploads the `dayframe-build` artifact.
- **Browser and screenshots:** selected existing Chromium tests tagged
  `@smoke`: 18 functional cases and 16 screenshots, eight each at 1280×720 and
  390×844, at device pixel ratio 1. These cover all five Default views and
  Summary in the other themes' supported schemes.
- **Secret history:** full-history gitleaks with the isolated default policy.

Feature-branch pushes do not start a second copy of PR CI. Node is 26; browser
tests run in `mcr.microsoft.com/playwright:v1.64.1-noble`, matching Playwright
1.64.1. The browser report, build and requested screenshot candidates are
retained for seven days. Every browser run builds and serves the production
bundle, uses two workers and has zero retries.

The routine browser command is:

```sh
npm run test:browser -- --project=chromium --project=screenshots-1280x720-dpr1 --project=screenshots-390x844-dpr1 --grep @smoke
```

The full suite remains available through `npm run test:browser`. To run it in
the pinned container, dispatch `CI` on the candidate branch with `full_suite`
enabled. It uses the same three jobs; the browser job runs all three engines
and all 400 screenshots. **Before merging a Bootstrap upgrade or substantial
theme change, run this full mode on the current candidate SHA and review the
results.** Later documentation or CI-selection changes can use routine CI;
behaviour or test-assertion changes require fresh full validation. This is a
manual review requirement, not automatic path detection.
Ordinary changes use the routine selection. All assertions and baselines remain
in the complete suite.

Firefox [rejects root when the home directory belongs to another user](https://github.com/mozilla/gecko-dev/blob/master/toolkit/xre/nsAppRunner.cpp#L3544-L3570).
Full mode corrects only the runner-mounted home directory's owner before
launch, without recursion or overriding `HOME`.

For intentional visual updates, enable `screenshot_candidates` in the manual
dispatch. Candidate generation runs after comparisons and uploads all 400
images for review, including when comparisons fail. It cannot turn a failed
comparison into a pass. Host-generated baselines are refused.

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

The matrix covers eight viewports × two device pixel ratios × five views ×
five supported theme/scheme combinations = 400 images. Default and Tideline
each contribute 160; Nebuchadnezzar contributes 80. Comparisons store CSS-pixel
images and assert the browser's actual device pixel ratio separately. Fourteen
phone/tablet images have font-related height changes of 1–3 pixels relative to
the initial set. All six desktop dimensions still fit without vertical
overflow; phone and tablet views scroll as designed.

Pinned Noble [run `39643918557`](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39643918557)
at `8c58cba` passed 84 unit tests, 188 functional tests in each of Chromium,
Firefox and WebKit, and all 400 screenshot comparisons: 964 browser tests.
GitGuardian also passed on that commit. This validates the complete suite
before routine CI was reduced; later candidates still need their applicable
checks. A local probe of 50 screenshot comparisons differed from the Noble
baselines across text rendering, so host captures were not accepted.

The Vite configuration fixes the Pages base at `/dayframe-dashboard/`.
`DAYFRAME_PUBLIC_LAUNCH` is the single repository variable passed to the build:
only the literal value `true` enables indexing. An unset variable, `false` or
any other value produces both the `noindex, nofollow` meta tag and a
`robots.txt` that disallows crawling. The complete prelaunch dashboard is built
with indexing disabled; Pages setup and deployment require separate approval
and passing gates.

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
The listener is not activated on `main` yet. Activation does not waive the
check or defer it until launch. After installation, verify the trusted
listener and required status on real CI runs, including a fork or Dependabot
pull request.

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

The maintainer must complete these external settings. Each repository settings
change, Pages setup or deployment, indexing change, visibility change and public
announcement needs separate approval; implementation does not authorize them:

1. Select GitHub Actions as the Pages source and allow the `github-pages`
   environment to deploy from `main`. Leave `DAYFRAME_PUBLIC_LAUNCH` unset or
   explicitly `false` until launch is approved.
2. Protect `main` with pull request review and required checks: Quality,
   Browser and screenshots, Secret history, and
   `Privacy / private history`. Require checks for the current candidate SHA.
   Confirm the trusted status appears on a real fork or Dependabot PR before
   treating this setup as complete. Rulesets/settings remain external work.
3. Permit Actions to create pull requests for scheduled maintenance. Keep the
   weekly workflow's write permissions limited to contents and pull requests.
   No bot PAT, external service credential or change to local Git identity is
   required.

## Weekly maintenance

Dependabot checks npm dependencies and Actions weekly. Bootstrap stays an
exact pin and a dedicated upgrade PR. A separate Monday registry check reads
all published Bootstrap 6 versions, including alpha/beta/rc releases, compares
them using SemVer precedence, and selects only a version greater than the
current pin. This avoids relying on Dependabot to discover a prerelease from
a default-version range. It never selects Bootstrap 5 or downgrades the pin.
An upgrade draft changes only `package.json`, `package-lock.json`, the
Bootstrap log and a pending feature-map review note. Lockfile generation
disables lifecycle scripts. The draft explicitly requires token/component
review, the CSS footprint and a manual `CI` run with `full_suite` enabled before
merge, covering the complete browser and screenshot matrix.

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
