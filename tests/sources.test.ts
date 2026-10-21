import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { createBootstrapSource, createSource, createWeatherSource, resolveDefaultLocation, searchCities } from '../src/lib/sources.ts';
import type { Source, SourceFetch, SourceSnapshot, SourceStorage } from '../src/lib/sources.ts';
import type { Location, Story, Weather } from '../src/lib/types.ts';
import { resolveScheme } from '../src/themes/apply.ts';
import defaultTheme from '../src/themes/default/theme.js';

const start = Date.parse('2026-11-03T09:00:00Z');
const minute = 60_000;
const hour = 60 * minute;
const location: Location = { name: 'Mossquay', latitude: 0, longitude: 0, timezone: 'UTC' };

class MemoryStorage implements SourceStorage {
  entries = new Map<string, string>();
  getItem(key: string): string | null { return this.entries.get(key) ?? null; }
  setItem(key: string, value: string): void { this.entries.set(key, value); }
}

function observe<T>(source: Source<T>): { snapshots: SourceSnapshot<T>[]; latest: () => SourceSnapshot<T> } {
  const snapshots: SourceSnapshot<T>[] = [];
  source.subscribe((snapshot) => { snapshots.push(snapshot); });
  return { snapshots, latest: () => snapshots[snapshots.length - 1] };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function mockFetch(handler: (url: URL, init: RequestInit) => Response | Promise<Response>): SourceFetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.ok(['https://api.open-meteo.com', 'https://geocoding-api.open-meteo.com',
      'https://blog.getbootstrap.com', 'https://api.github.com'].includes(url.origin));
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.mode, 'cors');
    assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).has('authorization'), false);
    return handler(url, init ?? {});
  };
}

function json(value: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' }, ...init });
}

function stalledBody(): Response {
  return new Response(new ReadableStream<Uint8Array>());
}

function forecast() {
  const days = Array.from({ length: 7 }, (_, i) => new Date(start + i * 24 * hour).toISOString().slice(0, 10));
  return {
    current: { temperature_2m: 18, apparent_temperature: 17, weather_code: 2,
      wind_speed_10m: 12, relative_humidity_2m: 60 },
    daily: {
      time: days, temperature_2m_min: days.map(() => 10), temperature_2m_max: days.map(() => 20),
      weather_code: days.map(() => 61), precipitation_probability_max: days.map(() => 35),
      sunrise: days.map((day) => `${day}T07:00`), sunset: days.map((day) => `${day}T17:00`),
    },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => new Date(start + i * hour).toISOString().slice(0, 16)),
      temperature_2m: Array.from({ length: 24 }, () => 18),
      weather_code: Array.from({ length: 24 }, () => 3),
      precipitation_probability: Array.from({ length: 24 }, () => 20),
    },
  };
}

const weatherFallback: Weather = { city: 'Mossquay', temperature: 15, feelsLike: 14, code: 0,
  wind: 8, humidity: 50, days: [], hours: [] };
const storiesFallback: Story[] = [{ id: 'simulated-bootstrap', title: 'A new release is taking shape',
  excerpt: 'Simulated release coverage.', category: 'bootstrap', publication: 'Component Gazette',
  publishedAt: '2026-11-02T12:00:00Z' }];

