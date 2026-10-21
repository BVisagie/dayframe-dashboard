# CI, privacy and maintenance

`CI` runs on every branch push and pull request. It checks types and lint,
unit tests, the production build, full-history secrets, and every Playwright
project. Node is 26. All browser and screenshot tests use
`mcr.microsoft.com/playwright:v1.64.1-noble`, matching the exact test dependency.
No browser project is filtered out. Reports and the `dayframe-build` static
build are retained for seven days, including pull request builds.
The workflow also generates initial screenshot candidates in the same
pinned container. They are uploaded separately for visual review; the normal
comparison job still fails until reviewed baselines are committed. Later
intentional visual changes can request candidates through the workflow's
`screenshot_candidates` dispatch input. Host-generated baselines are refused.
The type job also runs `npx tsc --project .github/tsconfig.json` to check the
typed JSDoc in privacy, sync and workflow tooling with Node types.

These workflows are implemented; a successful hosted browser run and reviewed
container-generated screenshot baselines remain pending. Local fitting checks
cover all five views at 1280×720 and 1920×1080 in all three themes at the
default display scale. They do not establish that the three-browser functional
suite or the complete screenshot matrix has passed. No baseline acceptance or
production privacy pass is claimed.

The Vite configuration fixes the Pages base at `/dayframe-dashboard/`.
`DAYFRAME_PUBLIC_LAUNCH` is the single repository variable passed to the build:
only the literal value `true` enables indexing. An unset variable, `false` or
any other value produces both the `noindex, nofollow` meta tag and a
`robots.txt` that disallows crawling. The complete prelaunch dashboard is built
with indexing disabled; Pages setup and deployment require separate approval
and passing gates.

## Trusted privacy gate

