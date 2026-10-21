<script lang="ts">
  import sprite from 'bootstrap-icons/bootstrap-icons.svg?url';
  let { name, class: className = '' }: { name: string; class?: string } =
    $props();
</script>

<svg
  class={`d-inline-block flex-shrink-0 align-text-bottom ${className}`}
  width="1em"
  height="1em"
  fill="currentColor"
  aria-hidden="true"><use href={`${sprite}#${name}`}></use></svg
>
