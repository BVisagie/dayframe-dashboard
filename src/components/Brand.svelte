<script lang="ts">
  let { class: className = '' }: { class?: string } = $props();
</script>

<!-- Bootstrap has no brand mark. Token fills let every theme recolour the tile,
     the letter and the horizon rule without a second asset. -->
<svg
  class={`flex-shrink-0 ${className}`}
  viewBox="0 0 64 64"
  aria-hidden="true"
  focusable="false"
>
  <rect width="64" height="64" rx="14" fill="var(--primary-bg)" />
  <path
    d="M16 17h17a15 15 0 0 1 0 30H16V17zm8 8v14h9a7 7 0 0 0 0-14h-9z"
    fill="var(--primary-contrast)"
  />
  <path
    d="M18 50h28"
    stroke="var(--accent-bg)"
    stroke-width="4"
    stroke-linecap="round"
  />
</svg>
