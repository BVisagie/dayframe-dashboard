import { readdirSync } from 'node:fs';
import type { Theme } from '../../src/themes/define';

const directory = new URL('../../src/themes/', import.meta.url);
export const themes: Theme[] = await Promise.all(
  readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(async entry => (await import(new URL(`${entry.name}/theme.js`, directory).href)).default as Theme),
);
export const themeSchemes = themes.flatMap(theme => theme.schemes.map(scheme => ({ theme, scheme })));
export const views = ['summary', 'agents', 'calendar', 'weather', 'feeds'] as const;
export const viewports = [
  { width: 1280, height: 720 }, { width: 1920, height: 1080 },
  { width: 2560, height: 1440 }, { width: 3008, height: 1692 },
  { width: 3440, height: 1440 }, { width: 3840, height: 2160 },
  { width: 1024, height: 768 }, { width: 390, height: 844 },
];
export const referenceClock = '2026-11-03T09:30:00Z';
