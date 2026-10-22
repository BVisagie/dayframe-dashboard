<script lang="ts">
  import type { Agent } from '../lib/types';
  import AgentCard from './AgentCard.svelte';
  let {
    agents,
    now,
    dense = false,
    locale = 'en',
  }: {
    agents: Agent[];
    now: Date;
    dense?: boolean;
    locale?: string;
  } = $props();
</script>

<!-- Cards in a row share its height, so their footers line up. -->
<div class="grid gap-3">
  {#each agents as agent (agent.id)}
    <AgentCard {agent} {now} {dense} {locale} />
  {/each}
</div>
