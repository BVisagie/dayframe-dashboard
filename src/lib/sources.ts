import type { Location, Settings, SourceStatus, Story, Weather } from './types.ts';

export interface SourceSnapshot<T> {
  data: T;
  status: SourceStatus;
  updatedAt: number | null;
  error: string | null;
}

export interface Source<T> {
  readonly id: string;
  readonly status: SourceStatus;
  subscribe(listener: (snapshot: SourceSnapshot<T>) => void): () => void;
  refresh(force?: boolean): Promise<void>;
  destroy(): void;
}

export type SourceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type SourceClock = () => number | Date;
export type SourceFetch = typeof fetch;

interface DeadlineOptions {
  /** Integer milliseconds from 1 to 60,000; defaults to 10,000. */
  timeoutMs?: number;
}

export interface SourceRequestOptions extends DeadlineOptions {
  signal?: AbortSignal;
  now?: SourceClock;
}

export interface SourceOptions<T> extends DeadlineOptions {
  id: string;
  load: (signal: AbortSignal) => T | Promise<T>;
  fallback: T;
  ttl: number;
  storage?: SourceStorage | null;
  now?: SourceClock;
  validate?: (value: unknown) => value is T;
  minimumInterval?: number;
}

const minute = 60_000;
const hour = 60 * minute;
const cacheVersion = 1;
const unavailable = 'This source is unavailable. Try again later.';

function browserStorage(): SourceStorage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function clock(now: SourceClock = Date.now): () => number {
  return () => Number(now());
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonnegative(value: unknown): value is number {
  return finite(value) && value >= 0;
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function jsonShape(value: unknown, example: unknown, depth = 0): boolean {
  if (depth > 32 || value === undefined) return false;
  if (value === null || example === null) return value === example;
  if (typeof value !== typeof example) return false;
  if (typeof value === 'number') return finite(value);
  if (typeof value !== 'object') return ['string', 'boolean'].includes(typeof value);
  if (Array.isArray(value)) {
    return Array.isArray(example) && value.every((item) => example.length
      ? jsonShape(item, example[0], depth + 1) : jsonValue(item, depth + 1));
  }
  return record(value) && record(example)
    && Object.keys(example).every((key) => jsonShape(value[key], example[key], depth + 1))
    && Object.values(value).every((item) => jsonValue(item, depth + 1));
}

function jsonValue(value: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return finite(value);
  if (Array.isArray(value)) return value.every((item) => jsonValue(item, depth + 1));
  return record(value) && Object.values(value).every((item) => jsonValue(item, depth + 1));
}

class SourceError extends Error {
  readonly retryAt: number;
  constructor(message: string, retryAt = 0) { super(message); this.retryAt = retryAt; }
}

function deadline(timeoutMs = 10_000): number {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > minute) {
    throw new Error('A request timeout must be an integer from 1 to 60,000 milliseconds.');
  }
  return timeoutMs;
}

function withDeadline<T>(operation: (signal: AbortSignal) => T | Promise<T>, timeoutMs: number,
  label: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => {
      const reason: unknown = signal?.reason ?? new DOMException('The request was cancelled.', 'AbortError');
      reject(reason);
      controller.abort(reason);
    };
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      const reason = new SourceError(`${label} timed out. Try again later.`);
      reject(reason);
      controller.abort(reason);
    }, timeoutMs);
  });
  let result: Promise<T>;
  try {
    result = controller.signal.aborted ? Promise.reject(controller.signal.reason)
      : Promise.resolve(operation(controller.signal));
  } catch (reason) { result = Promise.reject(reason); }
  // Abort is advisory; the race also settles loaders and body reads that ignore it.
  return Promise.race([result, cancelled]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  });
}

