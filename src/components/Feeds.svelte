<script lang="ts">
  import type { Story, Settings, SourceStatus } from '../lib/types';
  import Panel from './Panel.svelte';
  import Icon from './Icon.svelte';
  import StoryRow from './StoryRow.svelte';
  import BootstrapReleases from './feeds/BootstrapReleases.svelte';
  import FeedSources from './feeds/FeedSources.svelte';
  import { FEED_CATEGORIES, categoryLabel } from '../lib/feeds';
  let {
    stories,
    settings,
    now,
    status,
    onchange,
    compact = false,
  }: {
    stories: Story[];
    settings: Settings;
    now: Date;
    status: SourceStatus;
    onchange: (patch: Partial<Settings>) => void;
    compact?: boolean;
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
  const pageSize = $derived(compact ? 2 : 4);
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

<div class="grid">
  <!-- Each column keeps its own height so neither panel grows an empty foot. -->
  <Panel title="Latest stories" class="g-col-12 lg:g-col-8 align-self-start">
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
    <ul class="list-group list-group-flush" data-bs-component="list-group">
      {#each filtered.slice(page * pageSize, (page + 1) * pageSize) as story (story.id)}<StoryRow
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
        class="mt-4"
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
    <FeedSources categories={settings.categories} {onchange} />
  </div>
</div>
