<script lang="ts">
  import { untrack } from 'svelte';
  import type { CalendarEvent, Settings } from '../lib/types';
  import { datepicker, settingsDialog } from '../lib/bootstrap';
  import { calendarRole, eventsForDate, sortForDay } from '../lib/calendar';
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
  const today = $derived(dateKey(now));
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
  // Selection is solid, today is outlined, and only in-month weekends carry a
  // fill, so the days that matter outweigh the ones around them. Outside the
  // month, days keep dots instead of titles.
  function dayClass(day: Date, date: string) {
    const outside = day.getMonth() !== month.getMonth();
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const variant =
      selected === date
        ? 'btn-solid theme-primary'
        : date === today
          ? 'btn-outline theme-primary'
          : outside
            ? 'btn-text theme-secondary fg-3'
            : weekend
              ? 'btn-subtle theme-secondary fg-body'
              : 'btn-text theme-secondary fg-body';
    return `btn ${variant} month-day flex-grow-1 min-w-0 p-2 d-flex flex-column align-items-stretch justify-content-start gap-1 text-start`;
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
    <!-- A zero basis lets the controls wrap before the month name does. -->
    {#snippet action()}<div
        class="d-flex flex-grow-1 flex-wrap align-items-center justify-content-end gap-2"
        style="flex-basis: 0"
      >
        <div
          class="btn-group btn-group-sm"
          role="group"
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
              chooseDate(today);
            }}>Today</button
          ><button
            class="btn btn-outline theme-secondary"
            onclick={() => moveMonth(1)}
            aria-label="Next month"><Icon name="chevron-right" /></button
          >
        </div>
        <label
          class="form-control form-control-sm form-adorn w-auto"
          data-bs-component="datepicker"
          ><span class="form-adorn-icon"><Icon name="calendar3" /></span><span
            class="visually-hidden">Jump to a date</span
          ><input
            id="jump-date"
            class="form-ghost tabular-nums"
            size="10"
            use:datepicker={{
              placement: 'auto',
              // Bootstrap anchors to a .form-adorn wrapper by default, but the
              // calendar peer restores a clone of its anchor when the picker is
              // rebuilt for a new locale. Anchoring to the input keeps the
              // node Svelte owns, and keeps aria-haspopup on the input.
              positionElement: '#jump-date',
              selectedDates: [selected],
              locale: settings.locale,
              firstWeekday: settings.firstDay,
            }}
            use:pickerChange
            aria-label="Jump to a date"
            placeholder="Choose date"
            readonly
          /></label
        >
      </div>{/snippet}
    <div class="grid mb-2" style="--columns: 7; --gap: 0.25rem">
      {#each weekdays as day}<span class="small fg-2 ps-2">{day}</span>{/each}
    </div>
    <div
      class="grid"
      style="--columns: 7; --rows: 6; --gap: 0.25rem"
      role="group"
      aria-label="Choose a date"
    >
      <!-- Event titles sit over the day button rather than inside it, so the
           button's visible text stays within its name (WCAG 2.5.3); they
           repeat the agenda and ignore the pointer. -->
      {#each days as day}{@const date = dateKey(day)}{@const dayEvents =
          sortForDay(eventsOn(date))}{@const count =
          dayEvents.length}{@const titled =
          !compact && count > 0 && day.getMonth() === month.getMonth()}
        <div class="position-relative d-flex min-w-0">
          <button
            class={dayClass(day, date)}
            aria-pressed={selected === date}
            aria-label={`${formatDate(day, settings.locale, { dateStyle: 'full' })}, ${count} ${count === 1 ? 'event' : 'events'}`}
            onclick={() => chooseDate(date)}
            ><span class:fw-bold={date === today} class="tabular-nums"
              >{day.getDate()}</span
            >{#if count}<span
                class={`d-flex gap-1 ${titled ? 'lg:d-none' : ''}`}
                aria-hidden="true"
                >{#each dayEvents.slice(0, 3) as event (event.id)}<span
                    class={`event-dot rounded-circle ${selected === date ? '' : `fg-${calendarRole(event.calendar)}`}`}
                  ></span>{/each}</span
              ><span class="visually-hidden"
                >{count} {count === 1 ? 'event' : 'events'}</span
              >{/if}</button
          >{#if titled}<span
              class="position-absolute top-0 start-0 end-0 p-2 pe-none d-none lg:d-flex flex-column gap-1"
              aria-hidden="true"
              ><span class="d-flex align-items-center justify-content-between"
                ><span class="invisible">{day.getDate()}</span
                >{#if count > 2}<span class="badge">+{count - 2}</span
                  >{/if}</span
              >{#each dayEvents.slice(0, 2) as event (event.id)}<span
                  class={`badge badge-subtle theme-${calendarRole(event.calendar)} d-block text-truncate text-start`}
                  >{event.title}</span
                >{/each}</span
            >{/if}
        </div>{/each}
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
        class="btn btn-text theme-secondary ms-auto"
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