/** Refresh is explicit; the application owns polling and pauses it when appropriate. */
export function createSource<T>(options: SourceOptions<T>): Source<T> {
  const { id, load, fallback, ttl, minimumInterval = 0 } = options;
  if (!text(id) || !nonnegative(ttl) || !nonnegative(minimumInterval)) {
    throw new Error('A source needs an id and valid refresh intervals.');
  }
  const timeoutMs = deadline(options.timeoutMs);
  const now = clock(options.now);
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const key = `dayframe:source:v${cacheVersion}:${id}`;
  const validate = options.validate ?? ((value: unknown): value is T => jsonShape(value, fallback));
  let data = fallback;
  let updatedAt: number | null = null;
  let lastAttempt: number | null = null;
  let retryAt = 0;
  let failures = 0;
  let error: string | null = null;
  let failed = false;
  let destroyed = false;
  let pending: Promise<void> | null = null;
  let controller: AbortController | null = null;
  const listeners = new Set<(snapshot: SourceSnapshot<T>) => void>();

  try {
    const cached: unknown = JSON.parse(storage?.getItem(key) ?? 'null');
    if (record(cached) && cached.version === cacheVersion
      && (cached.updatedAt === null || (nonnegative(cached.updatedAt) && cached.updatedAt <= now()))
      && (cached.lastAttempt === null || (nonnegative(cached.lastAttempt) && cached.lastAttempt <= now()))
      && nonnegative(cached.retryAt) && Number.isInteger(cached.failures)
      && nonnegative(cached.failures) && cached.failures <= 100
      && (cached.updatedAt === null || validate(cached.data))) {
      if (cached.updatedAt !== null) { data = cached.data as T; updatedAt = cached.updatedAt; }
      lastAttempt = cached.lastAttempt;
      retryAt = cached.retryAt;
      failures = cached.failures;
      failed = failures > 0;
      if (failed) error = unavailable;
    }
  } catch { /* Storage can be disabled, full, or contain an obsolete or damaged copy. */ }

  function status(): SourceStatus {
    if (failed) return updatedAt === null ? 'offline' : 'stale';
    if (updatedAt === null) return 'loading';
    return now() - updatedAt < ttl ? 'fresh' : 'stale';
  }

  function snapshot(): SourceSnapshot<T> {
    return { data, status: status(), updatedAt, error };
  }

  function notify(listener: (value: SourceSnapshot<T>) => void): void {
    try { listener(snapshot()); } catch { /* One consumer must not interrupt the other subscribers. */ }
  }

  function emit(): void { listeners.forEach(notify); }

  function save(): void {
    try {
      storage?.setItem(key, JSON.stringify({
        version: cacheVersion, ...(updatedAt === null ? {} : { data }),
        updatedAt, lastAttempt, retryAt, failures,
      }));
    } catch { /* An in-memory source remains usable when persistence is unavailable. */ }
  }

  return {
    id,
    get status() { return status(); },
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      notify(listener);
      return () => { listeners.delete(listener); };
    },
    refresh(force = false) {
      if (destroyed) return Promise.resolve();
      if (pending) return pending;
      const time = now();
      if (time < retryAt || (lastAttempt !== null && time - lastAttempt < minimumInterval)
        || (!force && status() === 'fresh')) {
        emit();
        return Promise.resolve();
      }
      const request = new AbortController();
      controller = request;
      lastAttempt = time;
      failed = false;
      error = null;
      // Persist attempt timing as well as successes so remounts cannot evade an API's limit.
      save();
      pending = withDeadline((signal) => Promise.resolve().then(() => {
        if (destroyed) throw new SourceError(unavailable);
        return load(signal);
      }), timeoutMs, 'This source', request.signal).then((value) => {
        if (destroyed) return;
        if (!validate(value)) throw new SourceError('This source returned invalid data.');
        data = value;
        updatedAt = now();
        failures = 0;
        retryAt = 0;
        save();
        emit();
      }).catch((reason: unknown) => {
        if (destroyed) return;
        failed = true;
        failures = Math.min(failures + 1, 100);
        error = reason instanceof SourceError ? reason.message : unavailable;
        retryAt = Math.max(now() + Math.min(hour, minute * 2 ** Math.min(failures - 1, 6)),
          reason instanceof SourceError ? reason.retryAt : 0);
        save();
        emit();
      }).finally(() => { pending = null; controller = null; });
      emit();
      return pending;
    },
    destroy() {
      destroyed = true;
      controller?.abort();
      listeners.clear();
    },
  };
}

