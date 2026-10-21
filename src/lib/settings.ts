import type { Location, Scenario, Settings, View } from './types.ts';

export const SETTINGS_KEY = 'dayframe.settings.v1';

const VIEWS: View[] = ['summary', 'agents', 'calendar', 'weather', 'feeds'];
const SCENARIOS: Scenario[] = ['steady', 'running-low', 'reconnect', 'reminder-due', 'stale', 'offline'];
const SCHEMES: Settings['scheme'][] = ['light', 'dark', 'system', 'auto'];
const DATE_FORMATS: Settings['dateFormat'][] = ['locale', 'day-month', 'month-day', 'iso'];
const CATEGORIES = ['technology', 'design', 'science', 'bootstrap'];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function localeName(value?: unknown, fallback?: string): string {
  for (const candidate of [value, fallback]) {
    try {
      if (typeof candidate === 'string' && candidate.length <= 100) {
        const [locale] = Intl.getCanonicalLocales(candidate);
        if (locale && Intl.DateTimeFormat.supportedLocalesOf([locale]).length) return locale;
      }
    } catch { /* Invalid visitor input falls back to a supported locale. */ }
  }
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'en-GB';
  }
}

export function defaultSettings(locale?: string): Settings {
  const resolvedLocale = localeName(locale);
  let region = '';
  let firstDay: 0 | 1 = 1;
  try {
    const info = new Intl.Locale(resolvedLocale).maximize() as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    region = info.region ?? '';
    const week = info.getWeekInfo?.() ?? info.weekInfo;
    firstDay = week ? (week.firstDay === 7 ? 0 : 1) : (['US', 'CA', 'JP', 'PH', 'TW'].includes(region) ? 0 : 1);
  } catch { /* Older Intl implementations still get usable defaults. */ }
  return {
    version: 1,
    theme: 'default',
    scheme: 'system',
    scale: 100,
    startupView: 'summary',
    rotation: false,
    rotationSeconds: 30,
    keyboardShortcuts: true,
    locale: resolvedLocale,
    dateFormat: 'locale',
    hourCycle: 'locale',
    firstDay,
    units: ['US', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH'].includes(region) ? 'fahrenheit' : 'celsius',
    reminders: true,
    reminderMinutes: 10,
    categories: [...CATEGORIES],
    scenario: 'steady',
    location: null,
    themeOptions: {},
    lens: false,
  };
}

function choice<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === 'string' && choices.includes(value as T) ? value as T : fallback;
}

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.round(value))) : fallback;
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value) && value !== 'constructor' && value !== 'prototype';
}

function locationValue(value: unknown): Location | null {
  if (!record(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120) return null;
  if (typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90) return null;
  if (typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180) return null;
  const location: Location = { name: value.name.trim(), latitude: value.latitude, longitude: value.longitude };
  for (const field of ['country', 'admin1'] as const) {
    if (typeof value[field] === 'string' && value[field].trim() && value[field].length <= 120) {
      location[field] = value[field].trim();
    }
  }
  if (typeof value.timezone === 'string' && value.timezone.length <= 100) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value.timezone });
      location.timezone = value.timezone;
    } catch { /* A bad timezone need not discard a valid city. */ }
  }
  return location;
}

function themeOptionsValue(value: unknown): Settings['themeOptions'] {
  if (!record(value)) return {};
  const result: Settings['themeOptions'] = {};
  for (const [theme, options] of Object.entries(value)) {
    if (!identifier(theme) || !record(options)) continue;
    const validated: Record<string, boolean> = {};
    for (const [option, enabled] of Object.entries(options)) {
      if (identifier(option) && typeof enabled === 'boolean') validated[option] = enabled;
    }
    result[theme] = validated;
  }
  return result;
}

function migrate(value: Record<string, unknown>): Record<string, unknown> | null {
  if (value.version !== undefined && value.version !== 0 && value.version !== 1) return null;
  if (value.version === 1) return value;
  // Version zero used flat aliases and a fractional display scale.
  const legacyScale = value.scale ?? value.displayScale;
  const legacyUnits = value.units ?? value.temperatureUnit;
  return {
    ...value,
    scheme: value.scheme ?? value.colorScheme,
    scale: typeof legacyScale === 'number' && legacyScale > 0 && legacyScale <= 2 ? legacyScale * 100 : legacyScale,
    startupView: value.startupView ?? value.view,
    rotation: value.rotation ?? value.rotate,
    rotationSeconds: value.rotationSeconds ?? value.rotationInterval,
    firstDay: value.firstDay ?? value.firstDayOfWeek,
    hourCycle: value.hourCycle ?? (value.hour12 === true ? 'h12' : value.hour12 === false ? 'h23' : undefined),
    units: legacyUnits === 'F' ? 'fahrenheit' : legacyUnits === 'C' ? 'celsius' : legacyUnits,
  };
}

