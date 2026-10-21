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
  {#if status !== 'fresh'}<div class="alert theme-warning" role="status">
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
        {#if story.excerpt}<p
            class="prose story-excerpt fg-2 mb-0"
            data-bs-component="prose"
          >
            {story.excerpt}
          </p>{/if}
      </li>
    {:else}<li class="list-group-item px-0">
        <h3 class="h5">No stories in these categories</h3>
        <p>Choose a different category or enable more feeds in Settings.</p>
        <button
          class="btn btn-outline"
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
    <ul class="pagination m-0">
      <li class="page-item">
        <button class="page-link" disabled={page === 0} onclick={() => page--}
          >Previous</button
        >
      </li>
      {#each Array.from({ length: pageCount }, (_, i) => i) as index}<li
          class:active={page === index}
          class="page-item"
        >
          <button
            class="page-link"
            aria-current={page === index ? 'page' : undefined}
            aria-label={`Page ${index + 1}`}
            onclick={() => (page = index)}>{index + 1}</button
          >
        </li>{/each}
      <li class="page-item">
        <button
          class="page-link"
          disabled={page + 1 >= pageCount}
          onclick={() => page++}>Next</button
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
