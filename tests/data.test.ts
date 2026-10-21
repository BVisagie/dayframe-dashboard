import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, simulateWeather } from '../src/lib/data.ts';
import { formatDate, formatNumber, formatRelative, formatTemperature, formatTime, quotaPercent } from '../src/lib/format.ts';
import type { Settings } from '../src/lib/types.ts';
import type { Scenario } from '../src/lib/types.ts';
import { resolveScheme } from '../src/themes/apply.ts';
import defaultTheme from '../src/themes/default/theme.js';

const NOW = new Date('2026-11-03T09:30:00.000Z');
const SEED = 'test-garden';
const DAY = 86_400_000;

test('the same explicit clock, seed and scenario reproduce all simulated data', () => {
  const input = new Date(NOW);
  const first = simulate(input, SEED, 'steady');
  assert.deepEqual(simulate(new Date(NOW), SEED, 'steady'), first);
  assert.equal(input.toISOString(), NOW.toISOString());
  assert.notDeepEqual(simulate(NOW, 'another-garden', 'steady'), first);
  first.agents[0].history[0] = -1;
  first.events[0].attendees.push('Altered fixture');
  first.weather.days[0].high = 999;
  assert.notDeepEqual(simulate(NOW, SEED, 'steady'), first);
});

test('the engine does not depend on random values or the runtime clock', () => {
  const random = Math.random;
  const clock = Date.now;
  const timezoneOffset = Date.prototype.getTimezoneOffset;
  const expected = simulate(NOW, SEED, 'steady');
  const shifted = simulate(NOW, SEED, 'steady', -345);
  try {
    Math.random = () => { throw new Error('Unexpected random read'); };
    Date.now = () => { throw new Error('Unexpected clock read'); };
    Date.prototype.getTimezoneOffset = () => { throw new Error('Unexpected viewer timezone read'); };
    assert.deepEqual(simulate(NOW, SEED, 'steady'), expected);
    assert.deepEqual(simulate(NOW, SEED, 'steady', -345), shifted);
  } finally {
    Math.random = random;
    Date.now = clock;
    Date.prototype.getTimezoneOffset = timezoneOffset;
  }
});

test('all six agents expose bounded quotas, history and future resets', () => {
  const { agents } = simulate(NOW, SEED, 'steady');
  assert.deepEqual(agents.map(({ name }) => name), ['Codex', 'Claude', 'Cursor', 'Grok', 'OpenCode', 'Antigravity']);
  assert.equal(new Set(agents.map(({ id }) => id)).size, 6);
  for (const agent of agents) {
    assert.ok(agent.limit > 0);
    assert.ok(Number.isInteger(agent.used) && agent.used >= 0 && agent.used <= agent.limit);
    assert.ok(Date.parse(agent.resetsAt) > NOW.getTime());
    assert.equal(agent.history.length, 12);
    assert.ok(agent.history.every((value) => Number.isFinite(value) && value >= 0 && value <= 100));
    assert.equal(agent.history.at(-1), quotaPercent(agent.used, agent.limit));
  }
  assert.ok(agents.some(({ window }) => window.includes('session')));
  assert.ok(agents.some(({ window }) => window.includes('Weekly')));
  assert.ok(agents.some(({ window }) => window.includes('Monthly')));
  assert.ok(agents.some(({ window }) => window.includes('model')));
});

test('every quota rises within its window and resets at the advertised instant', () => {
  for (const agent of simulate(NOW, SEED, 'steady').agents) {
    const reset = Date.parse(agent.resetsAt);
    const before = simulate(new Date(reset - 60_000), SEED, 'steady').agents.find(({ id }) => id === agent.id)!;
    const after = simulate(new Date(reset), SEED, 'steady').agents.find(({ id }) => id === agent.id)!;
    const later = simulate(new Date(reset + 60_000), SEED, 'steady').agents.find(({ id }) => id === agent.id)!;
    assert.ok(before.used > 0, agent.id);
    assert.equal(before.resetsAt, agent.resetsAt, agent.id);
    assert.equal(after.used, 0, agent.id);
    assert.ok(after.used <= later.used, agent.id);
    assert.ok(Date.parse(after.resetsAt) > reset, agent.id);
  }
});

