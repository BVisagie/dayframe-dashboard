import test from 'node:test';
import assert from 'node:assert/strict';
import { SETTINGS_KEY, applyUrlSettings, defaultSettings, loadSettings, saveSettings } from '../src/lib/settings.ts';
import type { Settings } from '../src/lib/types.ts';

function storageFor(value: unknown, key = SETTINGS_KEY) {
  const values = new Map<string, string>([[key, JSON.stringify(value)]]);
  return {
    values,
    getItem(name: string): string | null { return values.get(name) ?? null; },
    setItem(name: string, data: string): void { values.set(name, data); },
  };
}

test('defaults follow supported locale conventions without browser globals', () => {
  const american = defaultSettings('en-us');
  const british = defaultSettings('en-GB');
  assert.equal(american.locale, 'en-US');
  assert.equal(american.firstDay, 0);
  assert.equal(american.units, 'fahrenheit');
  assert.equal(british.firstDay, 1);
  assert.equal(british.units, 'celsius');
  assert.equal(british.hourCycle, 'locale');
  assert.equal(american.dateFormat, 'locale');
  assert.equal(british.dateFormat, 'locale');
  assert.equal(british.version, 1);
  assert.equal(british.startupView, 'summary');
  assert.equal(british.scale, 100);
  assert.equal(british.location, null);
  assert.equal(SETTINGS_KEY, 'dayframe.settings.v1');
  assert.doesNotThrow(() => defaultSettings('not_a_locale'));
  assert.doesNotThrow(() => defaultSettings(''));
  assert.ok(defaultSettings().locale.length > 0);
});

test('every call owns its nested defaults', () => {
  const first = defaultSettings('en-GB');
  first.categories.length = 0;
  first.themeOptions.default = { glow: true };
  const next = defaultSettings('en-GB');
  assert.deepEqual(next.categories, ['technology', 'design', 'science', 'bootstrap']);
  assert.deepEqual(next.themeOptions, {});
});

test('storage absence, denied access and malformed JSON return safe defaults', () => {
  const expected = defaultSettings('en-GB');
  assert.deepEqual(loadSettings(null, 'en-GB'), expected);
  assert.deepEqual(loadSettings({ getItem: () => null }, 'en-GB'), expected);
  assert.deepEqual(loadSettings({ getItem: () => { throw new Error('Storage denied'); } }, 'en-GB'), expected);
  for (const value of ['{broken', 'null', '[]', 'true', '42', '"hello"']) {
    assert.deepEqual(loadSettings({ getItem: () => value }, 'en-GB'), expected);
  }
  assert.equal(saveSettings(null, expected), false);
  assert.equal(saveSettings({ setItem: () => { throw new Error('Storage full'); } }, expected), false);
});

test('valid version-one settings round-trip under the single settings key', () => {
  const settings: Settings = {
    ...defaultSettings('de-DE'),
    theme: 'future-theme', scheme: 'auto', scale: 120, startupView: 'calendar',
    rotation: true, rotationSeconds: 45, dateFormat: 'iso', hourCycle: 'h23', firstDay: 0,
    units: 'fahrenheit', reminders: false, reminderMinutes: 5,
    categories: ['science', 'bootstrap'], scenario: 'running-low',
    themeOptions: { 'future-theme': { crt: false, glow: true } }, lens: true,
  };
  const storage = storageFor(null);
  assert.equal(saveSettings(storage, settings), true);
  assert.equal(storage.values.size, 1);
  assert.deepEqual(loadSettings(storage, 'en-US'), settings);
});

test('every date format persists independently of locale and time format', () => {
  for (const dateFormat of ['locale', 'day-month', 'month-day', 'iso'] as const) {
    const settings: Settings = { ...defaultSettings('en-US'), dateFormat, hourCycle: 'h23' };
    const storage = storageFor(null);
    assert.equal(saveSettings(storage, settings), true);
    assert.deepEqual(loadSettings(storage, 'en-GB'), settings);
  }
});

test('version-one settings without a date format retain their preferences without writing storage', () => {
  const old: Partial<Settings> = { ...defaultSettings('de-DE'), scale: 120, hourCycle: 'h12' };
  delete old.dateFormat;
  const storage = storageFor(old);
  const before = storage.values.get(SETTINGS_KEY);
  assert.deepEqual(loadSettings(storage, 'en-US'), { ...old, dateFormat: 'locale' });
  assert.equal(storage.values.get(SETTINGS_KEY), before);
});

test('invalid persisted date formats fall back to locale on load and save', () => {
  for (const dateFormat of ['', 'ISO', 'day-first', 0, true, null, [], {}]) {
    const storage = storageFor({ ...defaultSettings('en-GB'), dateFormat, hourCycle: 'h23' });
    const loaded = loadSettings(storage);
    assert.equal(loaded.dateFormat, 'locale');
    assert.equal(loaded.hourCycle, 'h23');
    const invalid = { ...loaded };
    Object.assign(invalid, { dateFormat });
    assert.equal(saveSettings(storage, invalid), true);
    assert.equal(JSON.parse(storage.values.get(SETTINGS_KEY)!).dateFormat, 'locale');
  }
});

