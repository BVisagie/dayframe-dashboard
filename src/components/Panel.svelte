<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    title,
    class: className = '',
    children,
    action,
  }: {
    title: string;
    class?: string;
    children: Snippet;
    action?: Snippet;
  } = $props();
</script>

<section
  class={`card dashboard-panel ${className}`}
  data-bs-component="card"
  aria-label={title}
>
  <div class="card-body">
    <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
      <h2 class="panel-title m-0">{title}</h2>
      {#if action}{@render action()}{/if}
    </div>
    {@render children()}
  </div>
</section>
