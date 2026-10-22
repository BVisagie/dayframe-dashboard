<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    title,
    class: className = '',
    kind = 'card',
    children,
    action,
  }: {
    title: string;
    class?: string;
    /**
     * Three panel grades show hierarchy with Bootstrap's own card variants:
     * `hero` keeps its title inside the body, `card` is an instrument panel
     * with a header, and `quiet` is an outlined panel on the canvas.
     */
    kind?: 'card' | 'hero' | 'quiet';
    children: Snippet;
    action?: Snippet;
  } = $props();
</script>

<section
  class={`card dashboard-panel ${kind === 'quiet' ? 'bg-transparent shadow-none' : ''} ${className}`}
  data-bs-component="card"
  aria-label={title}
>
  {#if kind === 'card'}
    <div
      class="card-header flex-row align-items-center justify-content-between gap-3"
    >
      <h2 class="fs-lg fw-semibold m-0">{title}</h2>
      {#if action}{@render action()}{/if}
    </div>
    <div class="card-body">
      {@render children()}
    </div>
  {:else}
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between gap-3">
        <h2 class={`${kind === 'hero' ? 'fs-lg' : 'fs-md'} fw-semibold m-0`}>
          {title}
        </h2>
        {#if action}{@render action()}{/if}
      </div>
      {@render children()}
    </div>
  {/if}
</section>
