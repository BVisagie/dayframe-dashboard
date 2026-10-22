import type { CalendarEvent } from './types.ts';

export function eventsForDate(
  events: CalendarEvent[],
  date: string,
): CalendarEvent[] {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return events.filter((event) =>
    event.allDay
      ? event.start.slice(0, 10) <= date && event.end.slice(0, 10) > date
      : Date.parse(event.start) < end.getTime() &&
        Date.parse(event.end) > start.getTime(),
  );
}

/** Simulated calendars map onto the dashboard's chart series roles so Bootstrap's theme-* classes colour them. */
export function calendarRole(calendar: string): string {
  const roles: Record<string, string> = {
    Studio: 'series-1',
    Research: 'series-2',
    Focus: 'series-3',
    Milestones: 'series-4',
    Reminders: 'series-5',
  };
  return roles[calendar] ?? 'series-6';
}

/** Month cells and agendas list all-day events before timed ones, then by start. */
export function sortForDay(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (left, right) =>
      Number(right.allDay) - Number(left.allDay) ||
      left.start.localeCompare(right.start) ||
      left.id.localeCompare(right.id),
  );
}
