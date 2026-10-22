<script lang="ts">
  import type { Agent } from '../lib/types';
  import {
    capacityRole,
    limitingAllowance,
    primaryAllowance,
  } from '../lib/agents';
  import { formatCountdown, formatNumber, formatRelative } from '../lib/format';
  import Icon from './Icon.svelte';
  let {
    agent,
    now,
    compact = false,
    dense = false,
    locale = 'en',
  }: {
    agent: Agent;
    now: Date;
    compact?: boolean;
    dense?: boolean;
    locale?: string;
  } = $props();
  const limiting = $derived(limitingAllowance(agent));
  const reading = $derived(compact ? limiting : primaryAllowance(agent));
  const role = $derived(capacityRole(limiting.remainingPercent, agent.status));
  const status = $derived(
    agent.status === 'reconnect'
      ? 'Reconnect needed'
      : agent.status === 'offline'
        ? 'Offline'
        : agent.status === 'stale'
          ? 'Last known usage'
          : limiting.remainingPercent <= 10
            ? 'Nearly exhausted'
            : limiting.remainingPercent <= 25
              ? 'Running low'
              : 'Available',
  );
</script>

<article
  class:card={!compact}
  class:agent-dense={dense}
  class={`agent-panel theme-${agent.id} ${compact ? 'agent-row' : 'g-col-12 md:g-col-6 lg:g-col-4'}`}
  data-bs-component={compact ? 'list-group' : 'card'}
  aria-label={`${agent.name} capacity`}
>
  <div class:card-body={!compact} class:py-2={dense} class="d-flex flex-column">
    <div class={`d-flex gap-2 align-items-center ${dense ? 'mb-1' : 'mb-2'}`}>
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
    <div
      class={`d-flex justify-content-between align-items-baseline gap-2 ${dense ? 'mb-1' : 'mb-2'}`}
    >
      <span class="quota-value"
        >{formatNumber(reading.remainingPercent, locale)}<span
          class="small fw-normal">% left</span
        ></span
      >
      <span class="small fg-2">{reading.label}</span>
    </div>
    {#if compact}
      <div
        class="progress"
        role="progressbar"
        aria-label={`${agent.name} ${reading.label} remaining`}
        aria-valuenow={reading.remainingPercent}
        aria-valuemin="0"
        aria-valuemax="100"
        data-bs-component="progress"
      >
        <div
          class={`progress-bar theme-${role}`}
          style:width={`${reading.remainingPercent}%`}
        ></div>
      </div>
    {:else}
      <div
        class={dense ? 'd-flex flex-column gap-1' : 'd-flex flex-column gap-3'}
      >
        {#each agent.allowances as allowance (allowance.id)}
          {@const allowanceRole = capacityRole(
            allowance.remainingPercent,
            agent.status,
          )}
          <div>
            <div class="d-flex flex-wrap align-items-baseline gap-2 mb-1">
              <span class="small">{allowance.label}</span>
              {#if dense}<time
                  class="small fg-2 ms-auto"
                  datetime={allowance.resetsAt}
                  >Resets in {formatCountdown(
                    allowance.resetsAt,
                    now,
                    locale,
                  )}</time
                >{/if}
              <span class={`small fw-semibold ${dense ? '' : 'ms-auto'}`}
                >{formatNumber(allowance.remainingPercent, locale)}%</span
              >
            </div>
            <div
              class="progress"
              role="progressbar"
              aria-label={`${agent.name} ${allowance.label} remaining`}
              aria-valuenow={allowance.remainingPercent}
              aria-valuemin="0"
              aria-valuemax="100"
              data-bs-component="progress"
            >
              <div
                class={`progress-bar theme-${allowanceRole}`}
                style:width={`${allowance.remainingPercent}%`}
              ></div>
            </div>
            {#if !dense}<time
                class="d-block small fg-2 mt-1"
                datetime={allowance.resetsAt}
                >Resets in {formatCountdown(
                  allowance.resetsAt,
                  now,
                  locale,
                )}</time
              >{/if}
          </div>
        {/each}
      </div>
      <div
        class={`d-flex flex-wrap justify-content-between gap-2 small fg-2 ${dense ? 'pt-1' : 'pt-2'}`}
      >
        <time datetime={agent.updatedAt}
          >Updated {formatRelative(agent.updatedAt, now, locale)}</time
        >
        {#if agent.resetCredits !== undefined}<span
            >Reset credits <strong
              >{formatNumber(agent.resetCredits, locale)}</strong
            ></span
          >{/if}
      </div>
    {/if}
  </div>
</article>
