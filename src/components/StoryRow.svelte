<script lang="ts">
  import type { Story } from '../lib/types';
  import Icon from './Icon.svelte';
  import { formatRelative } from '../lib/format';
  import { isDemoFallback, storyRole } from '../lib/feeds';
  let {
    story,
    now,
    locale,
    compact = false,
  }: {
    story: Story;
    now: Date;
    locale: string;
    /** Summary rows drop the excerpt and use a smaller title. */
    compact?: boolean;
  } = $props();
</script>

<li class={`list-group-item px-0 ${compact ? 'py-3' : 'py-4'}`}>
  <!-- The rule repeats the publication in colour; the name beside it carries the meaning. -->
  <div class={`border-start border-3 border-${storyRole(story)} ps-4`}>
    <div
      class="d-flex flex-wrap align-items-center column-gap-3 row-gap-1 small mb-1"
    >
      <span class="fw-semibold">{story.publication}</span>
      {#if story.live}<span class="badge badge-outline theme-success">Live</span
        >{:else if isDemoFallback(story)}<span
          class="badge badge-outline theme-secondary">Demo</span
        >{/if}
      <time class="ms-auto fg-3" datetime={story.publishedAt}
        >{formatRelative(story.publishedAt, now, locale)}</time
      >
    </div>
    <!-- `.story-title` marks full Feeds rows; compact rows elsewhere use a smaller title. -->
    <h3 class={compact ? 'fs-md fw-semibold mb-0' : 'story-title mb-1'}>
      {#if story.url && story.live}<a
          class="icon-link"
          href={story.url}
          target="_blank"
          rel="noreferrer">{story.title}<Icon name="box-arrow-up-right" /></a
        >{:else}{story.title}{/if}
    </h3>
    {#if !compact && story.excerpt}<p class="story-excerpt fg-2 mb-0">
        {story.excerpt}
      </p>{/if}
  </div>
</li>
