<script lang="ts">
  import type { CalendarEvent } from '../lib/types';
  import { popover } from '../lib/bootstrap';
  import { calendarRole, sortForDay } from '../lib/calendar';
  import Icon from './Icon.svelte';
  let {
    events,
    locale,
    hourCycle = 'locale',
    max = 4,
    compact = false,
    onmore,
  }: {
    events: CalendarEvent[];
    locale: string;
    hourCycle?: 'locale' | 'h12' | 'h23';
    max?: number;
    compact?: boolean;
    onmore?: () => void;
  } = $props();
  const ordered = $derived(sortForDay(events));
  function time(value: string) {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      ...(hourCycle === 'locale' ? {} : { hourCycle }),
    }).format(new Date(value));
  }
</script>

<ul
  class="list-group list-group-flush agenda-list"
  data-bs-component="list-group"
>
  {#each ordered.slice(0, max) as event (event.id)}
    <li class="list-group-item px-0">
      <div
        class={`d-flex gap-3 border-start border-3 border-${calendarRole(event.calendar)} ps-3`}
      >
        <p class="w-4 flex-shrink-0 small tabular-nums m-0">
          {#if event.allDay}All day{:else}<time datetime={event.start}
              >{time(event.start)}</time
            >{#if !compact}<time class="d-block fg-2" datetime={event.end}
                ><span class="visually-hidden">until</span>
                {time(event.end)}</time
              >{/if}{/if}
        </p>
        <div class="flex-grow-1 min-w-0">
          <button
            class="btn btn-link p-0 text-start fw-semibold"
            use:popover={{
              title: event.title,
              content: `${event.description} ${event.location}. ${event.attendees.join(', ')}`,
              trigger: 'click',
              placement: 'auto',
              container: 'body',
            }}
            data-bs-component="popover"
            aria-label={`Details for ${event.title}`}>{event.title}</button
          >
          <p class="small fg-2 m-0 d-flex flex-wrap column-gap-3">
            <span
              >{event.calendar}<span class="visually-hidden"
                >{' calendar,'}</span
              ></span
            >{#if !compact}<span
                ><Icon name="geo-alt" class="me-1" />{event.location}</span
              >{/if}
          </p>
        </div>
      </div>
    </li>
  {:else}<li class="list-group-item px-0 fg-2">
      No events on this date. Choose another day to see its agenda.
    </li>{/each}
</ul>
{#if events.length > max}<button class="btn btn-link px-0 mt-2" onclick={onmore}
    >+{events.length - max} more {events.length - max === 1
      ? 'event'
      : 'events'}</button
  >{/if}
