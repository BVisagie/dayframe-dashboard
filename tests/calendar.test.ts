import assert from 'node:assert/strict';
import test from 'node:test';
import { eventsForDate } from '../src/lib/calendar.ts';
import type { CalendarEvent } from '../src/lib/types.ts';

test('all-day dates stay exclusive and do not spill across browser time zones', () => {
  const original = process.env.TZ;
  const event: CalendarEvent = {
    id: 'all-day',
    title: 'Open sketch day',
    start: '2026-11-03T00:00:00Z',
    end: '2026-11-04T00:00:00Z',
    allDay: true,
    calendar: 'Studio',
    location: 'Cloudfern room',
    attendees: [],
    description: 'A day for sketching.',
  };
  try {
    for (const timezone of ['UTC', 'Etc/GMT+8', 'Etc/GMT-10']) {
      process.env.TZ = timezone;
      assert.deepEqual(eventsForDate([event], '2026-11-02'), []);
      assert.deepEqual(eventsForDate([event], '2026-11-03'), [event]);
      assert.deepEqual(eventsForDate([event], '2026-11-04'), []);
      const multi = { ...event, end: '2026-11-06T00:00:00Z' };
      assert.deepEqual(eventsForDate([multi], '2026-11-05'), [multi]);
      assert.deepEqual(eventsForDate([multi], '2026-11-06'), []);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('timed events use local midnight boundaries and an exclusive end', () => {
  const original = process.env.TZ;
  process.env.TZ = 'Etc/GMT+8';
  try {
    const event: CalendarEvent = {
      id: 'timed',
      title: 'Quiet build',
      start: '2026-11-04T07:00:00Z',
      end: '2026-11-04T08:00:00Z',
      allDay: false,
      calendar: 'Studio',
      location: 'Cloudfern room',
      attendees: [],
      description: 'A focus block.',
    };
    assert.deepEqual(eventsForDate([event], '2026-11-03'), [event]);
    assert.deepEqual(eventsForDate([event], '2026-11-04'), []);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