test('monthly usage stays monotonic across ISO week changes and handles leap years', () => {
  const monthly = (date: string) => simulate(new Date(date), SEED, 'steady').agents.find(({ id }) => id === 'cursor')!;
  const sunday = monthly('2026-11-08T23:59:00Z');
  const monday = monthly('2026-11-09T00:01:00Z');
  assert.ok(monday.used >= sunday.used);
  assert.equal(monday.resetsAt, '2026-12-01T00:00:00.000Z');
  const february = monthly('2028-02-28T23:59:00Z');
  const leapDay = monthly('2028-02-29T23:59:00Z');
  assert.ok(leapDay.used >= february.used);
  assert.equal(leapDay.resetsAt, '2028-03-01T00:00:00.000Z');
  assert.equal(monthly('2028-03-01T00:00:00Z').used, 0);
});

test('weekly quotas use Monday resets across an ISO week-year boundary', () => {
  const before = simulate(new Date('2027-01-03T23:59:00Z'), SEED, 'steady').agents;
  const after = simulate(new Date('2027-01-04T00:00:00Z'), SEED, 'steady').agents;
  for (const id of ['claude', 'antigravity']) {
    assert.equal(before.find((agent) => agent.id === id)!.resetsAt, '2027-01-04T00:00:00.000Z');
    assert.equal(after.find((agent) => agent.id === id)!.used, 0);
  }
});

test('all six scenarios produce their intended attention state', () => {
  const scenarios: Scenario[] = ['steady', 'running-low', 'reconnect', 'reminder-due', 'stale', 'offline'];
  for (const scenario of scenarios) {
    const result = simulate(NOW, SEED, scenario);
    assert.equal(result.agents.length, 6);
    assert.ok(result.events.length > 0);
    assert.equal(result.weather.days.length, 7);
    assert.ok(result.stories.length >= 8);
    assert.deepEqual(simulate(NOW, SEED, scenario), result);
  }
  assert.ok(simulate(NOW, SEED, 'running-low').agents.every(({ used, limit }) => used / limit >= 0.89));
  assert.equal(simulate(NOW, SEED, 'reconnect').agents.filter(({ status }) => status === 'reconnect').length, 2);
  for (const scenario of ['stale', 'offline'] as const) {
    assert.ok(simulate(NOW, SEED, scenario).agents.every(({ status }) => status === scenario));
  }
  const due = simulate(NOW, SEED, 'reminder-due').events.find(({ title }) => title === 'Release readiness check')!;
  assert.ok(Date.parse(due.start) > NOW.getTime());
  assert.ok(Date.parse(due.start) - NOW.getTime() <= 3 * 60_000);
});

test('steady accounts occasionally become stale or need reconnecting', () => {
  const statuses = new Set<string>();
  for (let offset = 0; offset < 120; offset += 1) {
    for (const { status } of simulate(new Date(NOW.getTime() + offset * DAY), SEED, 'steady').agents) statuses.add(status);
  }
  assert.deepEqual([...statuses].sort(), ['fresh', 'reconnect', 'stale']);
});

test('calendar recurrence, exclusive all-day dates, overlap and reminders stay plausible', () => {
  for (const date of ['2026-11-03T09:30:00Z', '2026-11-08T23:59:00Z', '2026-12-31T23:58:00Z', '2028-02-29T11:30:00Z']) {
    const now = new Date(date);
    const { events } = simulate(now, SEED, 'steady');
    assert.equal(new Set(events.map(({ id }) => id)).size, events.length);
    assert.ok(events.every((event) => Date.parse(event.end) > Date.parse(event.start)));
    assert.ok(events.every((event, index) => index === 0 || event.start >= events[index - 1].start));
    const recurring = events.filter(({ title }) => title === 'Daily build check');
    assert.ok(recurring.length >= 10);
    assert.ok(recurring.every(({ start }) => ![0, 6].includes(new Date(start).getUTCDay()) && start.endsWith('09:15:00.000Z')));
    const allDay = events.filter((event) => event.allDay);
    assert.ok(allDay.some((event) => Date.parse(event.end) - Date.parse(event.start) === DAY));
    assert.ok(allDay.some((event) => Date.parse(event.end) - Date.parse(event.start) > DAY));
    assert.ok(allDay.every(({ start, end }) => start.endsWith('T00:00:00.000Z') && end.endsWith('T00:00:00.000Z')));
    const timed = events.filter((event) => !event.allDay);
    assert.ok(timed.some((event, index) => timed.some((other, otherIndex) => index !== otherIndex && event.start < other.end && other.start < event.end)));
    assert.ok(timed.some(({ start }) => Date.parse(start) > now.getTime() && Date.parse(start) - now.getTime() <= 15 * 60_000));
  }
});