`Privacy and deployment` runs after each completed `CI` run through
`workflow_run`. Its workflow and scanner come from trusted `main`. The scanner
job has only `contents: read`. It never installs dependencies, executes a
candidate script, restores a candidate cache or consumes a candidate build.
It initializes a fresh bare repository and fetches all base-repository branches
and tags, plus the exact candidate commit. It scans that commit's tree and all
reachable history as passive Git objects. Nothing from a fork or Dependabot
branch is checked out or run with the denylist secret. This separation follows
[GitHub's guidance on untrusted code and privileged workflows](https://docs.github.com/en/actions/reference/security/secure-use).

This design keeps secrets out of fork and Dependabot pull request CI runs.
There is no `pull_request_target` checkout. The candidate SHA and repository
identity are validated before fetching, and all Git subprocess
output is withheld. Git is invoked without a shell; the scanner disables
system/global configuration, replacement objects, hooks and filesystem
monitors. It does not invoke diff drivers, text converters, checkout filters
or submodules. The fetch has a two-minute timeout and a 1 GiB per-file write
limit; fetch errors and limits fail the check.

A separate job, with `statuses: write` and no denylist secret, publishes
`Privacy / private history` on the exact tested commit. A missing or empty
denylist, a failed scan or a cancelled scanner produces failure. Failure to
publish leaves the required status unsatisfied. The trusted job also repeats
the full-history gitleaks scan with trusted policy, so modifying a PR's CI
scanner or suppression files cannot bypass the private gate.

GitHub activates this `workflow_run` listener only after its workflow is
installed on `main`. **Before merging that first installation**, independently
scan the exact candidate tree and complete reachable history with the real
private denylist and trusted scanner policy, including the full-history secret
check. The candidate's own workflow cannot certify its installation. Record
the candidate SHA and nonsensitive check results without exposing the list.
Activation does not waive the check or defer it until launch. After installation,
verify the trusted listener and required status on real CI runs.

The maintainer has deferred supplying `DAYFRAME_DENYLIST`. Keep the production
privacy result pending and do not create an invented substitute. A real
denylist check is required before merge or deployment, including the first
workflow installation. Scanner unit tests with synthetic fixtures verify the
scanner's behaviour; they do not certify this repository's privacy.

## Private denylist CLI

Use `npm run privacy -- --tree --history` on the committed candidate before
submitting changes. This repository contains a tracked skill symlink, so the
committed-tree mode scans its target bytes without following it. By default the
CLI scans current contents of every tracked working-tree file; `--history`
adds every reachable commit message, historical tree path and blob on all
local branches and tags, plus annotated tag messages. `--tree` scans `HEAD`
instead of working files; `--tree <revision>` selects a particular commit.
`--repository <directory>` selects a working or bare Git repository. Full
history mode refuses a shallow clone. Fetch complete history first: an
unfetched remote branch is not available to a local scan.

Supply exactly one private source:

- `DAYFRAME_DENYLIST`: a multiline environment value, supplied in Actions as
  the repository secret of the same name.
- `DAYFRAME_DENYLIST_FILE`: an absolute path to a regular file outside the
  repository. Both the supplied path and its resolved symlink target must be
  outside the repository. Store it privately; do not commit it or create a
  repository-local environment file.

Blank lines are ignored. Every other line is one literal substring, normalized
with Unicode NFKC and matched without case sensitivity. Strings are not regexes
or shell input. Keep the actual list private and include the prohibited names,
addresses, locations, paths, hostnames, identifiers and private repository
references that matter to this project. An absent or all-blank list, an invalid
classified entry, an unreadable file or ambiguous sources fail closed. The CLI
never prints a match, a scanned filename, the list's path, Git stderr or an
underlying exception. It reports a fixed success or failure message. Diagnose
locally in a private session.

Binary files are scanned too, as UTF-8 and both UTF-16 byte orders. There are no
extension-based exclusions. The check detects literal embedded text; it does
not OCR screenshots or decompress arbitrary binary formats. Historical
symlinks are scanned as link-target bytes and never followed. The working-tree
scan refuses symlinks, special files, conflicts and submodules rather than
reading outside the tree. Use `--tree` to inspect a committed symlink safely.
Limits are 32 MiB per file/object, 512 MiB of inspected data, 500,000 tree
entries, 20,000 commits, 4,096 denylist entries, a 1 MiB denylist and three
minutes for the scanner. Exceeding a limit fails; nothing is silently skipped.
Historical trees and blobs are deduplicated without dropping path checks.

## Exact legal-name exceptions

Ordinary denylist lines always apply, including inside legal notices. A line
prefixed with `name:` explicitly classifies a real person's name as eligible
for the narrow approved exception. Only these classified names may be ignored,
and only when both the full path and SHA-256 digest of the complete file match
an entry in `.github/privacy-exceptions.json` from the trusted scanner checkout.
The manifest contains public paths and digests, never private name strings.
There is no path glob, comment suppression, general allowlist or exemption for
project-authored prose. A duplicate blob at an unapproved path is scanned fully.

Approved entries cover the existing project `LICENSE`, the byte-for-byte
vendored frontend-design skill and its licence, and individually reviewed
mandatory third-party legal notices. When adding a mandatory notice, verify
its upstream provenance and exact bytes, then add its path, SHA-256 digest and
`legal-notice` kind to the manifest. A name appearing elsewhere remains
forbidden. Changed or appended content invalidates the exception. Keep old
approved digests for historical versions so a full-history scan can validate
them. An exception added by a PR is ineffective until reviewed and included
in the trusted scanner on `main`; that PR may therefore need a separately
reviewed trust update before its private gate can pass.

Gitleaks never uses this manifest. Both secret checks use the pinned gitleaks
container, all reachable history and its default rules. The runner creates an
isolated policy; candidate `.gitleaks.toml`, `.gitleaksignore` and
`gitleaks:allow` comments are not honored. No licence, vendor path or historical
commit is excluded. Secret output and reports stay out of CI logs and artifacts.
The container has no network, a read-only filesystem, a 512 MiB memory limit
and a three-minute scanner timeout. Decoding and archive traversal are bounded
to five and three levels respectively. Scanner failures fail the job. See the
[gitleaks CLI reference](https://github.com/gitleaks/gitleaks#usage).

## Pages gate and required repository setup

Pages deployment accepts only a successful `CI` run caused by a push to `main`
in this repository. It also requires the trusted privacy job and its status
publication to succeed. The gate queries the run and confirms that Type and
lint, Unit tests, Production build, Browser and screenshots, and Secret history
all succeeded. It rejects skipped jobs, an unexpected workflow path and an
obsolete main SHA. It checks freshness again after acquiring the deployment
lock. The deploy job receives only the static artifact from that exact run;
it does not rebuild it. Only this job has `pages: write` and `id-token: write`.

The maintainer must complete these external settings. Each repository settings
change, Pages setup or deployment, indexing change, visibility change and public
announcement needs separate approval; implementation does not authorize them:

1. Enter the real nonempty multiline `DAYFRAME_DENYLIST` using private secret
   entry, never a chat message, issue, PR or committed file. Do not substitute
   invented test tokens for the production denylist. No personal credentials
   or provider accounts are needed. Until it is supplied, merge and deployment
   remain blocked on the real check, including independent verification before
   the trusted workflow's first installation.
2. Select GitHub Actions as the Pages source and allow the `github-pages`
   environment to deploy from `main`. Leave `DAYFRAME_PUBLIC_LAUNCH` unset or
   explicitly `false` until launch is approved.
3. Protect `main` with pull request review and required checks: Type and lint,
   Unit tests, Production build, Browser and screenshots, Secret history, and
   `Privacy / private history`. Require checks for the current candidate SHA.
   Confirm the trusted status appears on a real fork or Dependabot PR before
   treating this setup as complete. Rulesets/settings remain external work.
4. Permit Actions to create pull requests for scheduled maintenance. Keep the
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
review, the CSS footprint and the full screenshot matrix before merge.

The same schedule checks canonical frontend-design bytes at a fixed resolved
upstream commit. `node scripts/sync-skill.mjs --check` is read-only;
`node scripts/sync-skill.mjs` writes only the two unmodified upstream files,
their `UPSTREAM.md` provenance and the legal-name digest manifest. It does not
save upstream author names, email addresses or commit messages. The script
fetches both files before writing, bounds response sizes and timeouts, refuses
symlink destinations and fails if the expected licence format changes.
An update opens a dedicated draft with only those paths staged.

Maintenance uses branches identified by the upstream content digest or exact
Bootstrap version and leaves an existing open draft
untouched. It never force-pushes or merges. A draft created with the default
`GITHUB_TOKEN` does not trigger another workflow automatically; a maintainer
must dispatch `CI` on its branch, review the trusted privacy result and mark
it ready. No actual maintenance PR is opened during implementation. The PR
template records Bootstrap-first questions, accessibility, static/privacy
constraints, docs, validation results and intended screenshot baseline changes.
