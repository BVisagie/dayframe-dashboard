<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    title,
    class: className = '',
    kind = 'card',
    hideTitle = false,
    children,
    action,
  }: {
    title: string;
    class?: string;
    /**
     * Three panel grades show hierarchy with Bootstrap's own card variants:
     * `hero` keeps its title inside the body, `card` is an instrument panel
     * with a header, and `quiet` is an outlined panel on the canvas with a
     * transparent header.
     */
    kind?: 'card' | 'hero' | 'quiet';
    /** Keeps the section named for assistive technology when its content says it. */
    hideTitle?: boolean;
    children: Snippet;
    action?: Snippet;
  } = $props();
</script>

<section
  class={`card dashboard-panel ${kind === 'quiet' ? 'bg-transparent shadow-none' : ''} ${className}`}
  data-bs-component="card"
  aria-label={title}
>
  {#if kind !== 'hero'}
    <!-- Instrument and quiet panels share one header geometry, so titles in a
         row line up; the quiet grade's header is transparent on the canvas. -->
    <div
      class={`card-header flex-row align-items-center justify-content-between gap-3 ${kind === 'quiet' ? 'bg-transparent' : ''}`}
    >
      <h2 class="fs-lg fw-medium m-0">{title}</h2>
      {#if action}{@render action()}{/if}
    </div>
    <div class="card-body">
      {@render children()}
    </div>
  {:else if hideTitle && !action}
    <div class="card-body">
      <h2 class="visually-hidden">{title}</h2>
      {@render children()}
    </div>
  {:else}
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between gap-3">
        <h2 class="fs-lg fw-medium m-0">
          {title}
        </h2>
        {#if action}{@render action()}{/if}
      </div>
      {@render children()}
    </div>
  {/if}
</section>
