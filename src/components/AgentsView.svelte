<script lang="ts">
  import type { Agent } from '../lib/types';
  import AgentCard from './AgentCard.svelte';
  let {
    agents,
    now,
    dense = false,
    fill = false,
    locale = 'en',
  }: {
    agents: Agent[];
    now: Date;
    dense?: boolean;
    /** On desktop the two rows of three share the view's height. */
    fill?: boolean;
    locale?: string;
  } = $props();
</script>

<!-- Cards in a row share its height, so their footers line up. -->
<div
  class="grid gap-3"
  class:h-100={fill}
  style:--rows={fill ? Math.ceil(agents.length / 3) : null}
>
  {#each agents as agent (agent.id)}
    <AgentCard {agent} {now} {dense} {locale} />
  {/each}
</div>