function retryTime(response: Response, now: number): number {
  const after = response.headers.get('retry-after');
  const delay = after !== null && /^\d+(?:\.\d+)?$/.test(after.trim())
    ? now + Number(after) * 1000 : Date.parse(after ?? '');
  const reset = response.headers.get('x-ratelimit-reset');
  const resetAt = reset !== null && /^\d+$/.test(reset) ? Number(reset) * 1000 : 0;
  return Math.max(now + minute, finite(delay) ? delay : 0, finite(resetAt) ? resetAt : 0);
}

function request<T>(url: URL, fetcher: SourceFetch, label: string, now: () => number,
  read: (response: Response) => T | Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return withDeadline(async (requestSignal) => {
    const response = await fetcher(url, {
      credentials: 'omit', mode: 'cors', redirect: 'error', signal: requestSignal,
      headers: { Accept: url.pathname.endsWith('.xml') ? 'application/rss+xml' : 'application/json' },
    });
    if (!response.ok) {
      throw new SourceError(`${label} returned HTTP ${response.status}. Try again later.`,
        response.status === 403 || response.status === 429 ? retryTime(response, now()) : 0);
    }
    if (requestSignal.aborted) throw requestSignal.reason;
    return read(response);
  }, timeoutMs, label, signal);
}

const weatherCodes = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65,
  66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
const probability = (value: unknown): value is number => finite(value) && value >= 0 && value <= 100;
const temperature = (value: unknown): value is number => finite(value) && value >= -150 && value <= 180;
const weatherCode = (value: unknown): value is number => finite(value) && weatherCodes.has(value);