function rss(items = `<item><title>Bootstrap &amp; components</title>
  <link>https://blog.getbootstrap.com/2026/11/03/component-update/</link>
  <pubDate>Tue, 03 Nov 2026 09:00:00 GMT</pubDate>
  <description><![CDATA[<script>untrusted content</script>]]></description></item>`): string {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Bootstrap</title>${items}</channel></rss>`;
}

function release(overrides: Record<string, unknown> = {}) {
  return { name: 'Bootstrap 6 alpha', tag_name: 'v6.0.0-alpha.1', prerelease: true, draft: false,
    published_at: '2026-11-03T10:00:00Z',
    html_url: 'https://github.com/twbs/bootstrap/releases/tag/v6.0.0-alpha.1',
    body: '<p>Remote release content</p>', ...overrides };
}

test('sources immediately expose fallback, dedupe concurrent refreshes, and expire cached data', async () => {
  let time = start;
  let calls = 0;
  const result = deferred<{ count: number }>();
  const storage = new MemoryStorage();
  const source = createSource({ id: 'counts', fallback: { count: 0 }, ttl: minute, storage,
    now: () => time, load: () => { calls += 1; return result.promise; } });
  const state = observe(source);
  assert.deepEqual(state.latest(), { data: { count: 0 }, status: 'loading', updatedAt: null, error: null });
  const first = source.refresh();
  assert.equal(source.refresh(true), first);
  assert.equal(source.status, 'loading');
  assert.equal(state.latest().error, null);
  result.resolve({ count: 7 });
  await first;
  assert.equal(calls, 1);
  assert.deepEqual(state.latest(), { data: { count: 7 }, status: 'fresh', updatedAt: start, error: null });
  await source.refresh();
  assert.equal(calls, 1);

  const cached = createSource({ id: 'counts', fallback: { count: 0 }, ttl: minute, storage,
    now: () => new Date(time), load: () => { calls += 1; return { count: 8 }; } });
  const cachedState = observe(cached);
  assert.equal(cachedState.latest().data.count, 7);
  assert.equal(cached.status, 'fresh');
  await cached.refresh();
  assert.equal(calls, 1);
  time += minute;
  assert.equal(cached.status, 'stale');
  await cached.refresh();
  assert.equal(calls, 2);
  assert.equal(cachedState.latest().data.count, 8);
  source.destroy(); cached.destroy();
});

test('offline refresh retains validated data and timestamp, backs off, and recovers', async () => {
  let time = start;
  let calls = 0;
  let fail = false;
  const storage = new MemoryStorage();
  const source = createSource({ id: 'retained', fallback: { count: 0 }, ttl: minute, storage,
    now: () => time, load: () => {
      calls += 1;
      if (fail) throw new Error('network failure');
      return { count: calls };
    } });
  const state = observe(source);
  await source.refresh();
  time += minute;
  fail = true;
  await source.refresh();
  assert.equal(source.status, 'stale');
  assert.deepEqual(state.latest().data, { count: 1 });
  assert.equal(state.latest().updatedAt, start);
  assert.ok(state.latest().error);
  await source.refresh(true);
  assert.equal(calls, 2);

  const remounted = createSource({ id: 'retained', fallback: { count: 0 }, ttl: minute, storage,
    now: () => time, load: () => { calls += 1; return { count: 9 }; } });
  assert.equal(observe(remounted).latest().data.count, 1);
  await remounted.refresh(true);
  assert.equal(calls, 2);
  time += minute;
  fail = false;
  await source.refresh();
  assert.equal(state.latest().data.count, 3);
  assert.equal(state.latest().error, null);
  assert.equal(source.status, 'fresh');
  source.destroy(); remounted.destroy();
});

test('a first failure exposes offline fallback and exponential backoff is not bypassed by force', async () => {
  let time = start;
  let calls = 0;
  const source = createSource({ id: 'offline', fallback: 0, ttl: minute, storage: null, now: () => time,
    load: () => { calls += 1; throw new Error('offline'); } });
  const state = observe(source);
  await source.refresh();
  assert.equal(source.status, 'offline');
  assert.equal(state.latest().data, 0);
  assert.equal(state.latest().updatedAt, null);
  time += minute;
  await source.refresh(true);
  assert.equal(calls, 2);
  time += minute;
  await source.refresh(true);
  assert.equal(calls, 2);
  time += minute;
  await source.refresh();
  assert.equal(calls, 3);
  source.destroy();
});

test('a cached first failure stays offline until a retry begins and recovers to fresh', async (t) => {
  let time = start;
  const storage = new MemoryStorage();
  const initial = createSource({ id: 'first-failure', fallback: 0, ttl: minute, storage,
    now: () => time, load: () => { throw new Error('offline'); } });
  t.after(() => initial.destroy());
  await initial.refresh();
  time += minute;
  const result = deferred<number>();
  const source = createSource({ id: 'first-failure', fallback: 0, ttl: minute, storage,
    now: () => time, load: () => result.promise });
  t.after(() => source.destroy());
  const state = observe(source);
  assert.equal(state.latest().status, 'offline');
  const pending = source.refresh();
  assert.equal(source.status, 'loading');
  assert.equal(state.latest().error, null);
  result.resolve(7);
  await pending;
  assert.deepEqual(state.latest(), { data: 7, status: 'fresh', updatedAt: time, error: null });
});

test('the default deadline settles an uncooperative loader after ten seconds with offline fallback',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let signal: AbortSignal | undefined;
    let settled = false;
    const source = createSource({ id: 'default-deadline', fallback: 0, ttl: minute,
      storage: null, now: () => start, load: (requestSignal) => {
        signal = requestSignal;
        return new Promise<number>(() => {});
      } });
    t.after(() => source.destroy());
    const state = observe(source);
    const pending = source.refresh().then(() => { settled = true; });
    await setImmediate();
    t.mock.timers.tick(9999);
    await setImmediate();
    assert.equal(settled, false);
    assert.equal(signal?.aborted, false);
    t.mock.timers.tick(1);
    await pending;
    assert.equal(signal?.aborted, true);
    assert.equal(source.status, 'offline');
    assert.equal(state.latest().data, 0);
    assert.equal(state.latest().updatedAt, null);
    assert.match(state.latest().error ?? '', /timed out/);
  });

test('loader deadlines retain cached data, persist backoff, clear pending and ignore late completion',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let time = start;
    let calls = 0;
    let stalled = false;
    const late = deferred<number>();
    const storage = new MemoryStorage();
    const signals: AbortSignal[] = [];
    const options = { id: 'timeout-cache', fallback: 0, ttl: minute, storage, now: () => time,
      timeoutMs: 25, load: (signal: AbortSignal) => {
        calls += 1;
        signals.push(signal);
        return stalled ? late.promise : calls;
      } };
    const source = createSource(options);
    t.after(() => source.destroy());
    const state = observe(source);
    await source.refresh();
    time += minute;
    stalled = true;
    const pending = source.refresh();
    assert.equal(source.refresh(true), pending);
    await setImmediate();
    t.mock.timers.tick(25);
    await pending;
    assert.equal(signals[1].aborted, true);
    assert.deepEqual(state.latest(), { data: 1, status: 'stale', updatedAt: start,
      error: 'This source timed out. Try again later.' });
    const cached = JSON.parse([...storage.entries.values()][0]);
    assert.equal(cached.data, 1);
    assert.equal(cached.updatedAt, start);
    assert.equal(cached.failures, 1);
    assert.equal(cached.retryAt, time + minute);
    const remounted = createSource(options);
    t.after(() => remounted.destroy());
    assert.equal(observe(remounted).latest().data, 1);
    assert.equal(remounted.status, 'stale');
    await remounted.refresh(true);
    await source.refresh(true);
    assert.equal(calls, 2);
    time += minute;
    stalled = false;
    const retry = source.refresh(true);
    assert.notEqual(retry, pending);
    await retry;
    assert.equal(calls, 3);
    assert.deepEqual(state.latest(), { data: 3, status: 'fresh', updatedAt: time, error: null });
    const count = state.snapshots.length;
    const saved = [...storage.entries.values()];
    late.resolve(99);
    await setImmediate();
    t.mock.timers.tick(25);
    assert.equal(state.snapshots.length, count);
    assert.deepEqual([...storage.entries.values()], saved);
    assert.equal(signals[0].aborted, false);
    assert.equal(signals[2].aborted, false);
  });

test('destroy settles a loader that ignores abort and cancels its deadline without late notifications',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const late = deferred<number>();
    const storage = new MemoryStorage();
    let signal: AbortSignal | undefined;
    const source = createSource({ id: 'destroy-deadline', fallback: 0, ttl: minute, storage,
      now: () => start, load: (requestSignal) => { signal = requestSignal; return late.promise; } });
    t.after(() => source.destroy());
    const state = observe(source);
    const pending = source.refresh();
    await setImmediate();
    const count = state.snapshots.length;
    const saved = [...storage.entries.values()];
    source.destroy();
    await pending;
    assert.equal(signal?.aborted, true);
    assert.equal(signal?.reason.name, 'AbortError');
    t.mock.timers.tick(10_000);
    late.resolve(9);
    await setImmediate();
    assert.equal(state.snapshots.length, count);
    assert.deepEqual([...storage.entries.values()], saved);
    assert.equal(state.latest().error, null);
  });

test('all source and location entry points validate timeout bounds', async () => {
  const fetcher = mockFetch(() => { throw new Error('No request was expected.'); });
  for (const timeoutMs of [0, -1, 1.5, NaN, Infinity, 60_001, null as unknown as number]) {
    assert.throws(() => createSource({ id: 'invalid-timeout', fallback: 0, ttl: minute,
      storage: null, load: () => 1, timeoutMs }), /timeout must be an integer/);
    assert.throws(() => createWeatherSource({ location, units: 'celsius', fallback: weatherFallback,
      storage: null, fetch: fetcher, timeoutMs }), /timeout must be an integer/);
    assert.throws(() => createBootstrapSource({ fallback: storiesFallback,
      storage: null, fetch: fetcher, timeoutMs }), /timeout must be an integer/);
    await assert.rejects(searchCities('Mossquay', fetcher, { timeoutMs }), /timeout must be an integer/);
    await assert.rejects(resolveDefaultLocation('UTC', fetcher, { timeoutMs }), /timeout must be an integer/);
  }
  for (const timeoutMs of [1, 60_000]) {
    const source = createSource({ id: 'valid-timeout', fallback: 0, ttl: minute,
      storage: null, load: () => 1, timeoutMs });
    source.destroy();
    assert.deepEqual(await searchCities('', fetcher, { timeoutMs }), []);
  }
});

test('malformed or unavailable storage cannot prevent valid live data', async () => {
  const invalid = ['not json', 'null', '[]', JSON.stringify({ version: 1, updatedAt: start,
    lastAttempt: start, retryAt: 0, failures: 0, data: { count: 'wrong type' } }),
  JSON.stringify({ version: 1, updatedAt: start + hour, lastAttempt: start, retryAt: 0,
    failures: 0, data: { count: 99 } })];
  const throwing: SourceStorage = {
    getItem() { throw new Error('storage disabled'); },
    setItem() { throw new Error('storage full'); },
  };
  for (const storage of [...invalid.map((value): SourceStorage => ({
    getItem: () => value, setItem() { throw new Error('storage full'); },
  })), throwing]) {
    const source = createSource({ id: 'damaged', fallback: { count: 0 }, ttl: minute, storage,
      now: () => start, load: () => ({ count: 2 }) });
    const state = observe(source);
    assert.equal(state.latest().data.count, 0);
    await source.refresh();
    assert.equal(source.status, 'fresh');
    assert.equal(state.latest().data.count, 2);
    source.destroy();
  }
});

test('invalid load results never replace the last validated copy', async () => {
  let invalid = false;
  const storage = new MemoryStorage();
  const source = createSource({ id: 'validated', fallback: { count: 0 }, ttl: minute, storage,
    now: () => start, load: () => invalid ? { count: NaN } : { count: 4 } });
  const state = observe(source);
  await source.refresh();
  invalid = true;
  await source.refresh(true);
  assert.equal(source.status, 'stale');
  assert.equal(state.latest().data.count, 4);
  assert.match(state.latest().error ?? '', /invalid data/);
  const cached = createSource({ id: 'validated', fallback: { count: 0 }, ttl: minute, storage,
    now: () => start, load: () => ({ count: 5 }) });
  assert.equal(observe(cached).latest().data.count, 4);
  source.destroy(); cached.destroy();
});

test('unsubscribing and destroying prevent notifications and abort in-flight requests', async () => {
  const result = deferred<number>();
  const storage = new MemoryStorage();
  let signal: AbortSignal | undefined;
  let calls = 0;
  const source = createSource({ id: 'disposed', fallback: 0, ttl: minute, storage, now: () => start,
    load: (requestSignal) => { calls += 1; signal = requestSignal; return result.promise; } });
  let notifications = 0;
  const unsubscribe = source.subscribe(() => { notifications += 1; });
  assert.equal(notifications, 1);
  unsubscribe();
  const pending = source.refresh();
  await Promise.resolve();
  assert.equal(calls, 1);
  const saved = [...storage.entries.values()];
  source.destroy();
  assert.equal(signal?.aborted, true);
  result.resolve(9);
  await pending;
  assert.equal(notifications, 1);
  assert.deepEqual([...storage.entries.values()], saved);
  await source.refresh(true);
  source.subscribe(() => { notifications += 1; });
  assert.equal(calls, 1);
  assert.equal(notifications, 1);
});

test('destroying before a refresh begins prevents the load from running', async () => {
  let calls = 0;
  const source = createSource({ id: 'cancelled', fallback: 0, ttl: minute, storage: null,
    now: () => start, load: () => { calls += 1; return 1; } });
  const pending = source.refresh();
  source.destroy();
  await pending;
  assert.equal(calls, 0);
});

test('weather maps current, seven daily and 24 hourly values with explicit unit requests', async () => {
  const requests: URL[] = [];
  const fetcher = mockFetch((url) => { requests.push(url); return json(forecast()); });
  for (const units of ['celsius', 'fahrenheit'] as const) {
    const source = createWeatherSource({ location, units, fallback: weatherFallback, fetch: fetcher,
      storage: null, now: () => start });
    const state = observe(source);
    await source.refresh();
    assert.equal(state.latest().status, 'fresh');
    const data = state.latest().data;
    assert.deepEqual({ city: data.city, temperature: data.temperature, feelsLike: data.feelsLike,
      code: data.code, wind: data.wind, humidity: data.humidity },
    { city: 'Mossquay', temperature: 18, feelsLike: 17, code: 2, wind: 12, humidity: 60 });
    assert.equal(data.days.length, 7);
    assert.deepEqual(data.days[0], { date: '2026-11-03', low: 10, high: 20, code: 61,
      precipitation: 35, sunrise: '2026-11-03T07:00', sunset: '2026-11-03T17:00' });
    assert.equal(data.hours.length, 24);
    assert.deepEqual(data.hours[0], { time: '2026-11-03T09:00', temperature: 18, code: 3, precipitation: 20 });
    const url = requests[requests.length - 1];
    assert.equal(url.pathname, '/v1/forecast');
    assert.equal(url.searchParams.get('latitude'), '0');
    assert.equal(url.searchParams.get('longitude'), '0');
    assert.equal(url.searchParams.get('temperature_unit'), units);
    assert.equal(url.searchParams.get('wind_speed_unit'), units === 'celsius' ? 'kmh' : 'mph');
    assert.equal(url.searchParams.get('timezone'), 'UTC');
    assert.equal(url.searchParams.get('forecast_days'), '7');
    assert.equal(url.searchParams.get('forecast_hours'), '24');
    source.destroy();
  }
});

test('weather solar times carry the response offset while daily dates and hourly labels stay city-local', async () => {
  for (const [offset, timezone, suffix] of [
    [14 * 3600, 'Etc/GMT-14', '+14:00'], [-12 * 3600, 'Etc/GMT+12', '-12:00'],
    [0, 'UTC', '+00:00'], [345 * 60, undefined, '+05:45'], [-210 * 60, undefined, '-03:30'],
  ] as const) {
    const input = { ...forecast(), utc_offset_seconds: offset,
      ...(timezone === undefined ? {} : { timezone }) };
    const source = createWeatherSource({ location: { ...location, timezone }, units: 'celsius',
      fallback: weatherFallback, storage: null, now: () => start,
      fetch: mockFetch(() => json(input)) });
    const state = observe(source);
    await source.refresh();
    assert.equal(source.status, 'fresh');
    const data = state.latest().data;
    assert.equal(data.timezone, timezone);
    assert.deepEqual(data.days.map((day) => day.date), input.daily.time);
    assert.deepEqual(data.hours.map((item) => item.time), input.hourly.time);
    for (const [i, day] of data.days.entries()) {
      assert.equal(day.sunrise, `${input.daily.sunrise[i]}${suffix}`);
      assert.equal(day.sunset, `${input.daily.sunset[i]}${suffix}`);
      assert.equal(Date.parse(day.sunrise), Date.parse(`${input.daily.sunrise[i]}Z`) - offset * 1000);
      assert.equal(Date.parse(day.sunset), Date.parse(`${input.daily.sunset[i]}Z`) - offset * 1000);
    }
    const sunrise = Date.parse(data.days[0].sunrise);
    assert.equal(resolveScheme(defaultTheme, 'auto', data.days[0], new Date(sunrise - minute)), 'dark');
    assert.equal(resolveScheme(defaultTheme, 'auto', data.days[0], new Date(sunrise)), 'light');
    assert.equal(resolveScheme(defaultTheme, 'auto', data.days[0], new Date(Date.parse(data.days[0].sunset))), 'dark');
    source.destroy();
  }
});

test('weather preserves explicitly zoned solar times and missing polar boundaries', async () => {
  const input = forecast();
  input.daily.sunrise[0] = '2026-11-03T07:00Z';
  input.daily.sunset[0] = '2026-11-03T17:00+01:00';
  const source = createWeatherSource({ location, units: 'celsius', fallback: weatherFallback,
    storage: null, now: () => start, fetch: mockFetch(() => json({ ...input,
      utc_offset_seconds: 3600, timezone: 'Etc/GMT-1', daily: { ...input.daily,
        sunrise: [input.daily.sunrise[0], null, '', ...input.daily.sunrise.slice(3)],
        sunset: [input.daily.sunset[0], '', null, ...input.daily.sunset.slice(3)],
      } })) });
  const state = observe(source);
  await source.refresh();
  assert.equal(source.status, 'fresh');
  assert.equal(state.latest().data.days[0].sunrise, input.daily.sunrise[0]);
  assert.equal(state.latest().data.days[0].sunset, input.daily.sunset[0]);
  for (const day of state.latest().data.days.slice(1, 3)) {
    assert.equal(day.sunrise, '');
    assert.equal(day.sunset, '');
  }
  source.destroy();
});

test('bad forecast timezone metadata cannot replace valid cached weather', async () => {
  for (const metadata of [
    ...[null, '3600', true, 1.5, 90, 15 * 3600, -13 * 3600]
      .map((utc_offset_seconds) => ({ utc_offset_seconds })),
    ...[null, '', '<invalid>', 'Region/Unknown', 1, []]
      .map((timezone) => ({ utc_offset_seconds: 0, timezone })),
    { timezone: 'UTC' },
  ]) {
    let bad = false;
    const source = createWeatherSource({ location, units: 'celsius', fallback: weatherFallback,
      storage: new MemoryStorage(), now: () => start, fetch: mockFetch(() => json(bad
        ? { ...forecast(), ...metadata } : { ...forecast(), utc_offset_seconds: 0, timezone: 'UTC' })) });
    const state = observe(source);
    await source.refresh();
    assert.equal(source.status, 'fresh');
    const valid = state.latest().data;
    bad = true;
    await source.refresh(true);
    assert.equal(source.status, 'stale', JSON.stringify(metadata));
    assert.equal(state.latest().data, valid);
    assert.match(state.latest().error ?? '', /invalid timezone/);
    source.destroy();
  }
});

test('weather cache is isolated by units and location, and malformed forecasts preserve cached data', async () => {
  const storage = new MemoryStorage();
  let time = start;
  let bad = false;
  let calls = 0;
  const fetcher = mockFetch(() => {
    calls += 1;
    const data = forecast();
    if (bad) data.hourly.weather_code[0] = 999;
    return json(data);
  });
  const options = { location, units: 'celsius' as const, fallback: weatherFallback,
    fetch: fetcher, storage, now: () => time };
  const source = createWeatherSource(options);
  await source.refresh();
  const cached = createWeatherSource(options);
  const cachedState = observe(cached);
  assert.equal(cachedState.latest().data.temperature, 18);
  await cached.refresh();
  assert.equal(calls, 1);
  const imperial = createWeatherSource({ ...options, units: 'fahrenheit' });
  const other = createWeatherSource({ ...options, location: { ...location, name: 'Fernquay', latitude: 1 } });
  assert.equal(observe(imperial).latest().updatedAt, null);
  assert.equal(observe(other).latest().updatedAt, null);
  time += 15 * minute;
  bad = true;
  await cached.refresh();
  assert.equal(cached.status, 'stale');
  assert.equal(cachedState.latest().data.temperature, 18);
  assert.equal(cachedState.latest().updatedAt, start);
  source.destroy(); cached.destroy(); imperial.destroy(); other.destroy();
});

test('weather rejects incomplete, null and invalid remote fields', async () => {
  const missing = forecast(); missing.daily.sunrise.pop();
  const humidity = forecast(); humidity.current.relative_humidity_2m = 101;
  const date = forecast(); date.daily.time[0] = '2026-02-31';
  const inverted = forecast(); inverted.daily.temperature_2m_min[0] = 30;
  const probability = forecast(); probability.hourly.precipitation_probability[0] = -1;
  for (const value of [{}, null, { error: true }, missing, humidity, date, inverted, probability,
    { ...forecast(), current: { ...forecast().current, temperature_2m: null } }]) {
    const source = createWeatherSource({ location, units: 'celsius', fallback: weatherFallback,
      fetch: mockFetch(() => json(value)), storage: null, now: () => start });
    const state = observe(source);
    await source.refresh();
    assert.equal(source.status, 'offline');
    assert.equal(state.latest().data, weatherFallback);
    source.destroy();
  }
});

test('weather deadlines cover stalled fetches and JSON bodies and allow recovery after backoff',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    for (const stage of ['fetch', 'body']) {
      let time = start;
      let calls = 0;
      let stalled = true;
      const signals: AbortSignal[] = [];
      const source = createWeatherSource({ location, units: 'celsius', fallback: weatherFallback,
        storage: null, now: () => time, timeoutMs: 25, fetch: mockFetch((_, init) => {
          calls += 1;
          signals.push(init.signal as AbortSignal);
          if (!stalled) return json(forecast());
          return stage === 'fetch' ? new Promise<Response>(() => {}) : stalledBody();
        }) });
      t.after(() => source.destroy());
      const state = observe(source);
      const pending = source.refresh();
      assert.equal(source.refresh(true), pending);
      await setImmediate();
      t.mock.timers.tick(25);
      await pending;
      assert.equal(signals[0].aborted, true);
      assert.equal(source.status, 'offline', stage);
      assert.equal(state.latest().data, weatherFallback);
      assert.equal(state.latest().updatedAt, null);
      assert.match(state.latest().error ?? '', /timed out/);
      await source.refresh(true);
      assert.equal(calls, 1);
      time += minute;
      stalled = false;
      const retry = source.refresh();
      assert.notEqual(retry, pending);
      await retry;
      assert.equal(calls, 2);
      assert.equal(source.status, 'fresh');
      assert.equal(state.latest().data.temperature, 18);
      assert.equal(state.latest().error, null);
      t.mock.timers.tick(25);
      assert.equal(signals[1].aborted, false);
      source.destroy();
    }
  });

test('Bootstrap cold loads stay neutral until both endpoints settle and still expose failures', async (t) => {
  for (const fail of [false, true]) {
    const blog = deferred<Response>();
    const releases = deferred<Response>();
    const source = createBootstrapSource({ fallback: storiesFallback, storage: null, now: () => start,
      fetch: mockFetch((url) => url.hostname === 'blog.getbootstrap.com' ? blog.promise : releases.promise) });
    t.after(() => source.destroy());
    const state = observe(source);
    assert.deepEqual(state.latest(), { data: storiesFallback, status: 'loading', updatedAt: null, error: null });
    const pending = source.refresh();
    assert.equal(source.status, 'loading');
    blog.resolve(new Response(rss()));
    await setImmediate();
    assert.equal(state.latest().data[0].publication, 'Bootstrap blog');
    assert.equal(source.status, 'loading');
    assert.equal(state.latest().error, null);
    releases.resolve(fail ? json({}, { status: 503 }) : json([release()]));
    await pending;
    assert.equal(source.status, fail ? 'stale' : 'fresh');
    assert.equal(Boolean(state.latest().error), fail);
    assert.equal(state.latest().data.length, fail ? 1 : 2);
  }
});

test('Bootstrap maps headline-only RSS and prereleases, sorting newest first', async () => {
  const requests: URL[] = [];
  const source = createBootstrapSource({ fallback: storiesFallback, storage: null, now: () => start,
    fetch: mockFetch((url) => {
      requests.push(url);
      return url.hostname === 'blog.getbootstrap.com' ? new Response(rss()) : json([release()]);
    }) });
  const state = observe(source);
  assert.equal(state.latest().data, storiesFallback);
  const pending = source.refresh();
  assert.equal(source.refresh(true), pending);
  await pending;
  assert.equal(requests.length, 2);
  assert.equal(source.status, 'fresh');
  assert.equal(state.latest().data.length, 2);
  assert.equal(state.latest().data[0].title, 'Bootstrap 6 alpha');
  assert.equal(state.latest().data[1].title, 'Bootstrap & components');
  assert.ok(state.latest().data.every((story) => story.live && story.excerpt === ''));
  assert.ok(state.latest().data.every((story) => story.category === 'bootstrap'));
  assert.equal(requests.find((url) => url.hostname === 'api.github.com')?.pathname,
    '/repos/twbs/bootstrap/releases');
  source.destroy();
});

test('Bootstrap caches each endpoint hourly and force cannot bypass the release interval', async () => {
  let time = start;
  let blogCalls = 0;
  let releaseCalls = 0;
  const storage = new MemoryStorage();
  const options = { fallback: storiesFallback, storage, now: () => time, fetch: mockFetch((url) => {
    if (url.hostname === 'blog.getbootstrap.com') { blogCalls += 1; return new Response(rss()); }
    releaseCalls += 1; return json([release()]);
  }) };
  const source = createBootstrapSource(options);
  await source.refresh();
  await source.refresh();
  assert.equal(blogCalls, 1); assert.equal(releaseCalls, 1);
  await source.refresh(true);
  assert.equal(blogCalls, 2); assert.equal(releaseCalls, 1);
  const remounted = createBootstrapSource(options);
  assert.equal(remounted.status, 'fresh');
  await remounted.refresh(true);
  assert.equal(releaseCalls, 1);
  time += hour;
  assert.equal(source.status, 'stale');
  await source.refresh();
  assert.equal(blogCalls, 4); assert.equal(releaseCalls, 2);
  source.destroy(); remounted.destroy();
});

test('Bootstrap deadlines retain the healthy endpoint and respect backoff and the hourly release floor',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    for (const endpoint of ['blog.getbootstrap.com', 'api.github.com']) {
      for (const stage of ['fetch', 'body']) {
        let time = start;
        let stalled = true;
        let calls = 0;
        const signals: AbortSignal[] = [];
        const source = createBootstrapSource({ fallback: storiesFallback, storage: null,
          now: () => time, timeoutMs: 25, fetch: mockFetch((url, init) => {
            if (url.hostname === endpoint) {
              calls += 1;
              signals.push(init.signal as AbortSignal);
              if (stalled) return stage === 'fetch' ? new Promise<Response>(() => {}) : stalledBody();
            }
            return url.hostname === 'blog.getbootstrap.com' ? new Response(rss()) : json([release()]);
          }) });
        t.after(() => source.destroy());
        const state = observe(source);
        const pending = source.refresh();
        assert.equal(source.refresh(true), pending);
        await setImmediate();
        t.mock.timers.tick(25);
        await pending;
        assert.equal(signals[0].aborted, true);
        assert.equal(source.status, 'stale', `${endpoint} ${stage}`);
        assert.equal(state.latest().data.length, 1);
        assert.equal(state.latest().data[0].publication,
          endpoint === 'api.github.com' ? 'Bootstrap blog' : 'GitHub releases');
        assert.match(state.latest().error ?? '', /timed out/);
        stalled = false;
        await source.refresh(true);
        assert.equal(calls, 1);
        time += minute;
        await source.refresh();
        assert.equal(calls, endpoint === 'api.github.com' ? 1 : 2);
        time = start + hour;
        const retry = source.refresh();
        assert.notEqual(retry, pending);
        await retry;
        assert.equal(calls, 2);
        assert.equal(source.status, 'fresh');
        assert.equal(state.latest().data.length, 2);
        assert.equal(state.latest().error, null);
        t.mock.timers.tick(25);
        assert.equal(signals[1].aborted, false);
        source.destroy();
      }
    }
  });

test('Bootstrap refresh settles with fallback when both endpoints ignore cancellation',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const signals: AbortSignal[] = [];
    const source = createBootstrapSource({ fallback: storiesFallback, storage: null,
      now: () => start, timeoutMs: 25, fetch: mockFetch((_, init) => {
        signals.push(init.signal as AbortSignal);
        return new Promise<Response>(() => {});
      }) });
    t.after(() => source.destroy());
    const state = observe(source);
    const pending = source.refresh();
    await setImmediate();
    t.mock.timers.tick(25);
    await pending;
    assert.equal(signals.length, 2);
    assert.ok(signals.every((signal) => signal.aborted));
    assert.equal(source.status, 'offline');
    assert.equal(state.latest().data, storiesFallback);
    assert.equal(state.latest().updatedAt, null);
    assert.match(state.latest().error ?? '', /timed out/);
  });

test('GitHub rate limits respect Retry-After and reset headers across deduped refreshes and remounts', async () => {
  for (const status of [403, 429]) {
    let time = start;
    let releaseCalls = 0;
    const storage = new MemoryStorage();
    const options = { fallback: storiesFallback, storage, now: () => time,
      fetch: mockFetch((url) => {
        if (url.hostname === 'blog.getbootstrap.com') return new Response(rss());
        releaseCalls += 1;
        return releaseCalls === 1 ? json({ message: 'rate limited' }, { status, headers: {
          'Retry-After': '7200', 'X-RateLimit-Reset': String((start + 3 * hour) / 1000),
        } }) : json([release()]);
      }) };
    const source = createBootstrapSource(options);
    const state = observe(source);
    await Promise.all([source.refresh(), source.refresh(), source.refresh(true)]);
    assert.equal(releaseCalls, 1);
    assert.equal(source.status, 'stale');
    assert.equal(state.latest().data.length, 1);
    assert.match(state.latest().error ?? '', new RegExp(`HTTP ${status}`));
    time += 2 * hour;
    const remounted = createBootstrapSource(options);
    await remounted.refresh(true);
    assert.equal(releaseCalls, 1);
    time += hour;
    await remounted.refresh(true);
    assert.equal(releaseCalls, 2);
    assert.equal(remounted.status, 'fresh');
    assert.equal(observe(remounted).latest().error, null);
    source.destroy(); remounted.destroy();
  }
});

test('HTTP-date Retry-After is respected and short GitHub backoffs retain the hourly floor', async () => {
  let time = start;
  let calls = 0;
  const source = createBootstrapSource({ fallback: storiesFallback, storage: null, now: () => time,
    fetch: mockFetch((url) => {
      if (url.hostname === 'blog.getbootstrap.com') return new Response(rss());
      calls += 1;
      return json({}, { status: 429, headers: { 'Retry-After': new Date(start + 2 * hour).toUTCString() } });
    }) });
  await source.refresh();
  time += hour;
  await source.refresh(true);
  assert.equal(calls, 1);
  time += hour;
  await source.refresh();
  assert.equal(calls, 2);
  source.destroy();

  calls = 0; time = start;
  const hourly = createBootstrapSource({ fallback: storiesFallback, storage: null, now: () => time,
    fetch: mockFetch((url) => {
      if (url.hostname === 'blog.getbootstrap.com') return new Response(rss());
      calls += 1; return json({}, { status: 403 });
    }) });
  await hourly.refresh();
  time += minute;
  await hourly.refresh(true);
  assert.equal(calls, 1);
  hourly.destroy();
});

test('RSS safely extracts text, rejects unsafe destinations, and ignores remote excerpts', async () => {
  const item = (url: string, title = 'A safe headline') => `<item><title><![CDATA[${title}]]></title>
    <link>${url}</link><pubDate>Tue, 03 Nov 2026 09:00:00 GMT</pubDate></item>`;
  const xml = rss([
    item('https://blog.getbootstrap.com/2026/11/03/safe/', '<b>Safe</b> headline &#8212; preview'),
    item('javascript:alert(1)'), item('http://blog.getbootstrap.com/unsafe/'),
    item('https://blog.getbootstrap.com.untrusted.invalid/unsafe/'),
    item('https://reader@blog.getbootstrap.com/unsafe/'),
    item('https://blog.getbootstrap.com:8443/unsafe/'),
  ].join(''));
  const source = createBootstrapSource({ fallback: storiesFallback, storage: null, now: () => start,
    fetch: mockFetch((url) => url.hostname === 'blog.getbootstrap.com' ? new Response(xml) : json([
      release(), release({ html_url: 'https://github.com/other/project/releases/tag/v1' }),
      release({ html_url: 'https://untrusted.invalid/releases/tag/v1' }), release({ draft: true }),
    ])) });
  const state = observe(source);
  await source.refresh();
  assert.equal(state.latest().data.length, 2);
  const blog = state.latest().data.find((story) => story.publication === 'Bootstrap blog');
  assert.equal(blog?.title, 'Safe headline &#8212; preview');
  assert.equal(blog?.excerpt, '');
  assert.equal(blog?.url, 'https://blog.getbootstrap.com/2026/11/03/safe/');
  source.destroy();
});

test('malformed feeds and releases preserve the previous data and recover after backoff', async () => {
  let time = start;
  let bad = false;
  const source = createBootstrapSource({ fallback: storiesFallback, storage: new MemoryStorage(), now: () => time,
    fetch: mockFetch((url) => url.hostname === 'blog.getbootstrap.com'
      ? new Response(bad ? '<rss><channel><item></channel></rss>' : rss())
      : json(bad ? { invalid: true } : [release()])) });
  const state = observe(source);
  await source.refresh();
  const valid = state.latest().data;
  time += hour;
  bad = true;
  await source.refresh();
  assert.equal(source.status, 'stale');
  assert.deepEqual(state.latest().data, valid);
  assert.equal(state.latest().updatedAt, start);
  time += hour;
  bad = false;
  await source.refresh();
  assert.equal(source.status, 'fresh');
  assert.equal(state.latest().error, null);
  source.destroy();
});

test('factory caches are validated again before use, including official destination checks', async () => {
  const storage = new MemoryStorage();
  const weatherOptions = { location, units: 'celsius' as const, fallback: weatherFallback,
    storage, now: () => start, fetch: mockFetch(() => json(forecast())) };
  const weather = createWeatherSource(weatherOptions);
  await weather.refresh();
  const bootstrapOptions = { fallback: storiesFallback, storage, now: () => start,
    fetch: mockFetch((url) => url.hostname === 'blog.getbootstrap.com'
      ? new Response(rss()) : json([release()])) };
  const bootstrap = createBootstrapSource(bootstrapOptions);
  await bootstrap.refresh();
  for (const [key, value] of storage.entries) {
    const cached = JSON.parse(value);
    if (key.includes('weather:')) cached.data.hours[0].code = 999;
    else cached.data[0].url = 'https://untrusted.invalid/poisoned/';
    storage.entries.set(key, JSON.stringify(cached));
  }
  const badWeather = createWeatherSource(weatherOptions);
  const badBootstrap = createBootstrapSource(bootstrapOptions);
  assert.equal(observe(badWeather).latest().data, weatherFallback);
  assert.equal(observe(badBootstrap).latest().data, storiesFallback);
  assert.equal(badWeather.status, 'loading');
  assert.equal(badBootstrap.status, 'loading');
  weather.destroy(); bootstrap.destroy(); badWeather.destroy(); badBootstrap.destroy();
});

test('invalid RSS including external entity declarations cannot become live stories', async () => {
  for (const xml of ['<html>not RSS</html>', '<rss><channel>',
    '<!DOCTYPE rss SYSTEM "https://untrusted.invalid/entity"><rss><channel/></rss>',
    rss('<item><title>Invalid &entity;</title></item>'),
    rss('<item><title>Invalid &#99999999;</title></item>'),
    rss('<item><title>Bad URL</title><link>javascript:alert(1)</link><pubDate>invalid</pubDate></item>')]) {
    const source = createBootstrapSource({ fallback: storiesFallback, storage: null, now: () => start,
      fetch: mockFetch((url) => url.hostname === 'blog.getbootstrap.com'
        ? new Response(xml) : json({ invalid: true })) });
    const state = observe(source);
    await source.refresh();
    assert.equal(source.status, 'offline');
    assert.equal(state.latest().data, storiesFallback);
    source.destroy();
  }
});

test('Bootstrap disposal aborts both requests and ignores late responses', async () => {
  const signals: AbortSignal[] = [];
  const replies = deferred<Response>();
  const source = createBootstrapSource({ fallback: storiesFallback, storage: null, now: () => start,
    fetch: mockFetch((_, init) => { signals.push(init.signal as AbortSignal); return replies.promise; }) });
  const state = observe(source);
  const pending = source.refresh();
  await Promise.resolve();
  assert.equal(signals.length, 2);
  source.destroy();
  const count = state.snapshots.length;
  assert.ok(signals.every((signal) => signal.aborted));
  await pending;
  replies.resolve(new Response('{}'));
  await setImmediate();
  assert.equal(state.snapshots.length, count);
});

test('city search encodes queries, validates results and returns only location fields', async () => {
  let calls = 0;
  const fetcher = mockFetch((url) => {
    calls += 1;
    assert.equal(url.pathname, '/v1/search');
    assert.equal(url.searchParams.get('name'), 'Mossquay & Fernquay');
    assert.equal(url.searchParams.get('count'), '10');
    return json({ results: [location, { ...location, population: 1000, id: 7 },
      { name: 'Fernquay', latitude: 1, longitude: -1 },
      { name: 'Invalid', latitude: 100, longitude: 0 },
      { name: '', latitude: 0, longitude: 0 }, { ...location, timezone: '<invalid>' }] });
  });
  assert.deepEqual(await searchCities('  Mossquay   & Fernquay  ', fetcher),
    [location, { name: 'Fernquay', latitude: 1, longitude: -1 }]);
  assert.deepEqual(await searchCities(' ', fetcher), []);
  assert.deepEqual(await searchCities('M', fetcher), []);
  assert.equal(calls, 1);
});

test('city search handles no matches and rejects malformed responses and HTTP failures', async () => {
  assert.deepEqual(await searchCities('Mossquay', mockFetch(() => json({}))), []);
  assert.deepEqual(await searchCities('Mossquay', mockFetch(() => json({ results: [] }))), []);
  for (const value of [null, [], { results: 'wrong' }, { results: [null] }, { error: true }]) {
    await assert.rejects(searchCities('Mossquay', mockFetch(() => json(value))), /invalid locations/);
  }
  await assert.rejects(searchCities('Mossquay', mockFetch(() => json({}, { status: 503 }))), /HTTP 503/);
});

test('city search preserves validated regions to distinguish repeated city names', async () => {
  const first = { ...location, country: 'Cloudfern Isles', admin1: 'North Mossreach' };
  const second = { ...location, latitude: 1, country: 'Willowglass Coast', admin1: 'South Mossreach' };
  assert.deepEqual(await searchCities('Mossquay', mockFetch(() => json({ results: [
    { ...first, country: ` ${first.country} `, admin1: ` ${first.admin1} `, population: 1000 }, second,
    { name: 'Fernquay', latitude: 2, longitude: 0, country: 4, admin1: ' ' },
    { name: 'Bramblequay', latitude: 3, longitude: 0, country: 'x'.repeat(121), admin1: {} },
  ] }))), [first, second,
    { name: 'Fernquay', latitude: 2, longitude: 0 },
    { name: 'Bramblequay', latitude: 3, longitude: 0 }]);
});

test('city search deadlines release consumer pending state for stalled fetches and JSON bodies',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    for (const stage of ['fetch', 'body']) {
      let signal: AbortSignal | undefined;
      let searching = true;
      const fetcher = mockFetch((_, init) => {
        signal = init.signal as AbortSignal;
        return stage === 'fetch' ? new Promise<Response>(() => {}) : stalledBody();
      });
      const query = searchCities('Mossquay', fetcher, { timeoutMs: 25, now: () => start })
        .finally(() => { searching = false; });
      const rejected = assert.rejects(query, /City search timed out/);
      await setImmediate();
      assert.equal(searching, true);
      t.mock.timers.tick(25);
      await rejected;
      assert.equal(searching, false);
      assert.equal(signal?.aborted, true);
      assert.deepEqual(await searchCities('Mossquay', mockFetch(() => json({ results: [location] })),
        { timeoutMs: 25, now: () => start }), [location]);
    }
  });

test('location requests compose lifetime cancellation, skip aborted fetches and ignore late bodies',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const controller = new AbortController();
    const late = deferred<Response>();
    let signal: AbortSignal | undefined;
    let calls = 0;
    let reads = 0;
    const fetcher = mockFetch((_, init) => {
      calls += 1;
      signal = init.signal as AbortSignal;
      return late.promise;
    });
    const options = { signal: controller.signal, timeoutMs: 25, now: () => start };
    const cancelled = new Error('Location request cancelled.');
    const query = searchCities('Mossquay', fetcher, options);
    const rejected = assert.rejects(query, (reason) => reason === cancelled);
    controller.abort(cancelled);
    await rejected;
    assert.equal(signal?.aborted, true);
    assert.equal(signal?.reason, cancelled);
    const response = json({ results: [location] });
    response.json = async () => { reads += 1; return { results: [location] }; };
    late.resolve(response);
    await setImmediate();
    assert.equal(reads, 0);
    await assert.rejects(searchCities('Mossquay', fetcher, options), (reason) => reason === cancelled);
    assert.deepEqual(await resolveDefaultLocation('America/Port_of_Spain', fetcher, options),
      { name: 'Harborview', latitude: 0, longitude: 0, timezone: 'UTC' });
    assert.equal(calls, 1);
    t.mock.timers.tick(25);
    assert.equal(signal?.reason, cancelled);
  });

test('city search uses the injected clock for rate-limit recovery', async () => {
  await assert.rejects(searchCities('Mossquay', mockFetch(() => json({}, { status: 429,
    headers: { 'Retry-After': '120' } })), { now: () => new Date(start) }),
  { message: 'City search returned HTTP 429. Try again later.', retryAt: start + 2 * minute });
});

test('default location deadlines return the neutral fallback for stalled fetches and bodies',
  { timeout: 1000 }, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    for (const stage of ['fetch', 'body']) {
      let signal: AbortSignal | undefined;
      const pending = resolveDefaultLocation('America/Port_of_Spain', mockFetch((_, init) => {
        signal = init.signal as AbortSignal;
        return stage === 'fetch' ? new Promise<Response>(() => {}) : stalledBody();
      }), { timeoutMs: 25, now: () => start });
      await setImmediate();
      t.mock.timers.tick(25);
      assert.deepEqual(await pending, { name: 'Harborview', latitude: 0, longitude: 0, timezone: 'UTC' });
      assert.equal(signal?.aborted, true);
    }
  });

test('default location derives a timezone city, with a neutral fallback and no permission prompts', async () => {
  let calls = 0;
  const zone = 'America/Port_of_Spain';
  const resolved = { ...location, latitude: 1, longitude: 1, timezone: zone };
  const fetcher = mockFetch((url) => {
    calls += 1;
    assert.equal(url.searchParams.get('name'), zone.split('/').at(-1)?.replaceAll('_', ' '));
    assert.equal(url.searchParams.get('count'), '8');
    return json({ results: [location, resolved] });
  });
  assert.deepEqual(await resolveDefaultLocation(zone, fetcher), resolved);
  const fallback: Location = { name: 'Harborview', latitude: 0, longitude: 0, timezone: 'UTC' };
  for (const timezone of ['UTC', 'Etc/GMT+1', '', 'Region/123', 'Region/North_Mossquay']) {
    assert.deepEqual(await resolveDefaultLocation(timezone, fetcher), fallback);
  }
  assert.equal(calls, 1);
  assert.deepEqual(await resolveDefaultLocation(zone, mockFetch(() => json({}))), fallback);
  assert.deepEqual(await resolveDefaultLocation(zone, mockFetch(() => {
    throw new Error('offline');
  })), fallback);
});

test('default locations match canonical IANA aliases in either direction', async () => {
  for (const pair of [
    ['Asia/Calcutta', 'Asia/Kolkata'], ['Asia/Saigon', 'Asia/Ho_Chi_Minh'],
    ['Asia/Katmandu', 'Asia/Kathmandu'], ['Europe/Kiev', 'Europe/Kyiv'],
  ]) {
    for (const [browserZone, resultZone] of [pair, [...pair].reverse()]) {
      const matching = { name: 'Willowmere', latitude: 1, longitude: 1, timezone: resultZone,
        country: 'Cloudfern Isles', admin1: 'North Mossreach' };
      const fetcher = mockFetch((url) => {
        assert.equal(url.searchParams.get('count'), '8');
        assert.equal(url.searchParams.get('name'), browserZone.split('/').at(-1)?.replaceAll('_', ' '));
        return json({ results: [
          { name: 'Willowmere', latitude: 0, longitude: 0, timezone: 'Africa/Johannesburg' },
          { name: 'Willowmere', latitude: 2, longitude: 2 }, matching,
        ] });
      });
      assert.deepEqual(await resolveDefaultLocation(browserZone, fetcher), matching);
    }
  }
});

test('regional timezone aliases geocode the canonical city instead of the alias label', async () => {
  for (const timezone of ['US/Pacific', 'US/Eastern', 'Canada/Pacific', 'Brazil/East']) {
    const canonical = new Intl.DateTimeFormat('en', { timeZone: timezone }).resolvedOptions().timeZone;
    const matching = { ...location, timezone: canonical };
    assert.deepEqual(await resolveDefaultLocation(timezone, mockFetch((url) => {
      assert.equal(url.searchParams.get('name'), canonical.split('/').at(-1)?.replaceAll('_', ' '));
      assert.equal(url.searchParams.get('count'), '8');
      return json({ results: [matching] });
    })), matching);
  }
});

test('default locations use the neutral fallback when no result has the visitor timezone', async () => {
  for (const result of [location, { ...location, timezone: 'Region/Mossquay' },
    { ...location, timezone: undefined }]) {
    assert.deepEqual(await resolveDefaultLocation('Asia/Kolkata', mockFetch(() => json({ results: [result] }))),
      { name: 'Harborview', latitude: 0, longitude: 0, timezone: 'UTC' });
  }
});
