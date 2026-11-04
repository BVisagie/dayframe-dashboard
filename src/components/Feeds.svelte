<script lang="ts">
  import type { Story, Settings, SourceStatus } from '../lib/types';
  import Panel from './Panel.svelte';
  import Icon from './Icon.svelte';
  import StoryRow from './StoryRow.svelte';
  import BootstrapReleases from './feeds/BootstrapReleases.svelte';
  import { fitRows } from '../lib/fit';
  import { FEED_CATEGORIES, categoryLabel } from '../lib/feeds';
  let {
    stories,
    settings,
    now,
    status,
    onchange,
    onsources,
    compact = false,
    fill = false,
  }: {
    stories: Story[];
    settings: Settings;
    now: Date;
    status: SourceStatus;
    onchange: (patch: Partial<Settings>) => void;
    /** Opens Settings at Feeds, where sources are chosen. */
    onsources: () => void;
    compact?: boolean;
    /** On desktop the story list shows as many rows as the panel fits. */
    fill?: boolean;
  } = $props();
  let category = $state('all');
  let page = $state(0);
  const enabled = $derived(
    FEED_CATEGORIES.filter((item) => settings.categories.includes(item)),
  );
  // Live Bootstrap items lead the rail, so the list stays newest first rather
  // than repeating them at the top of its first page.
  const filtered = $derived(
    stories
      .filter(
        (story) =>
          settings.categories.includes(story.category) &&
          (category === 'all' || story.category === category),
      )
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
  );
  // A fitted page renders a generous window and hides what does not fit;
  // the fitted count then sets the page stride.
  const WINDOW = 12;
  let fitted = $state(4);
  const pageSize = $derived(fill ? Math.max(1, fitted) : compact ? 2 : 4);
  const shown = $derived(
    filtered.slice(
      page * pageSize,
      page * pageSize + (fill ? WINDOW : pageSize),
    ),
  );
  // The last page can fit everything it has, which says nothing about how
  // many rows the panel holds, so only a hidden row or a full window counts.
  function measured(count: number) {
    if (count < shown.length || count === WINDOW || count > fitted)
      fitted = count;
  }
  const pageCount = $derived(
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  // Bootstrap supplies Pagination styling; the app windows its data-backed pages.
  const pages = $derived.by(() => {
    const indices = [...new Set([0, page - 1, page, page + 1, pageCount - 1])]
      .filter((index) => index >= 0 && index < pageCount)
      .sort((a, b) => a - b);
    const window: (number | string)[] = [];
    for (const [position, index] of indices.entries()) {
      if (position > 0 && index - indices[position - 1] > 1)
        window.push(`gap-${index}`);
      window.push(index);
    }
    return window;
  });
  $effect(() => {
    if (page >= pageCount) page = pageCount - 1;
  });
  // A filter for a source that was just turned off would hide every story.
  $effect(() => {
    if (category !== 'all' && !settings.categories.includes(category))
      choose('all');
  });
  function choose(value: string) {
    category = value;
    page = 0;
  }
</script>

<div class="grid" class:h-100={fill}>
  <!-- The story list fills its column on desktop; the rail keeps its own height. -->
  <Panel
    title="Latest stories"
    class={`g-col-12 lg:g-col-8 ${fill ? '' : 'align-self-start'}`}
  >
    {#snippet action()}<button
        class="btn btn-text theme-secondary btn-sm"
        onclick={onsources}><Icon name="sliders" /> Manage sources</button
      >{/snippet}
    {#if enabled.length}<div
        class="d-flex flex-wrap gap-2 feed-categories mb-2"
        role="group"
        aria-label="Filter stories"
        data-bs-component="chip"
      >
        <!-- Forced colours drop the active fill, so the check keeps the choice visible. -->
        {#each ['all', ...enabled] as item}<button
            class={`chip focus-ring ${category === item ? 'theme-primary active' : ''}`}
            aria-pressed={category === item}
            onclick={() => choose(item)}
            >{#if category === item}<span class="chip-icon"
                ><Icon name="check-lg" /></span
              >{/if}{categoryLabel(item)}</button
          >{/each}
      </div>{/if}
    <ul
      class="list-group list-group-flush"
      class:fit-rows={fill && filtered.length > 0}
      data-bs-component="list-group"
      use:fitRows={{ enabled: fill && filtered.length > 0, onfit: measured }}
    >
      {#each shown as story (story.id)}<StoryRow
          {story}
          {now}
          locale={settings.locale}
        />
      {:else}<li class="list-group-item px-0 pt-0 pb-2">
          <h3 class="h5">No stories in these categories</h3>
          <p class="fg-2">
            {settings.categories.length
              ? 'Nothing has been published in this category yet.'
              : 'All four sources are turned off.'}
          </p>
          <button
            class="btn btn-outline theme-secondary"
            onclick={() => {
              onchange({ categories: [...FEED_CATEGORIES] });
              choose('all');
            }}>Show all categories</button
          >
        </li>{/each}
    </ul>
    {#if filtered.length}<nav
        aria-label="Feed pages"
        data-bs-component="pagination"
      >
        <ul class="pagination pagination-sm m-0">
          <li class="page-item" class:disabled={page === 0}>
            <button
              class="page-link"
              disabled={page === 0}
              onclick={() => page--}
              aria-label="Previous"><Icon name="chevron-left" /></button
            >
          </li>
          {#each pages as index (index)}
            {#if typeof index === 'string'}<li
                class="page-item disabled"
                aria-hidden="true"
              >
                <span class="page-link">…</span>
              </li>
            {:else}<li class:active={page === index} class="page-item">
                <button
                  class="page-link"
                  aria-current={page === index ? 'page' : undefined}
                  aria-label={`Page ${index + 1}`}
                  onclick={() => (page = index)}>{index + 1}</button
                >
              </li>{/if}
          {/each}
          <li class="page-item" class:disabled={page + 1 >= pageCount}>
            <button
              class="page-link"
              disabled={page + 1 >= pageCount}
              onclick={() => page++}
              aria-label="Next"><Icon name="chevron-right" /></button
            >
          </li>
        </ul>
      </nav>{/if}
  </Panel>
  <div class="g-col-12 lg:g-col-4 align-self-start vstack gap-7">
    <BootstrapReleases
      {stories}
      {status}
      locale={settings.locale}
      enabled={settings.categories.includes('bootstrap')}
      limit={compact ? 3 : 5}
    />
  </div>
</div>
