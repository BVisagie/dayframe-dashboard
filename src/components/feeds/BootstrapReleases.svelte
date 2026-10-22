<script lang="ts">
  import type { SourceStatus, Story } from '../../lib/types';
  import Icon from '../Icon.svelte';
  import { formatDate } from '../../lib/format';
  import { isDemoFallback } from '../../lib/feeds';
  let {
    stories,
    status,
    locale,
    enabled,
    limit,
  }: {
    stories: Story[];
    status: SourceStatus;
    locale: string;
    /** Whether the Bootstrap category is turned on in Sources. */
    enabled: boolean;
    limit: number;
  } = $props();
  const title = 'Bootstrap blog and releases';
  const bundled = __STACK_VERSIONS__.bootstrap;
  const live = $derived(
    stories
      .filter((story) => story.live && story.category === 'bootstrap')
      .slice(0, limit),
  );
  // Live sources replace the demo Bootstrap stories, so their presence on a fresh
  // status means this is a replay or scenario rather than an empty live feed.
  const replay = $derived(stories.some(isDemoFallback));
  const failed = $derived(status !== 'fresh' && status !== 'loading');
  const showing = $derived(enabled && status !== 'loading' && live.length > 0);
  /** Release URLs end in their tag, which names the version without a "v". */
  function inUse(story: Story) {
    if (story.publication !== 'GitHub releases' || !story.url) return false;
    const tag = decodeURIComponent(story.url.split('/').pop() ?? '');
    return tag.replace(/^v/, '') === bundled;
  }
</script>

<section
  class="card card-subtle dashboard-panel"
  data-bs-component="card"
  aria-label={title}
>
  <!-- The primary tint marks the one live feed; the Live badge says so in words. -->
  <div
    class={`card-header flex-row align-items-center justify-content-between gap-3 ${showing ? 'theme-primary' : ''}`}
  >
    <h2 class="fs-lg fw-semibold m-0">{title}</h2>
    {#if showing && status === 'fresh'}<span
        class="badge badge-outline theme-success">Live</span
      >{/if}
  </div>
  {#if failed || !showing}<div class="card-body vstack gap-5">
      {#if failed}<div
          class="alert theme-warning mb-0"
          role="status"
          data-bs-component="alert"
        >
          <Icon name="exclamation-triangle" />
          <span
            >Bootstrap feeds could not refresh. {live.length
              ? 'These are the last saved posts and releases.'
              : 'Stories marked Demo stand in until they return.'}</span
          >
        </div>{/if}
      {#if !enabled}<p class="fg-2 mb-0">
          Turn on Bootstrap in Sources to follow its blog and releases.
        </p>
      {:else if status === 'loading'}<p class="visually-hidden" role="status">
          Loading Bootstrap posts and releases…
        </p>
        <div class="placeholder-glow vstack gap-5" aria-hidden="true">
          {#each ['col-9', 'col-7', 'col-8'] as width}<div>
              <span class={`placeholder d-block mb-2 ${width}`}></span>
              <span class="placeholder placeholder-sm d-block col-4"></span>
            </div>{/each}
        </div>
      {:else if !showing && !failed}<p class="fg-2 mb-0">
          {replay
            ? 'This replay uses demo stories, so live posts and releases are not loaded.'
            : 'The Bootstrap blog and GitHub returned no posts or releases.'}
        </p>{/if}
    </div>{/if}
  {#if showing}<div
      class="list-group list-group-flush"
      data-bs-component="list-group"
    >
      {#each live as story (story.id)}<a
          class="list-group-item list-group-item-action d-flex align-items-baseline gap-4"
          href={story.url}
          target="_blank"
          rel="noreferrer"
          ><span class="vstack min-w-0 gap-1">
            <span class="d-flex flex-wrap align-items-center gap-3">
              <span class="fw-semibold fg-primary">{story.title}</span>
              {#if inUse(story)}<span class="badge badge-subtle theme-primary"
                  >In use</span
                >{/if}
            </span>
            <span class="small fg-2">{story.publication}</span>
          </span>
          <time
            class="small fg-3 text-nowrap ms-auto"
            datetime={story.publishedAt}
            >{formatDate(story.publishedAt, locale, {
              day: 'numeric',
              month: 'short',
            })}</time
          ><Icon name="box-arrow-up-right" class="fg-2 align-self-center" /></a
        >{/each}
    </div>
  {/if}
</section>