test('weather produces consistent seven-day and hourly forecasts across date transitions', () => {
  for (const date of ['2026-03-29T23:30:00Z', '2026-12-31T23:30:00Z', '2028-02-28T23:30:00Z']) {
    const now = new Date(date);
    const weather = simulateWeather(now, SEED);
    assert.deepEqual(weather, simulate(now, SEED, 'steady').weather);
    assert.equal(weather.days.length, 7);
    assert.equal(weather.hours.length, 24);
    assert.equal(weather.temperature, weather.hours[0].temperature);
    assert.ok(weather.humidity >= 0 && weather.humidity <= 100);
    for (const [index, day] of weather.days.entries()) {
      assert.ok(day.high > day.low);
      assert.ok(day.precipitation >= 0 && day.precipitation <= 100);
      assert.ok(Date.parse(day.sunrise) < Date.parse(day.sunset));
      if (index > 0) assert.equal(Date.parse(day.date) - Date.parse(weather.days[index - 1].date), DAY);
    }
    for (const [index, hour] of weather.hours.entries()) {
      if (index > 0) assert.equal(Date.parse(hour.time) - Date.parse(weather.hours[index - 1].time), 3_600_000);
    }
    assert.deepEqual(simulateWeather(new Date(now.getTime() + DAY), SEED).days[0], weather.days[1]);
  }
});

test('explicit fixed offsets place demo events on wall dates without shifting all-day membership or quotas', () => {
  for (const date of ['2026-11-03T02:30:00Z', '2026-11-03T23:30:00Z']) {
    const now = new Date(date);
    const utc = simulate(now, SEED, 'reminder-due');
    assert.deepEqual(simulate(now, SEED, 'reminder-due', 0), utc);
    for (const offsetMinutes of [-840, -345, 480, 720]) {
      const offset = offsetMinutes * 60_000;
      const wallTime = now.getTime() - offset;
      const wallDate = new Date(wallTime).toISOString().slice(0, 10);
      const result = simulate(now, SEED, 'reminder-due', offsetMinutes);
      assert.deepEqual(result.agents, utc.agents);
      assert.deepEqual(result.stories, utc.stories);
      const expectedEvents = simulate(new Date(wallTime), SEED, 'reminder-due').events;
      assert.equal(result.events.length, expectedEvents.length);
      for (const expected of expectedEvents) {
        const event = result.events.find(({ id }) => id === expected.id)!;
        assert.ok(event);
        const shift = event.allDay ? 0 : offset;
        assert.equal(Date.parse(event.start), Date.parse(expected.start) + shift);
        assert.equal(Date.parse(event.end), Date.parse(expected.end) + shift);
      }
      const focus = result.events.find(({ title }) => title === 'Quiet build time')!;
      assert.equal(new Date(Date.parse(focus.start) - offset).toISOString(), `${wallDate}T10:00:00.000Z`);
      const due = result.events.find(({ title }) => title === 'Release readiness check')!;
      assert.equal(Date.parse(due.start) - now.getTime(), 3 * 60_000);
    }
  }
});

test('weather offsets keep the heat peak, daily labels, hourly instants and solar boundaries consistent', () => {
  const now = new Date('2026-11-03T23:30:00Z');
  for (const offsetMinutes of [-840, -345, 480, 720]) {
    const offset = offsetMinutes * 60_000;
    const wallNow = new Date(now.getTime() - offset);
    const expected = simulateWeather(wallNow, SEED);
    const weather = simulateWeather(now, SEED, offsetMinutes);
    assert.deepEqual(weather, simulate(now, SEED, 'steady', offsetMinutes).weather);
    assert.equal(weather.days[0].date, wallNow.toISOString().slice(0, 10));
    assert.equal(weather.temperature, expected.temperature);
    for (const [index, day] of weather.days.entries()) {
      assert.equal(day.date, expected.days[index].date);
      assert.equal(day.low, expected.days[index].low);
      assert.equal(day.high, expected.days[index].high);
      assert.equal(Date.parse(day.sunrise), Date.parse(expected.days[index].sunrise) + offset);
      assert.equal(Date.parse(day.sunset), Date.parse(expected.days[index].sunset) + offset);
    }
    for (const [index, hour] of weather.hours.entries()) {
      assert.equal(hour.temperature, expected.hours[index].temperature);
      assert.equal(Date.parse(hour.time), Date.parse(expected.hours[index].time) + offset);
      const wallHour = new Date(Date.parse(hour.time) - offset);
      if (wallHour.getUTCHours() === 15) {
        const day = weather.days.find(({ date }) => date === wallHour.toISOString().slice(0, 10))!;
        assert.equal(hour.temperature, day.high);
      }
    }
  }
});

