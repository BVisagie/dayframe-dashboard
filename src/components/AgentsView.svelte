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

<div class="grid agents-grid gap-3 align-items-start">
  {#each agents as agent (agent.id)}
    <AgentCard {agent} {now} {dense} {locale} />
  {/each}
</div>
