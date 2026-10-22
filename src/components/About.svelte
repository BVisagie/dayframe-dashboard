<script lang="ts">
  import type { Story } from '../lib/types';
  import { themes, getTheme } from '../themes/registry';
  import { settingsDialog } from '../lib/bootstrap';
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
      class="btn btn-text theme-secondary"
      data-bs-dismiss={small ? 'drawer' : 'dialog'}
      aria-label="Close about"><Icon name="x-lg" /></button
    >
  </div>
  <div class={small ? 'drawer-body prose' : 'dialog-body prose'}>
    <p class="fs-lg">
      Built with Bootstrap <strong>{stack.bootstrap}</strong>, Svelte {stack.svelte}
      and Vite {stack.vite}.
    </p>
    <p>
      Cards, nav overflow, progress, badges, avatars, lists, tables, menus,
      datepicker, popovers, tooltips, dialogs, drawers, tabs, combobox, range
      and toasts all use Bootstrap’s components and JavaScript.
    </p>
    <p>
      Themes recolour Bootstrap’s tokens and roles. Custom app CSS covers
      dashboard composition, calendar geometry and the inspection lens.
    </p>
    <p>
      <strong>App-layer SCSS source:</strong>
      {appCssBytes.toLocaleString(locale)} bytes before compression. Every build records
      the raw and gzip footprint.
    </p>
    <p>
      <strong>Current theme:</strong>
      {getTheme(theme).name}. {themes.length} themes discovered automatically.
    </p>
    <button
      class="btn btn-outline theme-primary mb-3"
      data-bs-dismiss={small ? 'drawer' : 'dialog'}
      onclick={onlens}>{lens ? 'Turn off' : 'Turn on'} Bootstrap lens</button
    >
    <h3 class="h5">Recent Bootstrap headlines</h3>
    <ul>
      {#each stories
        .filter((story) => story.category === 'bootstrap')
        .slice(0, 4) as story}<li>
          {#if story.live && story.url}<a
              href={story.url}
              target="_blank"
              rel="noreferrer">{story.title}</a
            >{:else}{story.title} <span class="small">(demo)</span>{/if}
        </li>{/each}
    </ul>
    <p class="small">
      <a
        href="https://getbootstrap.com/docs/6.0/"
        target="_blank"
        rel="noreferrer">Bootstrap documentation</a
      >
      ·
      <a
        href={`${import.meta.env.BASE_URL}third-party-notices.txt`}
        target="_blank"
        rel="noreferrer">Third-party notices</a
      >
    </p>
  </div>
</dialog>
