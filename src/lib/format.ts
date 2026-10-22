import type { Settings } from './types.ts';

type DateInput = Date | string | number;
type TimeSettings = Pick<Settings, 'locale' | 'hourCycle'>;

function dateValue(value: DateInput): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat('en-GB', options);
  }
}

/** Formats a time in the visitor's timezone; invalid dates render an em dash. */
export function formatTime(value: DateInput, settings: TimeSettings): string {
  const date = dateValue(value);
  if (!date) return '—';
  return dateFormatter(settings.locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...(settings.hourCycle === 'locale' ? {} : { hourCycle: settings.hourCycle }),
  }).format(date);
}

/**
 * Pass settings.dateFormat as the fourth argument for header and selected-day dates.
 * Overrides produce full numeric dates; options without a day or dateStyle retain
 * semantic month/year/weekday headings. Omit the override for descriptive labels.
 */
export function formatDate(value: DateInput, locale = 'en-GB', options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }, dateFormat: Settings['dateFormat'] = 'locale'): string {
  const date = dateValue(value);
  if (!date) return '—';
  const heading = options.day === undefined && options.dateStyle === undefined
    && (options.month !== undefined || options.year !== undefined || options.weekday !== undefined || options.era !== undefined);
  if (dateFormat === 'locale' || heading) return dateFormatter(locale, options).format(date);
  const parts = dateFormatter(locale, {
    timeZone: options.timeZone,
    calendar: dateFormat === 'iso' ? 'gregory' : options.calendar,
    numberingSystem: dateFormat === 'iso' ? 'latn' : options.numberingSystem,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const field = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  const year = field('year');
  const month = field('month');
  const day = field('day');
  if (dateFormat === 'iso') return `${year.padStart(4, '0')}-${month}-${day}`;
  return dateFormat === 'day-month' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}

export function formatNumber(value: number, locale = 'en-GB', options: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat('en-GB', options).format(value);
  }
}

/** Input temperatures are always Celsius; the output includes the unit. */
export function formatTemperature(celsius: number, units: Settings['units'] = 'celsius', locale = 'en-GB'): string {
  if (!Number.isFinite(celsius)) return '—';
  const value = units === 'fahrenheit' ? celsius * 9 / 5 + 32 : celsius;
  return `${formatNumber(value, locale, { maximumFractionDigits: 0 })}°${units === 'fahrenheit' ? 'F' : 'C'}`;
}

/** Relative labels use the supplied clock, never the runtime clock. */
export function formatRelative(value: DateInput, now: Date, locale = 'en-GB'): string {
  const date = dateValue(value);
  if (!date || !Number.isFinite(now.getTime())) return '—';
  const seconds = (date.getTime() - now.getTime()) / 1000;
  const [divisor, unit]: [number, Intl.RelativeTimeFormatUnit] = Math.abs(seconds) < 3600
    ? [60, 'minute']
    : Math.abs(seconds) < 86400 ? [3600, 'hour'] : [86400, 'day'];
  const amount = Math.round(seconds / divisor) || 0;
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(amount, unit);
  } catch {
    return new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' }).format(amount, unit);
  }
}

/** Two-unit reset countdowns stay tied to the supplied simulation clock. */
export function formatCountdown(value: DateInput, now: Date, locale = 'en-GB'): string {
  const date = dateValue(value);
  if (!date || !Number.isFinite(now.getTime())) return '—';
  const minutes = Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  const part = (amount: number, unit: string) => formatNumber(amount, locale, { style: 'unit', unit, unitDisplay: 'narrow' });
  if (days) return `${part(days, 'day')} ${part(hours, 'hour')}`;
  if (hours) return `${part(hours, 'hour')} ${part(minutes % 60, 'minute')}`;
  return part(minutes, 'minute');
}