test('validation repairs each corrupt field while retaining valid choices', () => {
  const corrupted = {
    version: 1, theme: '../bad', scheme: 'sepia', scale: 900, startupView: 'unknown',
    rotation: 'yes', rotationSeconds: -20, locale: 'en-GB', dateFormat: 'bad', hourCycle: 'h99',
    firstDay: 8, units: 'kelvin', reminders: 0, reminderMinutes: Number.NaN,
    categories: ['science', 'science', null, 8, 'unknown', 'design'], scenario: 'unknown',
    location: { name: 'Fictional meadow', latitude: 500, longitude: 0 },
    themeOptions: { default: { glow: true, crt: 'yes', '../unsafe': false }, bad: null }, lens: '1',
  };
  const actual = loadSettings(storageFor(corrupted), 'en-GB');
  const expected = defaultSettings('en-GB');
  assert.deepEqual(actual, {
    ...expected, scale: 150, rotationSeconds: 10,
    categories: ['science', 'design'], themeOptions: { default: { glow: true } },
  });
  assert.equal(loadSettings(storageFor({ version: 1, scale: -3 })).scale, 70);
  assert.equal(loadSettings(storageFor({ version: 1, scale: '120' })).scale, 100);
  assert.equal(loadSettings(storageFor({ version: 1, scale: 101.7 })).scale, 102);
  assert.equal(loadSettings(storageFor({ version: 1, rotationSeconds: 99999 })).rotationSeconds, 3600);
  assert.equal(loadSettings(storageFor({ version: 1, reminderMinutes: -5 })).reminderMinutes, 0);
});

test('valid saved locale controls defaults for fields that were not stored', () => {
  const actual = loadSettings(storageFor({ version: 1, locale: 'en-US' }), 'en-GB');
  assert.equal(actual.locale, 'en-US');
  assert.equal(actual.units, 'fahrenheit');
  assert.equal(actual.firstDay, 0);
  const invalid = loadSettings(storageFor({ version: 1, locale: 'not_a_locale' }), 'en-GB');
  assert.equal(invalid.locale, 'en-GB');
  assert.equal(invalid.units, 'celsius');
});

test('future versions are ignored instead of being interpreted as the current schema', () => {
  assert.deepEqual(loadSettings(storageFor({ version: 99, theme: 'future', scheme: 'dark', scale: 140 }), 'en-GB'), defaultSettings('en-GB'));
});

test('version zero aliases and fractional scale migrate without writing storage', () => {
  const old = {
    version: 0, theme: 'nebuchadnezzar', colorScheme: 'dark', displayScale: 1.2,
    view: 'agents', rotate: true, rotationInterval: 60, firstDayOfWeek: 0,
    hour12: false, temperatureUnit: 'F', categories: ['bootstrap'],
  };
  const storage = storageFor(old);
  const before = storage.values.get(SETTINGS_KEY);
  assert.deepEqual(loadSettings(storage, 'en-GB'), {
    ...defaultSettings('en-GB'), theme: 'nebuchadnezzar', scheme: 'dark', scale: 120,
    startupView: 'agents', rotation: true, rotationSeconds: 60, firstDay: 0,
    hourCycle: 'h23', units: 'fahrenheit', categories: ['bootstrap'],
  });
  assert.equal(storage.values.get(SETTINGS_KEY), before);
});

test('legacy keys and unversioned data migrate and current settings take precedence', () => {
  for (const key of ['dayframe.settings.v0', 'dayframe.settings']) {
    const storage = storageFor({ view: 'feeds', displayScale: 0.8, temperatureUnit: 'C', hour12: true }, key);
    const migrated = loadSettings(storage, 'en-GB');
    assert.equal(migrated.version, 1);
    assert.equal(migrated.startupView, 'feeds');
    assert.equal(migrated.scale, 80);
    assert.equal(migrated.hourCycle, 'h12');
    assert.equal(migrated.units, 'celsius');
    assert.equal(storage.values.size, 1);
    storage.values.set(SETTINGS_KEY, JSON.stringify({ version: 1, startupView: 'weather' }));
    assert.equal(loadSettings(storage, 'en-GB').startupView, 'weather');
  }
});

test('location validation rejects nonfinite coordinates and invalid timezones', () => {
  for (const location of [null, [], {}, { name: '', latitude: 0, longitude: 0 }, { name: 'Cloud meadow', latitude: 91, longitude: 0 }, { name: 'Cloud meadow', latitude: 0, longitude: -181 }, { name: 'Cloud meadow', latitude: '0', longitude: 0 }]) {
    assert.equal(loadSettings(storageFor({ version: 1, location })).location, null);
  }
  const stored = loadSettings(storageFor({ version: 1, location: { name: ' Cloud meadow ', latitude: 0, longitude: 0, timezone: 'Invalid/Zone' } }));
  assert.deepEqual(stored.location, { name: 'Cloud meadow', latitude: 0, longitude: 0 });
});

