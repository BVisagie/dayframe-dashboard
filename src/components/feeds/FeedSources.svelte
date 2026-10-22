<script lang="ts">
  import type { Settings } from '../../lib/types';
  import Panel from '../Panel.svelte';
  import Icon from '../Icon.svelte';
  import { FEED_CATEGORIES, categoryLabel } from '../../lib/feeds';
  let {
    categories,
    onchange,
  }: {
    categories: string[];
    onchange: (patch: Partial<Settings>) => void;
  } = $props();
  function toggle(category: string) {
    const next = categories.includes(category)
      ? categories.filter((item) => item !== category)
      : [...categories, category];
    onchange({
      categories: FEED_CATEGORIES.filter((item) => next.includes(item)),
    });
  }
</script>

<Panel title="Sources" kind="quiet">
  <p class="small fg-2 mt-2 mb-4">Choose what appears here and on Summary.</p>
  <!-- Toggles stay tinted rather than solid so they read apart from the story filter;
       the check or plus icon gives the state a shape as well as a colour. -->
  <div class="d-flex flex-wrap gap-2" data-bs-component="chip">
    {#each FEED_CATEGORIES as category}{@const on =
        categories.includes(category)}<button
        class={`chip focus-ring ${on ? 'theme-primary' : ''}`}
        aria-pressed={on}
        onclick={() => toggle(category)}
        ><span class="chip-icon"
          ><Icon name={on ? 'check-lg' : 'plus-lg'} /></span
        >{categoryLabel(category)}<span class="visually-hidden"
          >{' stories'}</span
        ></button
      >{/each}
  </div>
  <p class="source-credit small mt-5 mb-0">
    Bootstrap headlines link to the original posts and releases. Other
    publications are fictional. Blog content: <a
      href="https://creativecommons.org/licenses/by/3.0/"
      target="_blank"
      rel="noreferrer">CC BY 3.0</a
    >.
  </p>
</Panel>
