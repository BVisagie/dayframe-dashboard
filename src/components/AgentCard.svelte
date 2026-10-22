<script lang="ts">
  import type { Agent } from '../lib/types';
  import Icon from './Icon.svelte';
  let {
    agent,
    compact = false,
    locale = 'en',
  }: { agent: Agent; compact?: boolean; locale?: string } = $props();
  const ratio = $derived(
    Math.min(100, Math.round((agent.used / agent.limit) * 100)),
  );
  const role = $derived(
    agent.status !== 'fresh'
      ? 'secondary'
      : ratio >= 90
        ? 'danger'
        : ratio >= 75
          ? 'warning'
          : 'success',
  );
  const status = $derived(
    agent.status === 'reconnect'
      ? 'Reconnect needed'
      : agent.status === 'offline'
        ? 'Offline'
        : agent.status === 'stale'
          ? 'Last known usage'
          : ratio >= 90
            ? 'Nearly exhausted'
            : ratio >= 75
              ? 'Running low'
              : 'Available',
  );
  const points = $derived(
    agent.history
      .map(
        (value, i) =>
          `${(i * 100) / Math.max(1, agent.history.length - 1)},${30 - value * 0.28}`,
      )
      .join(' '),
  );
</script>

<article
  class:card={!compact}
  class={`agent-panel theme-${agent.id} ${compact ? 'agent-row' : ''}`}
  data-bs-component={compact ? 'list-group' : 'card'}
  aria-label={`${agent.name} capacity`}
>
  <div class:card-body={!compact}>
    <div class="d-flex gap-3 align-items-center mb-2">
      <span
        class="avatar avatar-sm"
        data-bs-component="avatar"
        aria-hidden="true">{agent.initials}</span
      >
      <div class="flex-grow-1">
        <h3 class="agent-name m-0">{agent.name}</h3>
        {#if !compact}<span class="small fg-2">{agent.plan}</span>{/if}
      </div>
      <span class={`badge badge-subtle theme-${role}`} data-bs-component="badge"
        ><Icon name={agent.status === 'reconnect' ? 'plug' : 'circle-fill'} />
        {status}</span
      >
    </div>
    <div class="d-flex justify-content-between align-items-baseline gap-2 mb-2">
      <span class="quota-value"
        >{ratio}<span class="small fw-normal">% used</span></span
      >
      <span class="small fg-2"
        >{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
          Math.max(0, agent.limit - agent.used),
        )}
        {agent.unit} left</span
      >
    </div>
    <div
      class="progress"
      role="progressbar"
      aria-label={`${agent.name} usage`}
      aria-valuenow={ratio}
      aria-valuemin="0"
      aria-valuemax="100"
      data-bs-component="progress"
    >
      <div class={`progress-bar theme-${role}`} style:width={`${ratio}%`}></div>
    </div>
    {#if !compact}
      <div class="d-flex align-items-center justify-content-between gap-3 mt-3">
        <div class="small fg-2">
          {agent.window}<br />Resets {new Intl.DateTimeFormat(locale, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(agent.resetsAt))}
        </div>
        <svg
          class="sparkline"
          viewBox="0 0 100 32"
          role="img"
          aria-label={`${agent.name} simulated usage history`}
          ><polyline
            {points}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          /></svg
        >
      </div>
    {/if}
  </div>
</article>