test('theme options cannot introduce prototype properties', () => {
  const payload = '{"version":1,"themeOptions":{"__proto__":{"polluted":true},"constructor":{"polluted":true},"default":{"__proto__":true,"glow":true,"bad":3}}}';
  const result = loadSettings({ getItem: () => payload });
  assert.deepEqual(result.themeOptions, { default: { glow: true } });
  assert.equal(Object.hasOwn(result.themeOptions, '__proto__'), false);
  assert.equal(Object.hasOwn({}, 'polluted'), false);
});

test('URL overrides are isolated from settings, nested values and persistence', () => {
  const base: Settings = { ...defaultSettings('en-GB'), dateFormat: 'day-month', themeOptions: { default: { glow: true } } };
  const storage = storageFor(base);
  const loaded = loadSettings(storage);
  const params = new URLSearchParams('view=weather&theme=nebuchadnezzar&scheme=dark&scale=125&scenario=offline&lens=1&clock=2026-11-03T09:30&seed=example');
  const overridden = applyUrlSettings(loaded, params);
  assert.deepEqual(overridden, { ...base, startupView: 'weather', theme: 'nebuchadnezzar', scheme: 'dark', scale: 125, scenario: 'offline', lens: true });
  overridden.categories.push('changed');
  overridden.themeOptions.default.glow = false;
  assert.deepEqual(loaded, base);
  assert.deepEqual(loadSettings(storage), base);
  assert.equal(Object.hasOwn(overridden, 'clock'), false);
  assert.equal(Object.hasOwn(overridden, 'seed'), false);
  assert.equal(params.get('scale'), '125');
});

test('editing the date format saves only that preference alongside persisted settings', () => {
  const base: Settings = { ...defaultSettings('en-US'), dateFormat: 'month-day', startupView: 'calendar' };
  const storage = storageFor(base);
  const before = storage.values.get(SETTINGS_KEY);
  const loaded = loadSettings(storage);
  const visit = applyUrlSettings(loaded, new URLSearchParams('theme=nebuchadnezzar&scheme=dark&view=feeds&scale=140&scenario=offline'));
  assert.equal(visit.dateFormat, 'month-day');
  assert.equal(storage.values.get(SETTINGS_KEY), before);
  assert.equal(saveSettings(storage, { ...loaded, dateFormat: 'iso' }), true);
  assert.deepEqual(loadSettings(storage), { ...base, dateFormat: 'iso' });
  assert.equal(visit.startupView, 'feeds');
});

test('URL settings accept every declared view, scheme and scenario', () => {
  const base = defaultSettings('en-GB');
  for (const scheme of ['light', 'dark', 'system', 'auto']) assert.equal(applyUrlSettings(base, new URLSearchParams({ scheme })).scheme, scheme);
  for (const view of ['summary', 'agents', 'calendar', 'weather', 'feeds']) assert.equal(applyUrlSettings(base, new URLSearchParams({ view })).startupView, view);
  for (const scenario of ['steady', 'running-low', 'reconnect', 'reminder-due', 'stale', 'offline']) assert.equal(applyUrlSettings(base, new URLSearchParams({ scenario })).scenario, scenario);
  assert.equal(applyUrlSettings(base, new URLSearchParams('scale=5')).scale, 70);
  assert.equal(applyUrlSettings(base, new URLSearchParams('scale=500')).scale, 150);
  assert.equal(applyUrlSettings(base, new URLSearchParams('scale=110.6')).scale, 111);
});

test('invalid URL overrides preserve the valid saved values', () => {
  const base: Settings = { ...defaultSettings('en-GB'), scale: 115, scheme: 'light', startupView: 'calendar', scenario: 'stale', lens: true };
  for (const scale of ['', 'abc', 'Infinity', '0x80', '1e5', '-10', ' 120 ', '9'.repeat(400)]) {
    assert.deepEqual(applyUrlSettings(base, new URLSearchParams({ scale, theme: '../bad', scheme: 'unknown', view: 'bad', scenario: 'unknown', lens: 'false' })), base);
  }
  assert.equal(applyUrlSettings(base, new URLSearchParams('lens=0')).lens, false);
  assert.deepEqual(applyUrlSettings(base, new URLSearchParams()), base);
});

test('save validates runtime values before serializing', () => {
  const storage = storageFor(null);
  const settings = { ...defaultSettings('en-GB'), scale: 500, categories: ['science', 'unknown'] };
  assert.equal(saveSettings(storage, settings), true);
  assert.equal(loadSettings(storage).scale, 150);
  assert.deepEqual(loadSettings(storage).categories, ['science']);
});
