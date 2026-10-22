<script lang="ts">
  import type { Story } from '../lib/types';
  import { themes, getTheme } from '../themes/registry';
  import { settingsDialog, bootstrapDocs } from '../lib/bootstrap';
  import Icon from './Icon.svelte';
  let {
    stories,
    stack,
    appCssBytes,
    theme,
    locale,
    lens,
    onclose,
    onlens,
  }: {
    stories: Story[];
    stack: { bootstrap: string; svelte: string; vite: string };
    appCssBytes: number;
    theme: string;
    locale: string;
    lens: boolean;
    onclose: () => void;
    onlens: () => void;
  } = $props();
  const small = matchMedia('(max-width: 43rem)').matches;
  // Keys are `data-bs-component` names, so the inventory and the lens share
  // one documentation map.
  const inventory = [
    {
      title: 'JavaScript plugins',
      components: {
        combobox: 'Combobox',
        datepicker: 'Datepicker',
        dialog: 'Dialog',
        drawer: 'Drawer',
        menu: 'Menu',
        'nav-overflow': 'Nav overflow',
        popover: 'Popover',
        range: 'Range',
        tab: 'Tab',
        toast: 'Toast',
        tooltip: 'Tooltip',
      },
    },
    {
      title: 'CSS components',
      components: {
        alert: 'Alert',
        avatar: 'Avatar',
        badge: 'Badge',
        'button-group': 'Button group',
        card: 'Card',
        check: 'Checkbox',
        chip: 'Chip',
        'form-field': 'Form field',
        'input-group': 'Input group',
        'list-group': 'List group',
        nav: 'Nav',
        navbar: 'Navbar',
        pagination: 'Pagination',
        placeholder: 'Placeholder',
        progress: 'Progress',
        spinner: 'Spinner',
        switch: 'Switch',
        table: 'Table',
      },
    },
  ];
</script>

<dialog
  use:settingsDialog
  {onclose}
  aria-labelledby="about-title"
  style="--dialog-width: 46rem"
>
  <div class={small ? 'drawer-header' : 'dialog-header'}>
    <h2 class="h4 m-0" id="about-title">Bootstrap, at work</h2>
    <button
      class="btn btn-text theme-secondary ms-auto"
      data-bs-dismiss={small ? 'drawer' : 'dialog'}
      aria-label="Close about"><Icon name="x-lg" /></button
    >
  </div>
  <div class={small ? 'drawer-body' : 'dialog-body'}>
    <div class="vstack gap-8">
      <p class="fs-lg m-0">
        Built with Bootstrap <strong>{stack.bootstrap}</strong>, Svelte {stack.svelte}
        and Vite {stack.vite}.
      </p>
      <section class="vstack gap-5" aria-labelledby="about-components">
        <div class="vstack gap-1">
          <h3 class="fs-md fw-semibold m-0" id="about-components">
            Components in use
          </h3>
          <p class="fg-2 m-0">
            Each is Bootstrap’s own markup, and each name opens its
            documentation.
          </p>
        </div>
        {#each inventory as group (group.title)}<div class="vstack gap-3">
            <h4 class="small fw-semibold fg-2 m-0">{group.title}</h4>
            <ul class="list-unstyled d-flex flex-wrap gap-2 m-0">
              {#each Object.entries(group.components) as [id, name] (id)}<li>
                  <a
                    class="badge badge-outline theme-secondary focus-ring"
                    href={bootstrapDocs(id)}
                    target="_blank"
                    rel="noreferrer">{name}</a
                  >
                </li>{/each}
            </ul>
          </div>{/each}
        <div class="d-flex flex-wrap align-items-center gap-4">
          <button
            class="btn btn-outline theme-primary"
            data-bs-dismiss={small ? 'drawer' : 'dialog'}
            onclick={onlens}
            >{lens ? 'Turn off' : 'Turn on'} Bootstrap lens</button
          >
          <span class="small fg-2"
            >Outlines each component on the dashboard with a link to its
            documentation.</span
          >
        </div>
      </section>
      <section class="vstack gap-4" aria-labelledby="about-themes">
        <h3 class="fs-md fw-semibold m-0" id="about-themes">
          Themes and app CSS
        </h3>
        <div class="prose m-0">
          <p>
            Themes recolour Bootstrap’s tokens and roles. Custom app CSS covers
            dashboard composition, calendar geometry and the inspection lens.
          </p>
        </div>
        <dl class="grid gap-3 m-0">
          <dt class="g-col-12 sm:g-col-4 fw-semibold">Current theme</dt>
          <dd class="g-col-12 sm:g-col-8 m-0">
            {getTheme(theme).name}. {themes.length} themes discovered automatically.
          </dd>
          <dt class="g-col-12 sm:g-col-4 fw-semibold">App-layer SCSS source</dt>
          <dd class="g-col-12 sm:g-col-8 m-0">
            {appCssBytes.toLocaleString(locale)} bytes before compression. Every build
            records the raw and gzip footprint.
          </dd>
        </dl>
      </section>
      <section class="vstack gap-3" aria-labelledby="about-headlines">
        <h3 class="fs-md fw-semibold m-0" id="about-headlines">
          Recent Bootstrap headlines
        </h3>
        <ul class="vstack gap-2 m-0">
          {#each stories
            .filter((story) => story.category === 'bootstrap')
            .slice(0, 4) as story}<li>
              {#if story.live && story.url}<a
                  href={story.url}
                  target="_blank"
                  rel="noreferrer">{story.title}</a
                >{:else}{story.title}
                <span class="small fg-2">(demo)</span>{/if}
            </li>{/each}
        </ul>
      </section>
      <div class="d-flex flex-wrap gap-5 small border-top pt-5">
        <a
          href="https://getbootstrap.com/docs/6.0/"
          target="_blank"
          rel="noreferrer">Bootstrap documentation</a
        >
        <a
          href={`${import.meta.env.BASE_URL}third-party-notices.txt`}
          target="_blank"
          rel="noreferrer">Third-party notices</a
        >
      </div>
    </div>
  </div>
</dialog>
