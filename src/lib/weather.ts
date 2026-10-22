import type { Settings, WeatherDay } from './types.ts';

interface Condition {
  label: string;
  icon: string;
  night?: string;
}

// WMO weather interpretation codes, as returned by Open-Meteo.
const conditions: [number, Condition][] = [
  [0, { label: 'Clear skies', icon: 'sun', night: 'moon-stars' }],
  [1, { label: 'Mainly clear', icon: 'cloud-sun', night: 'cloud-moon' }],
  [2, { label: 'Partly cloudy', icon: 'cloud-sun', night: 'cloud-moon' }],
  [3, { label: 'Overcast', icon: 'clouds' }],
  [48, { label: 'Fog', icon: 'cloud-fog2' }],
  [55, { label: 'Drizzle', icon: 'cloud-drizzle' }],
  [57, { label: 'Freezing drizzle', icon: 'cloud-sleet' }],
  [65, { label: 'Rain', icon: 'cloud-rain' }],
  [67, { label: 'Freezing rain', icon: 'cloud-sleet' }],
  [77, { label: 'Snow', icon: 'cloud-snow' }],
  [81, { label: 'Rain showers', icon: 'cloud-rain' }],
  [82, { label: 'Heavy showers', icon: 'cloud-rain-heavy' }],
  [86, { label: 'Snow showers', icon: 'cloud-snow' }],
  [95, { label: 'Thunderstorms', icon: 'cloud-lightning-rain' }],
  [99, { label: 'Thunderstorms with hail', icon: 'cloud-hail' }],
];

function condition(code: number): Condition {
  return (conditions.find(([max]) => code <= max) ??
    conditions[conditions.length - 1])[1];
}

export function weatherLabel(code: number): string {
  return condition(code).label;
}

/** Only clear and partly cloudy skies show the sun, so only they change at night. */
export function weatherIcon(code: number, night = false): string {
  const match = condition(code);
  return night && match.night ? match.night : match.icon;
}

/**
 * Hourly times are city wall-clock times, while sun times also carry the city's
 * offset. Dropping a numeric offset puts both in the same frame; replayed UTC
 * times end in Z and are already comparable with their UTC hours.
 */
export function wallTime(value: string): number {
  return Date.parse(value.replace(/[+-]\d{2}:\d{2}$/, ''));
}

type ClockSettings = Pick<Settings, 'locale' | 'hourCycle'>;

/** Two-digit hours keep the hourly column and sun times aligned. */
function formatClock(time: number, settings: ClockSettings): string {
  if (!Number.isFinite(time)) return '—';
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(settings.hourCycle === 'locale'
      ? {}
      : { hourCycle: settings.hourCycle }),
  };
  try {
    return new Intl.DateTimeFormat(settings.locale, options).format(time);
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(time);
  }
}

/** Twelve-hour clocks add a day period, so each hourly cell needs more room. */
export function usesTwelveHours(settings: ClockSettings): boolean {
  if (settings.hourCycle !== 'locale') return settings.hourCycle === 'h12';
  try {
    const cycle = new Intl.DateTimeFormat(settings.locale, {
      hour: 'numeric',
    }).resolvedOptions().hourCycle;
    return cycle === 'h12' || cycle === 'h11';
  } catch {
    return false;
  }
}

export function formatSunTime(value: string, settings: ClockSettings): string {
  return formatClock(wallTime(value), settings);
}

export function formatHour(value: string, settings: ClockSettings): string {
  return formatClock(Date.parse(value), settings);
}

/** An hour counts as night when its midpoint falls outside every day's sunrise-to-sunset span. */
export function isNight(time: string | undefined, days: WeatherDay[]): boolean {
  // Polar days and nights have no sun times; keep the daytime icon rather than guess.
  if (!time || !days.length || days.some((day) => !day.sunrise || !day.sunset))
    return false;
  const midpoint = wallTime(time) + 30 * 60_000;
  if (!Number.isFinite(midpoint)) return false;
  return !days.some(
    (day) =>
      wallTime(day.sunrise) <= midpoint && midpoint < wallTime(day.sunset),
  );
}

/** Values arrive already converted, so thresholds are compared in Celsius. */
export function temperatureRole(
  high: number,
  units: Settings['units'] | string = 'celsius',
): 'info' | 'primary' | 'warning' {
  const celsius = units === 'fahrenheit' ? ((high - 32) * 5) / 9 : high;
  if (celsius < 10) return 'info';
  if (celsius > 20) return 'warning';
  return 'primary';
}

export interface Bounds {
  min: number;
  max: number;
}

export function weekBounds(days: WeatherDay[]): Bounds {
  if (!days.length) return { min: 0, max: 1 };
  return {
    min: Math.min(...days.map((day) => day.low)),
    max: Math.max(...days.map((day) => day.high)),
  };
}

/** Percent offset and span on the week's scale, so bars align like a thermometer across rows. */
export function rangeSpan(
  low: number,
  high: number,
  { min, max }: Bounds,
): { offset: number; span: number } {
  const scale = max - min || 1;
  const offset = Math.min(100, Math.max(0, ((low - min) / scale) * 100));
  // A day with no spread still shows a visible tick.
  const span = Math.max(
    4,
    Math.min(100 - offset, ((high - low) / scale) * 100),
  );
  return { offset: Math.min(offset, 100 - span), span };
}

/** The first hour is the current one, so its local date names today in the data's own frame. */
export function todayKey(hours: { time: string }[]): string {
  const time = hours[0] ? wallTime(hours[0].time) : NaN;
  if (!Number.isFinite(time)) return '';
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dayName(date: string, today: string, locale: string): string {
  if (date === today) return 'Today';
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
      new Date(`${date}T12:00:00`),
    );
  } catch {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(
      new Date(`${date}T12:00:00`),
    );
  }
}

export function degrees(value: number): string {
  return `${Math.round(value)}°`;
}