test('auto schemes use simulated solar boundaries across UTC dates and extreme offsets', () => {
  const original = process.env.TZ;
  try {
    for (const [timezone, offsetMinutes, suffix] of [
      ['America/Los_Angeles', 480, '-08:00'], ['Pacific/Kiritimati', -840, '+14:00'],
    ] as const) {
      process.env.TZ = timezone;
      const now = new Date('2026-11-03T18:00:00');
      const day = simulateWeather(now, SEED, offsetMinutes).days[0];
      assert.ok(Date.parse(day.sunset) < now.getTime());
      assert.ok(now.getHours() < 19);
      assert.ok(day.sunrise.startsWith(`${day.date}T`) && day.sunrise.endsWith(suffix));
      assert.ok(day.sunset.startsWith(`${day.date}T`) && day.sunset.endsWith(suffix));
      assert.equal(resolveScheme(defaultTheme, 'auto', undefined, now), 'light');
      assert.equal(resolveScheme(defaultTheme, 'auto', day, now), 'dark');
      const beforeSunrise = new Date(Date.parse(day.sunrise) - 60_000);
      assert.equal(beforeSunrise.getHours(), 7);
      assert.equal(resolveScheme(defaultTheme, 'auto', day, beforeSunrise), 'dark');
      assert.equal(resolveScheme(defaultTheme, 'auto', day, new Date(day.sunrise)), 'light');
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('simulated feeds cover each category and contain no invented external links', () => {
  const { stories } = simulate(NOW, SEED, 'steady');
  assert.deepEqual([...new Set(stories.map(({ category }) => category))].sort(), ['bootstrap', 'design', 'science', 'technology']);
  assert.equal(new Set(stories.map(({ id }) => id)).size, stories.length);
  assert.ok(stories.every(({ publishedAt, url, live, excerpt }) => Date.parse(publishedAt) <= NOW.getTime() && url === undefined && live === false && excerpt.length > 20));
  assert.ok(stories.every((story, index) => index === 0 || story.publishedAt < stories[index - 1].publishedAt));
});

test('invalid simulation clocks fail explicitly', () => {
  assert.throws(() => simulate(new Date('invalid'), SEED, 'steady'), /valid date/);
  assert.throws(() => simulateWeather(new Date('invalid'), SEED), /valid date/);
});

test('simulation offsets reject nonfinite, fractional and unsupported values', () => {
  for (const offset of [NaN, Infinity, -Infinity, 1.5, -841, 721]) {
    assert.throws(() => simulate(NOW, SEED, 'steady', offset), /UTC offset/);
    assert.throws(() => simulateWeather(NOW, SEED, offset), /UTC offset/);
  }
});

test('formatters respect explicit locales, units and clocks and handle missing values', () => {
  assert.equal(formatNumber(1234.5, 'en-US'), '1,234.5');
  assert.equal(formatNumber(1234.5, 'de-DE'), '1.234,5');
  assert.equal(formatTemperature(0, 'fahrenheit', 'en-US'), '32°F');
  assert.equal(formatTemperature(12.6, 'celsius', 'en-GB'), '13°C');
  assert.equal(formatTemperature(Number.NaN), '—');
  assert.equal(formatRelative(new Date(NOW.getTime() + 5 * 60_000), NOW, 'en-US'), 'in 5 minutes');
  assert.equal(formatRelative(new Date(NOW.getTime() - DAY), NOW, 'en-US'), 'yesterday');
  assert.equal(formatDate('2026-11-03T09:30:00Z', 'en-GB', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }), '03/11/2026');
  assert.ok(formatTime(NOW, { locale: 'en-US', hourCycle: 'h12' }).match(/AM|PM/));
  assert.ok(!formatTime(NOW, { locale: 'en-US', hourCycle: 'h23' }).match(/AM|PM/));
  assert.equal(formatDate('invalid'), '—');
  assert.equal(formatTime('invalid', { locale: 'en-US', hourCycle: 'locale' }), '—');
  assert.equal(formatRelative('invalid', NOW), '—');
  assert.equal(formatNumber(Number.NaN), '—');
  assert.doesNotThrow(() => formatDate(NOW, 'invalid_locale'));
  assert.doesNotThrow(() => formatNumber(10, 'invalid_locale'));
  assert.equal(quotaPercent(110, 100), 100);
  assert.equal(quotaPercent(-10, 100), 0);
  assert.equal(quotaPercent(10, 0), 0);
  assert.equal(quotaPercent(Number.NaN, 100), 0);
});

test('date overrides choose an explicit numeric order independently of locale', () => {
  const value = '2026-11-03T09:30:00Z';
  const options: Intl.DateTimeFormatOptions = { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' };
  assert.equal(formatDate(value, 'en-US', options, 'day-month'), '03/11/2026');
  assert.equal(formatDate(value, 'en-GB', options, 'month-day'), '11/03/2026');
  assert.equal(formatDate(value, 'de-DE', options, 'iso'), '2026-11-03');
  assert.equal(formatDate(value, 'en-GB', { dateStyle: 'full', timeZone: 'UTC' }, 'month-day'), '11/03/2026');
  for (const input of [value, new Date(value), Date.parse(value)]) {
    assert.equal(formatDate(input, 'en-US', undefined, 'day-month'), '03/11/2026');
    assert.equal(formatDate(input, 'en-US', {}, 'iso'), '2026-11-03');
  }
  assert.equal(formatDate(value, 'en-US', options, 'locale'), formatDate(value, 'en-US', options));
});

test('numeric overrides retain localized numerals and ISO uses Gregorian Latin digits', () => {
  const value = '2026-11-03T09:30:00Z';
  const options = { timeZone: 'UTC' };
  assert.equal(formatDate(value, 'ar-EG', options, 'day-month'), '٠٣/١١/٢٠٢٦');
  assert.equal(formatDate(value, 'ar-EG', options, 'month-day'), '١١/٠٣/٢٠٢٦');
  assert.equal(formatDate(value, 'ar-EG', options, 'iso'), '2026-11-03');
  assert.equal(formatDate(value, 'th-TH', options, 'iso'), '2026-11-03');
  assert.equal(formatDate(value, 'ar-EG', { ...options, numberingSystem: 'latn' }, 'day-month'), '03/11/2026');
});

test('date overrides preserve semantic headings with no day or date style', () => {
  const value = '2026-11-03T09:30:00Z';
  const headings: Intl.DateTimeFormatOptions[] = [
    { month: 'long', year: 'numeric' }, { month: 'long' }, { year: 'numeric' },
    { weekday: 'long' }, { month: '2-digit', year: 'numeric' },
  ];
  for (const dateFormat of ['locale', 'day-month', 'month-day', 'iso'] as const) {
    for (const heading of headings) {
      const options = { timeZone: 'UTC', ...heading };
      assert.equal(formatDate(value, 'de-DE', options, dateFormat), formatDate(value, 'de-DE', options));
    }
  }
});

test('date overrides use the requested timezone and keep invalid input safe', () => {
  const value = '2026-01-01T00:30:00Z';
  const options = { timeZone: 'Etc/GMT+2' };
  const expected: Record<Settings['dateFormat'], string> = {
    locale: formatDate(value, 'en-GB', options), 'day-month': '31/12/2025',
    'month-day': '12/31/2025', iso: '2025-12-31',
  };
  for (const dateFormat of ['locale', 'day-month', 'month-day', 'iso'] as const) {
    assert.equal(formatDate(value, 'en-GB', options, dateFormat), expected[dateFormat]);
    assert.equal(formatDate('invalid', 'en-GB', options, dateFormat), '—');
    assert.equal(formatDate(value, 'invalid_locale', options, dateFormat), expected[dateFormat]);
  }
});
