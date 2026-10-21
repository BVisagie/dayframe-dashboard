import { applyThemeToRoot } from './apply.ts';
import type { SunTimes } from './apply.ts';
import type { SchemePreference, Theme } from './define.ts';
import { createThemeRegistry, findTheme } from './registry-core.ts';

export { defineTheme, themeSchema, validateTheme } from './define.ts';
export type { BooleanThemeOption, ColorScheme, SchemePreference, Theme, ThemeLayout } from './define.ts';
export { requiredTokens, roleNames, roleKeys } from './tokens.ts';
export { resolveScheme } from './apply.ts';
export type { SunTimes } from './apply.ts';

export const themes: Theme[] = createThemeRegistry(
  import.meta.glob<{ default: Theme }>('./*/theme.js', { eager: true }),
);

// Vite includes every folder's styles; a new theme never edits a central list.
import.meta.glob('./*/theme.css', { eager: true });
import.meta.glob('./*/effects.css', { eager: true });

export function getTheme(id: string): Theme {
  return findTheme(themes, id);
}

export function applyTheme(
  themeId: string,
  scheme: SchemePreference,
  options: Readonly<Record<string, boolean>> = {},
  sun?: SunTimes,
  now?: Date,
): void {
  const theme = getTheme(themeId);
  if (typeof document !== 'undefined') {
    applyThemeToRoot(document.documentElement, theme, scheme, options, sun, now);
  }
}