function date(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function dateTime(value: unknown): value is string {
  if (typeof value !== 'string' || !date(value.slice(0, 10))) return false;
  return /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function timezone(value: unknown): value is string {
  if (!text(value) || value.length > 100) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}

function validWeather(value: unknown): value is Weather {
  return record(value) && text(value.city) && temperature(value.temperature)
    && (value.timezone === undefined || timezone(value.timezone))
    && temperature(value.feelsLike) && weatherCode(value.code) && nonnegative(value.wind)
    && probability(value.humidity) && Array.isArray(value.days) && value.days.length === 7
    && value.days.every((day) => record(day) && date(day.date) && temperature(day.low)
      && temperature(day.high) && day.low <= day.high && weatherCode(day.code)
      && probability(day.precipitation) && (day.sunrise === '' || dateTime(day.sunrise))
      && (day.sunset === '' || dateTime(day.sunset)))
    && Array.isArray(value.hours) && value.hours.length === 24
    && value.hours.every((item) => record(item) && dateTime(item.time)
      && temperature(item.temperature) && weatherCode(item.code) && probability(item.precipitation));
}

function column(data: Record<string, unknown>, key: string, count: number): unknown[] {
  const values = data[key];
  if (!Array.isArray(values) || values.length < count || values.length > 400) {
    throw new SourceError('The forecast returned incomplete data.');
  }
  return values;
}

function parseWeather(value: unknown, city: string): Weather {
  if (!record(value) || !record(value.current) || !record(value.daily) || !record(value.hourly)) {
    throw new SourceError('The forecast returned invalid data.');
  }
  const offset = value.utc_offset_seconds;
  if ((offset !== undefined && (!finite(offset) || !Number.isInteger(offset / 60)
    || offset < -12 * 3600 || offset > 14 * 3600))
    || (value.timezone !== undefined && (!timezone(value.timezone) || offset === undefined))) {
    throw new SourceError('The forecast returned invalid timezone data.');
  }
  const offsetMinutes = finite(offset) ? Math.abs(offset) / 60 : 0;
  const suffix = offset === undefined ? '' : `${Number(offset) < 0 ? '-' : '+'}${
    String(Math.floor(offsetMinutes / 60)).padStart(2, '0')}:${String(offsetMinutes % 60).padStart(2, '0')}`;
  function solarTime(time: unknown): unknown {
    // Keep the city's calendar date and offset together for solar freshness checks.
    if (time === null) return '';
    return dateTime(time) && !/(?:Z|[+-]\d{2}:\d{2})$/.test(time) ? `${time}${suffix}` : time;
  }
  const daily = value.daily;
  const hourly = value.hourly;
  const days = ['time', 'temperature_2m_min', 'temperature_2m_max', 'weather_code',
    'precipitation_probability_max', 'sunrise', 'sunset'].map((key) => column(daily, key, 7));
  const hours = ['time', 'temperature_2m', 'weather_code', 'precipitation_probability']
    .map((key) => column(hourly, key, 24));
  const result = {
    city, temperature: value.current.temperature_2m, feelsLike: value.current.apparent_temperature,
    ...(value.timezone === undefined ? {} : { timezone: value.timezone }),
    code: value.current.weather_code, wind: value.current.wind_speed_10m,
    humidity: value.current.relative_humidity_2m,
    days: Array.from({ length: 7 }, (_, i) => ({
      date: days[0][i], low: days[1][i], high: days[2][i], code: days[3][i],
      precipitation: days[4][i],
      // Polar days can have no sunrise or sunset; empty strings preserve that absence.
      sunrise: solarTime(days[5][i]), sunset: solarTime(days[6][i]),
    })),
    hours: Array.from({ length: 24 }, (_, i) => ({
      // Hourly labels remain city-local wall times for the existing time formatter.
      time: hours[0][i], temperature: hours[1][i], code: hours[2][i], precipitation: hours[3][i],
    })),
  };
  if (!validWeather(result)) throw new SourceError('The forecast returned invalid data.');
  return result;
}

interface LiveOptions extends DeadlineOptions { fetch?: SourceFetch; storage?: SourceStorage | null; now?: SourceClock }
export interface WeatherSourceOptions extends LiveOptions {
  location: Location;
  units: Settings['units'];
  fallback: Weather;
}

function validLocation(value: unknown): value is Location {
  return record(value) && text(value.name) && value.name.length <= 200
    && finite(value.latitude) && Math.abs(value.latitude) <= 90
    && finite(value.longitude) && Math.abs(value.longitude) <= 180
    && (value.timezone === undefined || (typeof value.timezone === 'string'
      && /^[A-Za-z0-9_+/-]{1,100}$/.test(value.timezone)));
}

export function createWeatherSource(options: WeatherSourceOptions): Source<Weather> {
  const { location: supplied, units, fallback } = options;
  if (!validLocation(supplied)) throw new Error('Choose a valid weather location.');
  if (units !== 'celsius' && units !== 'fahrenheit') throw new Error('Choose Celsius or Fahrenheit.');
  const location = { ...supplied };
  const now = clock(options.now);
  const timeoutMs = deadline(options.timeoutMs);
  return createSource({
    id: `weather:${JSON.stringify([location.name, location.latitude, location.longitude, location.timezone, units])}`,
    fallback, ttl: 15 * minute, storage: options.storage, now, timeoutMs,
    validate: validWeather,
    async load(signal) {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({
        latitude: String(location.latitude), longitude: String(location.longitude),
        timezone: location.timezone ?? 'auto', temperature_unit: units,
        wind_speed_unit: units === 'fahrenheit' ? 'mph' : 'kmh',
        current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
        hourly: 'temperature_2m,weather_code,precipitation_probability',
        forecast_days: '7', forecast_hours: '24',
      }).toString();
      return request(url, options.fetch ?? globalThis.fetch, 'The forecast', now,
        async (response) => parseWeather(await response.json(), location.name), timeoutMs, signal);
    },
  });
}

function officialUrl(value: unknown, kind: 'blog' | 'release'): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (kind === 'blog' ? url.hostname !== 'blog.getbootstrap.com'
      : url.hostname !== 'github.com' || !/^\/twbs\/bootstrap\/releases\/tag\/.+/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

interface XmlNode { name: string; value: string; children: XmlNode[] }

function decodeXml(value: string): string {
  if (/&(?!amp;|lt;|gt;|apos;|quot;|#\d+;|#x[\da-f]+;)/i.test(value)) {
    throw new SourceError('The Bootstrap feed returned invalid XML.');
  }
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', apos: "'", quot: '"' };
  return value.replace(/&([^;]+);/g, (_, entity: string) => {
    if (entity in entities) return entities[entity];
    const point = entity.startsWith('#x') ? Number.parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    if (!Number.isInteger(point) || point <= 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) {
      throw new SourceError('The Bootstrap feed returned invalid XML.');
    }
    return String.fromCodePoint(point);
  });
}

// Only XML structure and text are read. DTDs and entities are never resolved or fetched.
function parseXml(xml: string): XmlNode {
  const invalid = () => new SourceError('The Bootstrap feed returned invalid XML.');
  if (xml.length > 1_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw invalid();
  const root: XmlNode = { name: '', value: '', children: [] };
  const stack = [root];
  const tokens = xml.match(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]*>|[^<]+/g) ?? [];
  if (tokens.join('') !== xml || tokens.length > 30_000) throw invalid();
  for (const token of tokens) {
    const parent = stack[stack.length - 1];
    if (token.startsWith('<!--') || token.startsWith('<?')) continue;
    if (token.startsWith('<![CDATA[')) {
      if (stack.length === 1) throw invalid();
      parent.value += token.slice(9, -3);
    } else if (token.startsWith('</')) {
      if (token !== `</${parent.name}>` || stack.length === 1) throw invalid();
      stack.pop();
      stack[stack.length - 1].value += parent.value;
    } else if (token.startsWith('<')) {
      const open = /^<([A-Za-z_][\w:.-]*)(?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"]*"|'[^']*'))*\s*(\/?)>$/.exec(token);
      if (!open || stack.length > 32) throw invalid();
      const node: XmlNode = { name: open[1], value: '', children: [] };
      parent.children.push(node);
      if (!open[2]) stack.push(node);
    } else {
      if (stack.length === 1 && token.trim()) throw invalid();
      parent.value += decodeXml(token);
    }
  }
  if (stack.length !== 1 || root.children.length !== 1) throw invalid();
  return root.children[0];
}

function childText(node: XmlNode, name: string): string {
  const children = node.children.filter((child) => child.name === name);
  return children.length === 1 ? children[0].value.trim() : '';
}

function parseBlog(xml: string): Story[] {
  const rss = parseXml(xml);
  const channels = rss.children.filter((node) => node.name === 'channel');
  if (rss.name !== 'rss' || channels.length !== 1) throw new SourceError('The Bootstrap feed returned invalid RSS.');
  const items = channels[0].children.filter((node) => node.name === 'item');
  const stories: Story[] = [];
  for (const item of items.slice(0, 100)) {
    const url = officialUrl(childText(item, 'link'), 'blog');
    const title = plainText(childText(item, 'title'));
    const published = Date.parse(childText(item, 'pubDate'));
    if (!url || !title || !finite(published)) continue;
    stories.push({ id: `bootstrap-blog:${url}`, title, excerpt: '', category: 'bootstrap',
      publication: 'Bootstrap blog', publishedAt: new Date(published).toISOString(), url, live: true });
  }
  if (items.length && !stories.length) throw new SourceError('The Bootstrap feed contained no valid headlines.');
  return stories;
}

function parseReleases(value: unknown): Story[] {
  if (!Array.isArray(value) || value.length > 100) throw new SourceError('GitHub returned invalid releases.');
  const stories: Story[] = [];
  for (const item of value) {
    if (!record(item) || item.draft === true) continue;
    const url = officialUrl(item.html_url, 'release');
    const title = text(item.name) ? plainText(item.name) : text(item.tag_name) ? plainText(item.tag_name) : '';
    if (!url || !title || !text(item.tag_name) || !dateTime(item.published_at)) continue;
    stories.push({ id: `bootstrap-release:${url}`, title, excerpt: '', category: 'bootstrap',
      publication: 'GitHub releases', publishedAt: item.published_at, url, live: true });
  }
  if (value.length && !stories.length) throw new SourceError('GitHub returned no valid releases.');
  return stories;
}

function validStories(value: unknown): value is Story[] {
  return Array.isArray(value) && value.length <= 100 && value.every((item) => record(item)
    && text(item.id) && text(item.title) && item.title === plainText(item.title) && item.excerpt === ''
    && item.category === 'bootstrap' && dateTime(item.publishedAt) && item.live === true
    && ((item.publication === 'Bootstrap blog' && officialUrl(item.url, 'blog') === item.url)
      || (item.publication === 'GitHub releases' && officialUrl(item.url, 'release') === item.url)));
}

export interface BootstrapSourceOptions extends LiveOptions { fallback: Story[] }

export function createBootstrapSource(options: BootstrapSourceOptions): Source<Story[]> {
  const now = clock(options.now);
  const timeoutMs = deadline(options.timeoutMs);
  const fetcher = options.fetch ?? globalThis.fetch;
  const common = { fallback: [] as Story[], ttl: hour, storage: options.storage, now, timeoutMs, validate: validStories };
  const blog = createSource({
    ...common, id: 'bootstrap-blog',
    async load(signal) {
      return request(new URL('https://blog.getbootstrap.com/feed.xml'), fetcher,
        'The Bootstrap feed', now, async (response) => parseBlog(await response.text()), timeoutMs, signal);
    },
  });
  const releases = createSource({
    ...common, id: 'bootstrap-releases', minimumInterval: hour,
    async load(signal) {
      const url = new URL('https://api.github.com/repos/twbs/bootstrap/releases');
      url.searchParams.set('per_page', '20');
      return request(url, fetcher, 'GitHub releases', now,
        async (response) => parseReleases(await response.json()), timeoutMs, signal);
    },
  });
  let blogState: SourceSnapshot<Story[]>;
  let releaseState: SourceSnapshot<Story[]>;
  let destroyed = false;
  let pending: Promise<void> | null = null;
  const listeners = new Set<(value: SourceSnapshot<Story[]>) => void>();

  function snapshot(): SourceSnapshot<Story[]> {
    const states = [{ ...blogState, status: blog.status }, { ...releaseState, status: releases.status }];
    const available = states.filter((state) => state.updatedAt !== null);
    const data = available.length ? available.flatMap((state) => state.data)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)) : options.fallback;
    const errors = states.flatMap((state) => state.error ? [state.error] : []);
    return {
      data,
      status: states.every((state) => state.status === 'fresh') ? 'fresh'
        : errors.length ? (available.length ? 'stale' : 'offline')
        : states.some((state) => state.status === 'loading') ? 'loading' : 'stale',
      updatedAt: available.length ? Math.min(...available.map((state) => state.updatedAt as number)) : null,
      error: errors.length ? errors.join(' ') : null,
    };
  }

  function notify(listener: (state: SourceSnapshot<Story[]>) => void): void {
    try { listener(snapshot()); } catch { /* Preserve the other subscriptions if a consumer fails. */ }
  }
  function emit(): void { if (blogState && releaseState) listeners.forEach(notify); }
  const unsubscribeBlog = blog.subscribe((value) => { blogState = value; emit(); });
  const unsubscribeReleases = releases.subscribe((value) => { releaseState = value; emit(); });

  return {
    id: 'bootstrap',
    get status() { return snapshot().status; },
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      notify(listener);
      return () => { listeners.delete(listener); };
    },
    refresh(force = false) {
      if (destroyed) return Promise.resolve();
      if (pending) return pending;
      pending = Promise.all([blog.refresh(force), releases.refresh(force)])
        .then(() => {}).finally(() => { pending = null; });
      return pending;
    },
    destroy() {
      destroyed = true;
      unsubscribeBlog(); unsubscribeReleases();
      blog.destroy(); releases.destroy(); listeners.clear();
    },
  };
}

async function geocodeCities(query: string, count: number, fetcher: SourceFetch,
  options: SourceRequestOptions): Promise<Location[]> {
  const timeoutMs = deadline(options.timeoutMs);
  const name = query.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 100) return [];
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name, count: String(count), language: 'en', format: 'json' }).toString();
  const value: unknown = await request(url, fetcher, 'City search', clock(options.now),
    (response) => response.json(), timeoutMs, options.signal);
  if (!record(value) || value.error || (value.results !== undefined && !Array.isArray(value.results))) {
    throw new SourceError('City search returned invalid locations.');
  }
  if (value.results === undefined) return [];
  const locations: Location[] = [];
  for (const item of (value.results as unknown[]).slice(0, 100)) {
    if (!record(item)) continue;
    const candidate = { name: item.name, latitude: item.latitude, longitude: item.longitude,
      ...(item.timezone === undefined ? {} : { timezone: item.timezone }) };
    for (const field of ['country', 'admin1'] as const) {
      if (typeof item[field] === 'string' && item[field].trim() && item[field].length <= 120) {
        Object.assign(candidate, { [field]: item[field].trim() });
      }
    }
    if (validLocation(candidate) && !locations.some((location) => location.name === candidate.name
      && location.latitude === candidate.latitude && location.longitude === candidate.longitude)) {
      locations.push(candidate);
    }
  }
  if ((value.results as unknown[]).length && !locations.length) {
    throw new SourceError('City search returned invalid locations.');
  }
  return locations.slice(0, count);
}

