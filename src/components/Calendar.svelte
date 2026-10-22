<script lang="ts">
  import { untrack } from 'svelte';
  import type { CalendarEvent, Settings } from '../lib/types';
  import { datepicker, settingsDialog } from '../lib/bootstrap';
  import { eventsForDate } from '../lib/calendar';
  import { formatDate } from '../lib/format';
  import Panel from './Panel.svelte';
  import Agenda from './Agenda.svelte';
  import Icon from './Icon.svelte';
  let {
    events,
    now,
    settings,
    compact = false,
  }: {
    events: CalendarEvent[];
    now: Date;
    settings: Settings;
    compact?: boolean;
  } = $props();
  let fullAgenda = $state(false);
  let small = $state(false);
  function dateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  let selected = $state(untrack(() => dateKey(now)));
  let month = $state(
    untrack(() => new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const weekdays = $derived(
    Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(settings.locale, { weekday: 'short' }).format(
        new Date(2026, 0, 4 + ((i + settings.firstDay) % 7)),
      ),
    ),
  );
  const days = $derived.by(() => {
    const offset = (month.getDay() - settings.firstDay + 7) % 7;
    return Array.from(
      { length: 42 },
      (_, i) => new Date(month.getFullYear(), month.getMonth(), i - offset + 1),
    );
  });
  function eventsOn(date: string) {
    return eventsForDate(events, date);
  }
  function moveMonth(delta: number) {
    month = new Date(month.getFullYear(), month.getMonth() + delta, 1);
  }
  function chooseDate(value: string) {
    const date = new Date(value + 'T12:00:00');
    if (!Number.isFinite(date.getTime())) return;
    selected = value;
    month = new Date(date.getFullYear(), date.getMonth(), 1);
  }
  function pickerChange(node: HTMLElement) {
    const handler = (event: Event) => {
      const dates = (event as Event & { dates?: string[] }).dates;
      if (dates?.[0]) chooseDate(dates[0]);
    };
    node.addEventListener('change.bs.datepicker', handler);
    return {
      destroy() {
        node.removeEventListener('change.bs.datepicker', handler);
      },
    };
  }
</script>

<div class="grid" class:compact-calendar={compact}>
  <Panel
    title={formatDate(month, settings.locale, {
      month: 'long',
      year: 'numeric',
    })}
    class="g-col-12 lg:g-col-8"
  >
    {#snippet action()}<div
        class="btn-group"
        aria-label="Month navigation"
        data-bs-component="button-group"
      >
        <button
          class="btn btn-outline theme-secondary"
          onclick={() => moveMonth(-1)}
          aria-label="Previous month"><Icon name="chevron-left" /></button
        ><button
          class="btn btn-outline theme-secondary"
          onclick={() => {
            chooseDate(dateKey(now));
          }}>Today</button
        ><button
          class="btn btn-outline theme-secondary"
          onclick={() => moveMonth(1)}
          aria-label="Next month"><Icon name="chevron-right" /></button
        >
      </div>{/snippet}
    <div class="month-grid mb-2">
      {#each weekdays as day}<span class="small fg-2 text-center">{day}</span
        >{/each}
    </div>
    <div class="month-grid" aria-label="Choose a date">
      {#each days as day}{@const date = dateKey(day)}{@const count =
          eventsOn(date).length}<button
          class="btn btn-text theme-secondary month-day"
          class:outside-month={day.getMonth() !== month.getMonth()}
          class:weekend={day.getDay() === 0 || day.getDay() === 6}
          aria-pressed={selected === date}
          aria-label={`${formatDate(day, settings.locale, { dateStyle: 'full' })}, ${count} ${count === 1 ? 'event' : 'events'}`}
          onclick={() => chooseDate(date)}
          ><span class:fw-bold={date === dateKey(now)}>{day.getDate()}</span
          >{#if count}<span class="event-dot" aria-hidden="true"></span><span
              class="visually-hidden"
              >{count} {count === 1 ? 'event' : 'events'}</span
            >{/if}</button
        >{/each}
    </div>
    <div class="mt-3 form-field" data-bs-component="datepicker">
      <label for="jump-date">Jump to a date</label><input
        id="jump-date"
        class="form-control"
        use:datepicker={{
          placement: 'auto',
          selectedDates: [selected],
          locale: settings.locale,
          firstWeekday: settings.firstDay,
        }}
        use:pickerChange
        aria-label="Jump to a date"
        placeholder="Choose date"
        readonly
      />
    </div>
  </Panel>
  <Panel
    title={formatDate(
      new Date(selected + 'T12:00:00'),
      settings.locale,
      {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      },
      settings.dateFormat,
    )}
    class="g-col-12 lg:g-col-4"
    ><Agenda
      events={eventsOn(selected)}
      locale={settings.locale}
      hourCycle={settings.hourCycle}
      max={compact ? 3 : 6}
      onmore={() => {
        small = matchMedia('(max-width: 43rem)').matches;
        fullAgenda = true;
      }}
    />
    <p class="small fg-2 mt-3 mb-0">
      All calendars and attendees are invented. Select an event for details.
    </p></Panel
  >
</div>
{#if fullAgenda}
  <dialog
    use:settingsDialog
    onclose={() => (fullAgenda = false)}
    aria-labelledby="full-agenda-title"
    data-bs-component={small ? 'drawer' : 'dialog'}
    style="--dialog-width: 44rem"
  >
    <div class={small ? 'drawer-header' : 'dialog-header'}>
      <h2 id="full-agenda-title" class="h4 m-0">
        All events for {formatDate(
          new Date(selected + 'T12:00:00'),
          settings.locale,
          undefined,
          settings.dateFormat,
        )}
      </h2>
      <button
        class="btn btn-text theme-secondary"
        data-bs-dismiss={small ? 'drawer' : 'dialog'}
        aria-label="Close all events"><Icon name="x-lg" /></button
      >
    </div>
    <div class={small ? 'drawer-body' : 'dialog-body'}>
      <Agenda
        events={eventsOn(selected)}
        locale={settings.locale}
        hourCycle={settings.hourCycle}
        max={100}
      />
    </div>
  </dialog>
{/if}
