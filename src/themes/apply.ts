import type { ColorScheme, SchemePreference, Theme } from './define.ts';

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

function solarTime(value: string, now: Date): number | undefined {
  const time = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (time) {
    const [, hour, minute, second = '0'] = time;
    if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return;
    const date = new Date(now);
    date.setHours(Number(hour), Number(minute), Number(second), 0);
    return date.getTime();
  }
  const timestamp =
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.exec(
      value,
    );
  if (!timestamp) return;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return;
  const [, day, zone] = timestamp;
  if (zone) {
    const offset =
      zone === 'Z'
        ? 0
        : (zone[0] === '-' ? -1 : 1) *
          (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))) *
          60_000;
    // A selected city's day can span two browser-local dates; stale days still fall back.
    const localNow = new Date(now.getTime() + offset);
    if (
      !Number.isFinite(localNow.getTime()) ||
      localNow.toISOString().slice(0, 10) !== day
    )
      return;
  } else if (date.toDateString() !== now.toDateString()) return;
  const calendarDay = new Date(`${day}T00:00:00Z`);
  if (
    !Number.isFinite(calendarDay.getTime()) ||
    calendarDay.toISOString().slice(0, 10) !== day
  )
    return;
  return date.getTime();
}

export function resolveScheme(
  theme: Theme,
  preference: SchemePreference,
  sun?: SunTimes,
  now: Date = new Date(),
  systemDark = typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-color-scheme: dark)').matches,
): ColorScheme {
  let scheme: ColorScheme;
  if (preference === 'system') {
    scheme = systemDark ? 'dark' : 'light';
  } else if (preference === 'auto') {
    const sunrise = sun && solarTime(sun.sunrise, now);
    const sunset = sun && solarTime(sun.sunset, now);
    if (sunrise !== undefined && sunset !== undefined && sunrise < sunset) {
      scheme =
        now.getTime() >= sunrise && now.getTime() < sunset ? 'light' : 'dark';
    } else {
      // Browser-local daytime is available without geolocation or a live source.
      scheme = now.getHours() >= 7 && now.getHours() < 19 ? 'light' : 'dark';
    }
  } else {
    scheme = preference;
  }
  return theme.schemes.includes(scheme) ? scheme : theme.schemes[0];
}

export function applyThemeToRoot(
  root: HTMLElement,
  theme: Theme,
  preference: SchemePreference,
  options: Readonly<Record<string, boolean>> = {},
  sun?: SunTimes,
  now?: Date,
): void {
  // Switching themes must not preserve a finish from the previous manifest.
  for (const attribute of root.getAttributeNames()) {
    if (attribute.startsWith('data-theme-')) root.removeAttribute(attribute);
  }
  root.setAttribute('data-theme', theme.id);
  root.setAttribute(
    'data-bs-theme',
    resolveScheme(theme, preference, sun, now),
  );
  root.setAttribute('data-layout', theme.layout);
  for (const [id, option] of Object.entries(theme.options)) {
    const enabled =
      typeof options[id] === 'boolean' ? options[id] : option.default;
    root.setAttribute(`data-theme-${id}`, enabled ? 'on' : 'off');
  }
}