export function searchCities(query: string, fetcher: SourceFetch = globalThis.fetch,
  options: SourceRequestOptions = {}): Promise<Location[]> {
  return geocodeCities(query, 10, fetcher, options);
}

function canonicalTimezone(value: string | undefined): string | null {
  if (!value || value.length > 100) return null;
  try { return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone; }
  catch { return null; }
}

export async function resolveDefaultLocation(timezone: string,
  fetcher: SourceFetch = globalThis.fetch, options: SourceRequestOptions = {}): Promise<Location> {
  deadline(options.timeoutMs);
  const fallback: Location = { name: 'Harborview', latitude: 0, longitude: 0, timezone: 'UTC' };
  const canonical = canonicalTimezone(timezone);
  if (!canonical || !timezone.includes('/') || timezone.startsWith('Etc/')) return fallback;
  // Geographic aliases keep city names; regional aliases such as US/Pacific need the canonical city.
  const cityZone = timezone.split('/')[0] === canonical.split('/')[0] ? timezone : canonical;
  const segment = cityZone.split('/').at(-1) ?? '';
  if (!/^[A-Za-z]+(?:_[A-Za-z]+)*$/.test(segment)) {
    return fallback;
  }
  try {
    const locations = await geocodeCities(segment.replaceAll('_', ' '), 8, fetcher, options);
    return locations.find((location) => canonicalTimezone(location.timezone) === canonical) ?? fallback;
  }
  catch { return fallback; }
}
