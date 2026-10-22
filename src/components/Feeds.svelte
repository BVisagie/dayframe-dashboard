<script lang="ts">
  import type { Story, Settings, SourceStatus } from '../lib/types';
  import Panel from './Panel.svelte';
  import Icon from './Icon.svelte';
  import { formatRelative } from '../lib/format';
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
  const filtered = $derived(
    stories.filter(
      (story) =>
        settings.categories.includes(story.category) &&
        (category === 'all' || story.category === category),
    ),
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
  function choose(value: string) {
    category = value;
    page = 0;
  }
</script>

<Panel title="Latest stories">
  <div
    class="d-flex flex-wrap gap-2 feed-categories mb-4"
    aria-label="Filter stories"
    data-bs-component="chip"
  >
    {#each ['all', ...settings.categories] as item}<button
        class={`chip ${category === item ? 'theme-primary active' : ''}`}
        aria-pressed={category === item}
        onclick={() => choose(item)}
        >{item.charAt(0).toUpperCase() + item.slice(1)}</button
      >{/each}
  </div>
  {#if status === 'loading'}<p
      class="fg-2 d-flex align-items-center gap-2"
      role="status"
    >
      <span
        class="spinner-border spinner-sm"
        aria-hidden="true"
        data-bs-component="spinner"
      ></span>
      Loading Bootstrap feeds…
    </p>
  {:else if status !== 'fresh'}<div class="alert theme-warning" role="status">
      Bootstrap feeds could not refresh. Showing cached headlines or labelled
      demo stories.
    </div>{/if}
  <ul class="list-group list-group-flush" data-bs-component="list-group">
    {#each filtered.slice(page * pageSize, (page + 1) * pageSize) as story (story.id)}<li
        class="list-group-item px-0 py-3"
      >
        <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
          <span
            class={`badge badge-subtle theme-${story.live ? 'primary' : 'secondary'}`}
            >{story.live ? 'Live' : 'Demo'}</span
          ><span class="small fg-2"
            >{story.publication} · {formatRelative(
              story.publishedAt,
              now,
              settings.locale,
            )}</span
          >
        </div>
        <h3 class="story-title mb-2">
          {#if story.url && story.live}<a
              class="icon-link"
              href={story.url}
              target="_blank"
              rel="noreferrer"
              >{story.title}<Icon name="box-arrow-up-right" /></a
            >{:else}{story.title}{/if}
        </h3>
        {#if story.excerpt}<p class="story-excerpt fg-2 mb-0">
            {story.excerpt}
          </p>{/if}
      </li>
    {:else}<li class="list-group-item px-0">
        <h3 class="h5">No stories in these categories</h3>
        <p>Choose a different category or enable more feeds in Settings.</p>
        <button
          class="btn btn-outline theme-secondary"
          onclick={() => {
            onchange({
              categories: ['bootstrap', 'technology', 'design', 'science'],
            });
            choose('all');
          }}>Show all categories</button
        >
      </li>{/each}
  </ul>
  <nav aria-label="Feed pages" class="mt-4" data-bs-component="pagination">
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
  </nav>
  <p class="source-credit small mt-3 mb-0">
    Bootstrap headlines link to the original posts and releases. Other
    publications are fictional. Blog content: <a
      href="https://creativecommons.org/licenses/by/3.0/"
      target="_blank"
      rel="noreferrer">CC BY 3.0</a
    >.
  </p>
</Panel>
