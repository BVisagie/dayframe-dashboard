# Bootstrap 6.0.0-alpha.1: upstream feedback drafts

Prepared 2026-10-22. These are research notes and drafts only. No upstream issue, discussion or PR has been created or edited.

## Show & Tell launch draft

Prepared for maintainer review; do not post until separately approved. Post
the announcement after the launch deployment is verified. Recheck the current
Show & Tell category before submitting. Keep bug reports and proposals in
their own threads using the drafts below.

**Title:** Dayframe: a static dashboard built with Bootstrap 6

```markdown
I've built Dayframe, a glanceable dashboard for people who work with AI coding agents, and a real application for trying Bootstrap 6 as it develops.

Live demo: https://bvisagie.github.io/dayframe-dashboard/
Source (MIT): https://github.com/BVisagie/dayframe-dashboard

It has five views: Summary, Agents, Calendar, Weather and Feeds. Agent usage, calendars and non-Bootstrap stories are clearly labelled simulations. Weather comes from Open-Meteo; Bootstrap news comes from its public blog and release feed. Everything runs in the browser on GitHub Pages, without accounts, a backend or analytics.

The current build uses Bootstrap 6.0.0-alpha.1 with Svelte 5 and Vite. It uses Bootstrap's components and JavaScript plugins, including tabs, nav overflow, menus, dialogs, drawers, datepicker and combobox, plus its tokens, theme roles and container-query layout utilities. A Bootstrap lens identifies components in the live UI, and the repository's Bootstrap log records custom gaps and upstream limitations.

There are three themes: Default in light and dark, Nebuchadnezzar as a dark console, and Tideline in light and dark. Adding a theme takes one folder and has an automated contract check. The dashboard fits desktop displays and scrolls on phones.

I'd welcome feedback on the Bootstrap integration, keyboard navigation and theme contract. The README includes screenshots and local setup instructions.
```

## Summary

