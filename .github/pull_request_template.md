Describe the concrete problem and resulting behaviour. Include a fixed-clock
example when the change affects simulation or visual states.

Bootstrap-first review:

- [ ] Does a Bootstrap component, plugin, utility or token already cover this?
- [ ] Does every new custom rule explain what Bootstrap lacks, with the gap
      recorded in `docs/bootstrap-log.md`?

Acceptance:

- [ ] `npm run check`, `npm test`, `npm run build` and all relevant
      `npm run test:browser` projects pass.
- [ ] Routine CI passes. For a Bootstrap upgrade or substantial theme change,
      manual CI with `full_suite` enabled also passes after those changes.
- [ ] The pinned Playwright container covers functional tests and intended
      screenshot changes. List changed baselines and why below.
- [ ] Keyboard focus, WCAG 2.2 AA contrast, reduced motion and forced colours
      remain correct in every supported scheme and standard viewport.
- [ ] The trusted full-history secret scan passes. Tracked content, commits
      and PR text contain no private credentials, private contact details or
      addresses, home-directory paths, private hostnames, private account or
      project IDs, or private repository references. Public credits, attribution
      and legal notices are allowed; simulated people, organisations and places
      remain invented.
- [ ] The site remains static, uses simulated account/calendar data, bundles
      assets locally, and adds no unapproved browser request origin.
- [ ] The roadmap feature map, Bootstrap log and theme documentation reflect
      the final change. A Bootstrap pin change has a dedicated upgrade PR.

Validation and changed screenshot baselines:

<!-- Describe results, material limitations and each intended baseline change. -->