function validate(value: unknown, locale?: string): Settings {
  if (!record(value)) return defaultSettings(locale);
  const migrated = migrate(value);
  if (!migrated) return defaultSettings(locale);
  const fallback = defaultSettings(localeName(migrated.locale, locale));
  return {
    version: 1,
    theme: identifier(migrated.theme) ? migrated.theme : fallback.theme,
    scheme: choice(migrated.scheme, SCHEMES, fallback.scheme),
    scale: boundedNumber(migrated.scale, fallback.scale, 70, 150),
    startupView: choice(migrated.startupView, VIEWS, fallback.startupView),
    rotation: typeof migrated.rotation === 'boolean' ? migrated.rotation : fallback.rotation,
    rotationSeconds: boundedNumber(migrated.rotationSeconds, fallback.rotationSeconds, 10, 3600),
    keyboardShortcuts: typeof migrated.keyboardShortcuts === 'boolean' ? migrated.keyboardShortcuts : fallback.keyboardShortcuts,
    locale: fallback.locale,
    dateFormat: choice(migrated.dateFormat, DATE_FORMATS, fallback.dateFormat),
    hourCycle: choice(migrated.hourCycle, ['locale', 'h12', 'h23'], fallback.hourCycle),
    firstDay: migrated.firstDay === 0 || migrated.firstDay === 1 ? migrated.firstDay : fallback.firstDay,
    units: choice(migrated.units, ['celsius', 'fahrenheit'], fallback.units),
    reminders: typeof migrated.reminders === 'boolean' ? migrated.reminders : fallback.reminders,
    reminderMinutes: boundedNumber(migrated.reminderMinutes, fallback.reminderMinutes, 0, 120),
    categories: Array.isArray(migrated.categories) ? [...new Set(migrated.categories.filter((category): category is string => typeof category === 'string' && CATEGORIES.includes(category)))] : fallback.categories,
    scenario: choice(migrated.scenario, SCENARIOS, fallback.scenario),
    location: locationValue(migrated.location),
    themeOptions: themeOptionsValue(migrated.themeOptions),
    lens: typeof migrated.lens === 'boolean' ? migrated.lens : fallback.lens,
  };
}

export function loadSettings(storage: Pick<Storage, 'getItem'> | null, locale?: string): Settings {
  if (!storage) return defaultSettings(locale);
  try {
    const stored = storage.getItem(SETTINGS_KEY) ?? storage.getItem('dayframe.settings.v0') ?? storage.getItem('dayframe.settings');
    return stored === null ? defaultSettings(locale) : validate(JSON.parse(stored), locale);
  } catch {
    return defaultSettings(locale);
  }
}

export function saveSettings(storage: Pick<Storage, 'setItem'> | null, settings: Settings): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(validate(settings, settings.locale)));
    return true;
  } catch {
    return false;
  }
}

/** Returns a fresh visit-only copy; clock and seed belong to the simulation. */
export function applyUrlSettings(settings: Settings, params: URLSearchParams): Settings {
  const overrides: Record<string, unknown> = { ...settings };
  if (params.has('theme') && identifier(params.get('theme'))) overrides.theme = params.get('theme');
  if (params.has('scheme')) overrides.scheme = choice(params.get('scheme'), SCHEMES, settings.scheme);
  if (params.has('view')) overrides.startupView = choice(params.get('view'), VIEWS, settings.startupView);
  if (params.has('scenario')) overrides.scenario = choice(params.get('scenario'), SCENARIOS, settings.scenario);
  const scale = params.get('scale');
  if (scale !== null && /^\d+(?:\.\d+)?$/.test(scale) && Number.isFinite(Number(scale))) overrides.scale = Number(scale);
  const lens = params.get('lens');
  if (lens === '1' || lens === '0') overrides.lens = lens === '1';
  return validate(overrides, settings.locale);
}