| #   | Finding                                                       | Status upstream                                                                                                                                                                                                                                                                                                                                                                                              | Where to post                                                                                                                                                  |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `.nav-overflow` grows vertically in a column flex parent      | **Not reported.** A regression from [#42814](https://github.com/twbs/bootstrap/pull/42814) (merged 2026-08-11), which moved `flex: 1 1 0` from `.navbar-nav.nav-overflow` onto every wrapper. Unchanged on `main`.                                                                                                                                                                                           | New **issue**, "Report a bug" template (labels it gets: `bug`; maintainers add `v6`, `css`)                                                                    |
| 2   | No "raised surface" background role distinct from `--bg-body` | **Not reported.** Related but different: [#42657](https://github.com/twbs/bootstrap/issues/42657) (closed: keep `$theme-bgs` a linear scale), [discussion #38733](https://github.com/orgs/twbs/discussions/38733) (v5.3 Q&A: `$body-bg` also sets component backgrounds), [discussion #43075](https://github.com/orgs/twbs/discussions/43075) (open: derive theme colours from `--*-base`, a separate topic) | New **discussion** in the **v6 Feedback** category                                                                                                             |
| 3   | `.prose` caps at 1000px and centres itself, undocumented      | **Not reported.** Open PR [#43146](https://github.com/twbs/bootstrap/pull/43146) edits `_prose.scss` but leaves those lines alone.                                                                                                                                                                                                                                                                           | New **issue**, "Feature request" template (CONTRIBUTING counts extending or modifying an existing feature as `feature`). A v6 Feedback thread would also work. |

**Verification.** On 2026-10-22, `scss/_nav-overflow.scss` and `scss/content/_prose.scss` on `main` are byte-identical to alpha.1, and `$theme-bgs` is unchanged (`main` is 47 commits ahead of the tag). Every number in the drafts comes from the standalone reproductions below, which load Bootstrap from jsDelivr. They were run in Chromium 156 and Firefox 157 on Linux, and both engines agree. WebKit could not be tested because it would not launch on this machine.

**Format notes.**

- Issue templates in `.github/ISSUE_TEMPLATE`:
  - `bug_report.yml` has three required checkboxes, then "Describe the issue", "Reduced test cases", OS, browsers and version.
  - `feature_request.yml` has two checkboxes, then "Proposal" and "Motivation and context".
  - `config.yml` links "Ask the community" to org discussions.
- Discussion categories: Announcements, General, Ideas, Polls, Q&A, Show & Tell, and **v6 Feedback** (`DIC_kwDOACBxpM4C3xZU`). In [#42090](https://github.com/orgs/twbs/discussions/42090#discussioncomment-16015773) the lead maintainer asked people to open new threads in v6 Feedback rather than reply to the umbrella threads (#42444 components, #42326 docs, #42445 forms, #42431 examples).
- CONTRIBUTING asks for these things:
  - reproduce the problem on the latest `main`;
  - include a reduced test case (its CodePen templates are v4/v5 only, so a standalone HTML snippet is the practical choice for v6);
  - give the environment, the steps, and expected versus actual.

  In [#43008](https://github.com/orgs/twbs/discussions/43008) a maintainer asked for one issue per cause, and for no PR until the fix has been agreed in the issue.

- The alpha.1 JavaScript bundle is an ES module. The docs load it with `<script type="module">`, and a plain `<script>` throws `Unexpected token 'export'`, which leaves nav-overflow uninitialised and its nav hidden. Reproduction 1 uses `type="module"` and SRI hashes that match the docs config.

**Before posting:**

- Run each snippet through the HTML validator and only then tick the "validated" checkbox. This was not done, because it means sending content to an external service.
- The drafts use the reproducible numbers. The figures from the real layout (133px instead of 46px, and a 580px offset) are left out on purpose, since they depend on that layout.

---

## Finding 1: `.nav-overflow` grows on the block axis in a column flex container

### Search log

- **Issues and PRs** (`gh search issues "<q>" --repo twbs/bootstrap --include-prs`)
  - `nav-overflow` (30 hits) and `nav overflow` (20 hits): reviewed every nav-overflow thread, listed below.
  - No hits: `nav-overflow flex`, `nav-overflow height`, `nav-overflow column`, `nav overflow vertical`, `nav overflow grows`, `priority+ nav`, `nav-overflow flex-grow`, and `flex 1 1 0 nav` (1 hit, from 2012, unrelated).
- **PR searches:** `gh pr list --repo twbs/bootstrap --state all --search "nav-overflow"` and the same with `"nav overflow"`.
- **Open PRs:** checked the changed files of all 133 open PRs. None touch `scss/_nav-overflow.scss`. The only open nav-overflow PR, #43095, changes `js/src/tab.ts` and specs only.
- **Discussions**
  - Downloaded all 38 v6 Feedback threads with every comment and reply (none had more than 100), then searched them for `nav-overflow`, `overflow`, `flex: 1`, `column` and `height`.
  - Ran a GraphQL `search(type: DISCUSSION)` across all categories for `nav-overflow`, `nav overflow`, `nav-overflow height`, `nav-overflow column` and `flex-direction column nav`.
- **Milestones:** there is no v6 milestone; the repository has no open milestones.

Nav-overflow threads that exist; none mention column parents or block-axis growth:

- [#42639](https://github.com/twbs/bootstrap/issues/42639) (closed): ResizeObserver loop and `collapseBelow`. Fixed by [#42814](https://github.com/twbs/bootstrap/pull/42814) (merged), which introduced the wrapper and the unconditional `flex: 1 1 0` in commit `a472999`.
- [#42845](https://github.com/twbs/bootstrap/issues/42845) (closed): icon centring and a flicker on first paint after #42814.
- [#42614](https://github.com/twbs/bootstrap/issues/42614) (closed): example behaviour.
- [#42873](https://github.com/twbs/bootstrap/pull/42873) (merged): submenus.
- [#43092](https://github.com/twbs/bootstrap/issues/43092) and [#43095](https://github.com/twbs/bootstrap/pull/43095) (open): a tab reopens the "More" menu. JavaScript only.
- Discussion [#42337](https://github.com/orgs/twbs/discussions/42337) (closed): docs examples not collapsing, before #42814.
- Discussion [#42444](https://github.com/orgs/twbs/discussions/42444): has an empty "Nav overflow" heading in its template.

### Fix options tested (Chromium 156 and Firefox 157)

| Change                               | Column shell                                 | Docs navbar example | Generic `.d-flex` row with a two-word label                                             |
| ------------------------------------ | -------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| alpha.1 as shipped                   | wrapper 500px for a 46px nav (1080px window) | fills free width    | OK                                                                                      |
| add the `.flex-grow-0` utility       | 47px (nav plus 1px border)                   | n/a                 | n/a                                                                                     |
| `max-block-size: max-content`        | fixed in Chromium, **no effect in Firefox**  | unchanged           | unchanged                                                                               |
| `flex: 0 1 auto; inline-size: 100%`  | fixed                                        | unchanged           | **label wraps (24px to 48px tall)**                                                     |
| grow only in `.navbar .nav-overflow` | fixed                                        | unchanged           | **wrapper is 0px and every item moves to "More"**, unless the wrapper gets `.flex-fill` |

### Draft issue

**Template:** Report a bug

**Title:** `.nav-overflow` grows vertically when its parent is a column flex container

````markdown
### Prerequisites

- [ ] I have searched for duplicate or closed issues
- [ ] I have validated any HTML to avoid common problems
- [ ] I have read the contributing guidelines

### Describe the issue

`.nav-overflow` sets `flex: 1 1 0` so the wrapper fills the free space when it is a flex item. That only works as intended in a row. When the wrapper is a direct child of a column flex container, it grows along the block axis and takes a share of the free height.

A common page shell triggers it: `.d-flex.flex-column.min-vh-100` containing a header, the nav-overflow wrapper and `main.flex-grow-1`. The wrapper and `main` split the free height, so the page content starts far below the nav.

Steps to reproduce:

1. Open the reduced test case below in a 1920×1080 window.
2. The nav is 46px tall, but the `.nav-overflow` wrapper is 500px tall, and `main` starts 454px below the nav. The page logs these values to the console.
3. Add `.flex-grow-0` to the wrapper. It shrinks to 47px (the nav plus its 1px border), and `main` starts directly below it.

**Expected:** the wrapper is as tall as the nav, and `main` gets all the free height.
**Actual:** the wrapper takes part of the free height, and the gap grows with the viewport height.

Source, `scss/_nav-overflow.scss` in 6.0.0-alpha.1 (unchanged on `main`):

```scss
  .nav-overflow {
    // Inline-size containment keeps the nav's width, and the min-content width
    // it leaks through any flex ancestor, out of the wrapper's own size
    container-type: inline-size;
    flex: 1 1 0; // Fill the free space when the wrapper is itself a flex item
    min-width: 0; // Let the wrapper shrink below its content width
```

The grow became unconditional in #42814. Before that, it applied only in navbars:

```scss
.navbar-nav.nav-overflow {
  flex: 1 1 0;
}
```

**Possible fixes.** The wrapper still has to grow in rows. Because of `container-type: inline-size` its intrinsic width is 0, so a wrapper that doesn't grow collapses and every item moves to "More". CSS can't tell whether the parent is a row or a column, so each option below has a trade-off. All were tested in Chromium and Firefox:

1. Grow only in the navbar again, and document `.flex-fill` for other row parents:
   ```scss
   .navbar .nav-overflow {
     flex: 1 1 0;
   }
   ```
   This fixes the column case and keeps the navbar example working. The cost: in a plain `.d-flex` row without `.flex-fill`, the wrapper is 0px wide and every item collapses.
2. Keep the current rule and document the column case: add `.flex-grow-0` to the wrapper. This already works, because utilities come after components in the cascade.

These do not work:

- `max-block-size: max-content` fixes Chromium, but Firefox ignores it.
- `flex: 0 1 auto; inline-size: 100%` fixes the column case, but squeezes siblings in a row: a two-word label next to the nav wrapped onto two lines.

### Reduced test cases

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>.nav-overflow grows in a column flex container</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@6.0.0-alpha.1/dist/css/bootstrap.min.css"
      integrity="sha384-B/GM4XqrwHnWXNOWMbloTmrYXZg10cakYGmpfsR/bbzQ6JAJI4ihuyADKLnBgrCe"
      crossorigin="anonymous"
    />
  </head>
  <body>
    <!-- A common page shell: header, nav, main that fills the rest of the viewport -->
    <div class="d-flex flex-column min-vh-100">
      <header class="p-3 border-bottom">Header</header>
      <div
        class="nav-overflow border-bottom"
        data-bs-toggle="nav-overflow"
        id="wrapper"
      >
        <ul class="nav nav-pills">
          <li class="nav-item">
            <a class="nav-link active" aria-current="page" href="#">Overview</a>
          </li>
          <li class="nav-item"><a class="nav-link" href="#">Activity</a></li>
          <li class="nav-item"><a class="nav-link" href="#">Settings</a></li>
        </ul>
      </div>
      <main class="flex-grow-1 p-3" id="main">
        Main content should start directly below the nav.
      </main>
    </div>

    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/bootstrap@6.0.0-alpha.1/dist/js/bootstrap.bundle.min.js"
      integrity="sha384-1a/pXj49ZQ1aHEmrJ+gMw1otqoVsYwlEnlD8mIfY2TV03r20Y0CN7uqx1tQogjPL"
      crossorigin="anonymous"
    ></script>
    <script>
      window.addEventListener('load', () => {
        const wrapper = document.getElementById('wrapper');
        const nav = wrapper.querySelector('.nav');
        const main = document.getElementById('main');
        console.log('nav height:', nav.offsetHeight, 'px');
        console.log('.nav-overflow height:', wrapper.offsetHeight, 'px');
        console.log(
          'gap between nav and main:',
          main.getBoundingClientRect().top - nav.getBoundingClientRect().bottom,
          'px',
        );
      });
    </script>
  </body>
</html>
```

### What operating system(s) are you seeing the problem on?

Linux

### What browser(s) are you seeing the problem on?

Chrome, Firefox (tested in Chromium 156 and Firefox 157)

### What version of Bootstrap are you using?

v6.0.0-alpha.1 (`scss/_nav-overflow.scss` is identical on `main`)
````

---

## Finding 2: no background role for a raised surface distinct from the page

### Search log

- **Issues and PRs** (`gh search issues "<q>" --repo twbs/bootstrap --include-prs`)
  - No hits: `bg-1 surface`, `elevated surface token`, `surface token`, `card background tinted body`, `card-bg bg-body`, `bg-body bg-1 card`, `raised surface`, `elevation background`, `background layers dark mode lighter`, `bg-body darker than card`, `layer colors background`, `body background gray card white`.
  - `bg-surface` returned 6 hits, all unrelated.
  - `theme-bgs` returned [#42657](https://github.com/twbs/bootstrap/issues/42657) (closed as completed on 2026-07-17). It asked whether to give `$theme-bgs` semantic names, and the maintainer chose to keep it a linear scale. It does not cover a surface role. It also returned #42849 (merged, Sass map configuration) and #37983 (closed, dynamic theming). Neither is related.
- **PR searches:** `gh pr list --state all --search` for `theme-bgs`, `bg-body`, `surface` and `card-bg`. Nothing relevant.
- **Open PRs:** two open PRs touch the relevant files, and neither changes the background-scale semantics.
  - [#42947](https://github.com/twbs/bootstrap/pull/42947) changes `_theme.scss` and `theme.mdx`. It derives theme colour pairings from `--*-base`.
  - [#42784](https://github.com/twbs/bootstrap/pull/42784) changes `_card.scss` for container queries.
- **Discussions**
  - In the full v6 Feedback dump, `surface`, `elevat`, `card-bg` and `tinted` had no hits. `bg-body` matched only #43075 and #42090.
  - GraphQL search across all categories:
    - No hits: `bg-1 surface`, `elevated`.
    - `surface` matched #42924 (Show & Tell, token export, unrelated) and #41235.
    - `card background body` and `bg-body` (61 hits) led to [#38733](https://github.com/orgs/twbs/discussions/38733), a v5.3 Q&A. There a maintainer explained that `$body-bg` "is also reused to define the default background color of most of the components too", and several users said this surprised them when they tinted the page. It is the same root cause, carried into v6.
    - `tinted background` matched #39901, which is unrelated.
- **Docs evidence:**
  - The "Layer colors" table in `customize/theme.mdx` describes `body` as the "Default background color" and `bg-1` as the "Lowest contrast background color", without saying how they relate to each other.
  - The Album example (`site/src/assets/examples/album`) puts `.card`s inside a `.album.py-5.bg-1` section, which is option A below.

### Draft discussion

**Category:** v6 Feedback

**Title:** How should a tinted page canvas with raised cards be built with `$theme-bgs`?

````markdown
v6 has one background role, `--bg-body`, for both the page and the default component surface. The numbered steps `--bg-1` to `--bg-4` get darker in light mode and lighter in dark mode. There is no role for a raised surface that differs from the page, so I'm not sure how the team intends a common layout to be built: a tinted canvas with raised cards on it, as in dashboards, settings pages or the Album example.

`scss/_theme.scss` (6.0.0-alpha.1, unchanged on `main`):

```scss
$theme-bgs: defaults(
  (
    'body': light-dark(var(--white), var(--gray-975)),
    '1': light-dark(var(--gray-025), var(--gray-950)),
    '2': light-dark(var(--gray-050), var(--gray-900)),
    '3': light-dark(var(--gray-100), var(--gray-800)),
    '4': light-dark(var(--gray-200), var(--gray-700)),
    // …
  ),
  $theme-bgs
);
```

How components use them:

- `--bg-body` paints the page (`body { background-color: var(--bg-body); }` in `content/_reboot.scss`). It is also the default fill for card (`--card-bg`), list group, table, dialog, drawer, menu, popover, toast, accordion, pagination, datepicker and form controls (`--btn-input-bg`).
- `--bg-1` is the recessed fill inside those surfaces. It is used for:
  - card headers and footers (`--card-cap-bg`), alerts, the nav pills track, and toast and popover headers;
  - the hover state of nav links, list group actions, menu items and pagination.

There are two ways to build a tinted canvas, and each one breaks something. Measured with the snippet below; Chromium 156 and Firefox 157 give the same values:

| Element         | A, light  | A, dark   | B, light  | B, dark   |
| --------------- | --------- | --------- | --------- | --------- |
| Canvas          | `#f1f2f3` | `#171a1d` | `#f1f2f3` | `#080a0c` |
| Card            | `#ffffff` | `#080a0c` | `#ffffff` | `#0f1214` |
| Card header     | `#f6f7f8` | `#0f1214` | `#ffffff` | `#0f1214` |
| Nav pills track | `#f6f7f8` | `#0f1214` | `#ffffff` | `#0f1214` |
| Alert           | `#f6f7f8` | `#0f1214` | `#ffffff` | `#0f1214` |
| List group item | `#ffffff` | `#080a0c` | `#f1f2f3` | `#080a0c` |
| Table cell      | `#ffffff` | `#080a0c` | `#f1f2f3` | `#080a0c` |

- **A: canvas `.bg-2`, cards on `--bg-body`.** The Album example does this with `.bg-1`. Light mode is right. In dark mode the card (`#080a0c`) is darker than the canvas (`#171a1d`), so raised cards look sunken, because `body` is the darkest step in dark mode.
- **B: canvas on `--bg-body`, cards on `--bg-1`.** Inside a card, list group items and table cells show the canvas colour, while the card header, alert and pills track lose their tint and match the card. Dialogs, menus, popovers and toasts also paint `--bg-body`, so they take the canvas colour too.

B can be repaired by re-pointing component token maps through the entrypoint. This compiles with alpha.1:

```scss
@use 'bootstrap/scss/bootstrap' with (
  $theme-bgs: (
    'body': light-dark(var(--gray-050), var(--gray-975)),
    '1': light-dark(var(--white), var(--gray-950)),
  ),
  $card-tokens: (
    --card-bg: var(--bg-1),
  ),
  $list-group-tokens: (
    --list-group-bg: var(--bg-1),
  ),
  $table-tokens: (
    --table-bg: var(--bg-1),
  ),
  $dialog-tokens: (
    --dialog-bg: var(--bg-1),
  ),
  $menu-tokens: (
    --menu-bg: var(--bg-1),
  ),
  $popover-tokens: (
    --popover-bg: var(--bg-1),
  ),
  $toast-tokens: (
    --toast-bg: var(--bg-1),
  )
);
```

That still leaves card caps, alerts, the pills track and hover states on `--bg-1`, the same colour as the card, so they have to move down a step as well. Every new component then needs the same check.

Questions:

1. Is option A, the Album pattern, the intended way to build this layout, including how it looks in dark mode?
2. Would you consider a separate surface role, for example `"surface"` in `$theme-bgs` (`--bg-surface`), defaulting to `var(--bg-body)`? Card, list group, table, dialog, drawer, menu, popover and toast would read it instead of `--bg-body`. The default output would not change, and a tinted canvas would only need `--bg-body` changed, plus `--bg-surface` if the cards should differ from white.

Related: #42657 (keep `$theme-bgs` a linear scale) and #38733 (v5.3, where `$body-bg` also sets component backgrounds).

Snippet. Switch the OS or devtools colour scheme to see dark mode:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tinted canvas with raised cards</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@6.0.0-alpha.1/dist/css/bootstrap.min.css"
      integrity="sha384-B/GM4XqrwHnWXNOWMbloTmrYXZg10cakYGmpfsR/bbzQ6JAJI4ihuyADKLnBgrCe"
      crossorigin="anonymous"
    />
    <style>
      /* A: keep --bs-bg-body as the card surface and paint the canvas with a numbered step
       (what the Album example does with .bg-1) */
      /* B: make the canvas the body token and raise cards onto the next step */
      .option-b {
        --bs-bg-body: light-dark(var(--bs-gray-050), var(--bs-gray-975));
        --bs-bg-1: light-dark(var(--bs-white), var(--bs-gray-950));
      }
      .option-b .card {
        --bs-card-bg: var(--bs-bg-1);
      }
    </style>
  </head>
  <body>
    <div class="container-fluid">
      <div class="row">
        <div class="md:col-6 p-4 bg-2 option-a">
          <h2 class="h6">
            A: canvas <code>.bg-2</code>, card <code>--bs-bg-body</code>
          </h2>
          <div class="card">
            <div class="card-header">Card header</div>
            <div class="card-body vstack gap-3">
              <ul class="nav nav-pills">
                <li class="nav-item">
                  <a class="nav-link active" aria-current="page" href="#"
                    >Active</a
                  >
                </li>
                <li class="nav-item"><a class="nav-link" href="#">Link</a></li>
              </ul>
              <div class="alert" role="alert">An alert inside the card</div>
              <ul class="list-group">
                <li class="list-group-item">List group item</li>
              </ul>
              <table class="table mb-0">
                <tbody>
                  <tr>
                    <td>Table cell</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="md:col-6 p-4 bg-body option-b">
          <h2 class="h6">
            B: canvas <code>--bs-bg-body</code>, card <code>--bs-bg-1</code>
          </h2>
          <div class="card">
            <div class="card-header">Card header</div>
            <div class="card-body vstack gap-3">
              <ul class="nav nav-pills">
                <li class="nav-item">
                  <a class="nav-link active" aria-current="page" href="#"
                    >Active</a
                  >
                </li>
                <li class="nav-item"><a class="nav-link" href="#">Link</a></li>
              </ul>
              <div class="alert" role="alert">An alert inside the card</div>
              <ul class="list-group">
                <li class="list-group-item">List group item</li>
              </ul>
              <table class="table mb-0">
                <tbody>
                  <tr>
                    <td>Table cell</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
```
````

---

## Finding 3: `.prose` caps at 1000px and centres itself, undocumented

### Search log

- **Issues and PRs** (`gh search issues "<q>" --repo twbs/bootstrap --include-prs`)
  - No hits: `prose margin auto`, `prose centered`, `prose max-width`, `prose 1000px`, `prose width`, `prose margin-inline`.
  - `prose` (24 hits), `.prose class` and `not-prose` returned only these Prose threads:
    - [#41791](https://github.com/twbs/bootstrap/pull/41791) (merged): added `.prose`, already with `max-width: 1000px; margin-inline: auto`.
    - [#41934](https://github.com/twbs/bootstrap/pull/41934) (merged): moved Prose to flexbox and kept both lines.
    - [#42095](https://github.com/twbs/bootstrap/pull/42095) (merged): added `.not-prose`.
    - [#42338](https://github.com/twbs/bootstrap/pull/42338) (merged): a typo fix.
    - [#43146](https://github.com/twbs/bootstrap/pull/43146) (open): spacing for `blockquote` and `details`, and media aspect ratio. It does not touch the cap or the centring.
  - No comment on #41791, #41934 or #43146 mentions width, centring or margins.
- **PR searches:** `gh pr list --state all --search "prose"` found the same set.
- **Open PRs:** checked the changed files of every open PR. Only #43146 touches `scss/content/_prose.scss`, and none touch `prose.mdx`.
- **Discussions**
  - In the full v6 Feedback dump, the only `prose` match is a typo item in #42337, which is closed.
  - GraphQL search across all categories: `prose` and `prose centered` found only #42337, and `prose max-width` found nothing.
- **Docs evidence:**
  - `site/src/content/docs/content/prose.mdx` on `main` lists what `.prose` does under "How it works", and the width cap and centring are not on the list.
  - The page's own example markup is `<div class="prose border rounded-3 p-3 lg:p-5 max-w-100">`. It quietly undoes the cap.

### Draft issue

**Template:** Feature request

**Title:** Prose: document the 1000px cap and centring, or make them configurable

````markdown
### Prerequisites

- [ ] I have searched for duplicate or closed feature requests
- [ ] I have read the contributing guidelines

### Proposal

`.prose` caps its width at 1000px and centres itself. From `scss/content/_prose.scss` (6.0.0-alpha.1, unchanged on `main`):

```scss
@layer content {
  .prose {
    @include tokens($prose-tokens);
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--content-gap);
    max-width: 1000px;
    margin-inline: auto;
```

The "How it works" list on the Prose page doesn't mention this. In any parent wider than 1000px, the block moves to the middle. For a short piece of rendered Markdown under a heading in a list row, the excerpt starts `(row width − 1000px) / 2` to the right of the heading:

- 428px in a 1920px window;
- 108px at 1280px;
- nothing once the row's content box is 1000px or narrower (a window of about 1065px in this test case), so it's easy to miss during development.

The docs example adds `.max-w-100` to undo the cap, but doesn't say why.

Suggestions, smallest first:

1. **Docs.** Add "Limits the width to 1000px and centres the block with `margin-inline: auto`" to "How it works", and show `.max-w-100` as the way to opt out.
2. **Token.** Move the cap into `$prose-tokens`, e.g. `--content-max-width: 1000px`, and use `max-width: var(--content-max-width)`. Setting it to `none` gives the full width of the parent. The auto margins then have no effect, so the centring needs no separate switch.
3. **Modifier.** Keep `.prose` for typography only, and move the cap and centring into a modifier. This changes the default, so it is a call for the team.

### Motivation and context

`.prose` is the documented way to style Markdown and WYSIWYG output. That output often appears in narrow or inline places, such as feed items, comments and card bodies, and not only in a centred article column. Today, getting the typography without the layout means knowing about an undocumented rule and adding a utility to cancel it.

Reduced test case (view in a window wider than 1100px; the page logs the offset). Measured in Chromium 156 and Firefox 157:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>.prose centres itself in a wide parent</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@6.0.0-alpha.1/dist/css/bootstrap.min.css"
      integrity="sha384-B/GM4XqrwHnWXNOWMbloTmrYXZg10cakYGmpfsR/bbzQ6JAJI4ihuyADKLnBgrCe"
      crossorigin="anonymous"
    />
  </head>
  <body class="p-3">
    <!-- Short Markdown-rendered excerpts inside list rows. View in a window wider than 1100px. -->
    <ul class="list-group">
      <li class="list-group-item">
        <h3 class="h6 mb-1" id="title">Release notes</h3>
        <div class="prose" id="excerpt">
          <p>
            A short excerpt rendered from Markdown, with a <a href="#">link</a>.
          </p>
        </div>
      </li>
    </ul>
    <script>
      window.addEventListener('load', () => {
        const title = document.getElementById('title').getBoundingClientRect();
        const excerpt = document
          .getElementById('excerpt')
          .getBoundingClientRect();
        console.log(
          'heading left:',
          title.left,
          'excerpt left:',
          excerpt.left,
          'offset:',
          excerpt.left - title.left,
          'px',
        );
      });
    </script>
  </body>
</html>
```
````

---
