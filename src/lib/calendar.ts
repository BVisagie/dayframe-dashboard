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
