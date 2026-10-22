<script lang="ts">
  import type { Agent } from '../lib/types';
  import {
    capacityRole,
    conditionCue,
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
  // The headline must agree with the status badge, so it reads the tightest
  // shared window rather than the plan's named main allowance.
  const limiting = $derived(limitingAllowance(agent));
  const primary = $derived(primaryAllowance(agent));
  const cue = $derived(conditionCue(agent));
  // A graded card already carries the role's tint, so its badge turns solid to stay distinct.
  const badgeClass = $derived(
    `badge ${cue.graded ? '' : 'badge-subtle'} theme-${cue.role} flex-shrink-0`,
  );
</script>

{#snippet avatar(size: string)}<span
    class={`avatar ${size} theme-${agent.id} flex-shrink-0`}
    data-bs-component="avatar"
    aria-hidden="true"
    >{agent.initials}<span class={`avatar-status status-${cue.presence}`}
    ></span></span
  >{/snippet}

{#snippet badge()}<span class={badgeClass} data-bs-component="badge"
    ><Icon name={cue.icon} />{cue.label}</span
  >{/snippet}

{#snippet reading(size: string)}<span
    class={`quota-value fw-semibold lh-1 tabular-nums ${size}`}
    ><span class="font-monospace"
      >{formatNumber(limiting.remainingPercent, locale)}%</span
    ><span class={compact || dense ? 'small fw-normal' : 'fs-md fw-normal'}
      >{' left'}</span
    ></span
  >{/snippet}

{#snippet resets()}{limiting.label} resets in
  <time datetime={limiting.resetsAt}
    >{formatCountdown(limiting.resetsAt, now, locale)}</time
  >{/snippet}

{#if compact}
  <article class="py-2" aria-label={`${agent.name} capacity`}>
    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      {@render avatar('avatar-sm')}
      <h3 class="fs-md fw-semibold m-0 me-auto">{agent.name}</h3>
      {@render badge()}
    </div>
    <div
      class="d-flex flex-wrap align-items-baseline justify-content-between column-gap-3 mb-2"
    >
      {@render reading('fs-md')}
      <span class="small fg-2">{@render resets()}</span>
    </div>
    <div
      class="progress"
      style="--progress-height: 0.375rem"
      role="progressbar"
      aria-label={`${agent.name} ${limiting.label} remaining`}
      aria-valuenow={limiting.remainingPercent}
      aria-valuemin="0"
      aria-valuemax="100"
      data-bs-component="progress"
    >
      <div
        class={`progress-bar theme-${cue.role}`}
        style:width={`${limiting.remainingPercent}%`}
      ></div>
    </div>
  </article>
{:else}
  <article
    class={`card ${cue.graded ? `card-subtle theme-${cue.role}` : ''} g-col-12 md:g-col-6 lg:g-col-4`}
    data-bs-component="card"
    aria-label={`${agent.name} capacity`}
    style:--card-spacer-y={dense ? '0.75rem' : null}
    style:--card-cap-padding-y={dense ? '0.375rem' : null}
    style:--card-body-gap={dense ? '0.375rem' : null}
  >
    <div class="card-header flex-row align-items-center gap-3">
      {@render avatar(dense ? 'avatar-sm' : '')}
      <div
        class={`flex-grow-1 min-w-0 ${dense ? 'd-flex flex-wrap align-items-baseline column-gap-2' : ''}`}
      >
        <h3 class="fs-md fw-semibold lh-sm m-0">{agent.name}</h3>
        <p class="small fg-2 m-0">{agent.plan}</p>
      </div>
      {@render badge()}
    </div>
    <div class="card-body">
      <div
        class={dense
          ? 'd-flex flex-wrap align-items-baseline justify-content-between column-gap-3'
          : ''}
      >
        {@render reading(dense ? 'text-xl' : 'text-3xl')}
        <!-- Dense cards drop the main-allowance line; its bar sits just below. -->
        <p class={`small fg-2 m-0 ${dense ? 'text-end' : 'mt-2'}`}>
          {@render resets()}{#if !dense && primary.id !== limiting.id}<span
              class="d-block"
              >{primary.label} has {formatNumber(
                primary.remainingPercent,
                locale,
              )}% left</span
            >{/if}
        </p>
      </div>
      {#each agent.allowances as allowance (allowance.id)}
        <div>
          <div class="d-flex flex-wrap align-items-baseline column-gap-2 small mb-1">
            <span class="me-auto">{allowance.label}</span>
            <time class="fg-2" datetime={allowance.resetsAt}
              >Resets in {formatCountdown(allowance.resetsAt, now, locale)}</time
            >
            <span class="fw-semibold tabular-nums"
              >{formatNumber(allowance.remainingPercent, locale)}%</span
            >
          </div>
          <div
            class="progress"
            style="--progress-height: 0.5rem"
            role="progressbar"
            aria-label={`${agent.name} ${allowance.label} remaining`}
            aria-valuenow={allowance.remainingPercent}
            aria-valuemin="0"
            aria-valuemax="100"
            data-bs-component="progress"
          >
            <div
              class={`progress-bar theme-${capacityRole(allowance.remainingPercent, agent.status)}`}
              style:width={`${allowance.remainingPercent}%`}
            ></div>
          </div>
        </div>
      {/each}
    </div>
    <div
      class="card-footer fg-2 small d-flex flex-wrap justify-content-between column-gap-3"
    >
      <time datetime={agent.updatedAt}
        >Updated {formatRelative(agent.updatedAt, now, locale)}</time
      >
      {#if agent.resetCredits !== undefined}<span
          >Reset credits <strong class="tabular-nums"
            >{formatNumber(agent.resetCredits, locale)}</strong
          ></span
        >{/if}
    </div>
  </article>
{/if}
