<script lang="ts">
  import type { CalendarEvent } from '../lib/types';
  import { popover } from '../lib/bootstrap';
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
  {#each events.slice(0, max) as event (event.id)}
    <li class="list-group-item px-0">
      <div class="d-flex gap-3">
        <span class="agenda-time small"
          >{event.allDay ? 'All day' : time(event.start)}</span
        >
        <div class="flex-grow-1">
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
          <p class="small fg-2 mb-1">
            {event.calendar}{compact ? '' : ' · ' + event.location}
          </p>
          {#if !compact}<span class="small"
              >{event.allDay
                ? 'All-day event'
                : `${time(event.start)}–${time(event.end)}`}</span
            >{/if}
        </div>
        <Icon name="calendar-event" />
      </div>
    </li>
  {:else}<li class="list-group-item px-0 fg-2">
      No events on this date. Choose another day to see its agenda.
    </li>{/each}
</ul>
{#if events.length > max}<button class="btn btn-link px-0 mt-2" onclick={onmore}
    >+{events.length - max} more events</button
  >{/if}
