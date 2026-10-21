import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { createTheme } from '../scripts/new-theme.mjs';
import { applyThemeToRoot, resolveScheme } from '../src/themes/apply.ts';
import { defineTheme, themeSchema, validateTheme } from '../src/themes/define.ts';
import type { Theme } from '../src/themes/define.ts';
import { createThemeRegistry, findTheme, validateThemes } from '../src/themes/registry-core.ts';
import { requiredTokens, roleKeys, roleNames } from '../src/themes/tokens.ts';
import defaultTheme from '../src/themes/default/theme.js';
import consoleTheme from '../src/themes/nebuchadnezzar/theme.js';

const themeRoot = new URL('../src/themes/', import.meta.url);

test('every folder supplies a valid, uniquely named manifest and required files', async () => {
  const folders = (await readdir(themeRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const modules: Record<string, { default: unknown }> = {};
  for (const folder of folders) {
    const manifest = await import(new URL(`${folder.name}/theme.js`, themeRoot).href);
    modules[`./${folder.name}/theme.js`] = manifest;
    const brief = await readFile(new URL(`${folder.name}/brief.md`, themeRoot), 'utf8');
    assert.match(brief, /## Palette/);
    assert.match(brief, /## Type/);
    assert.match(brief, /## Layout/);
    assert.match(brief, /## Principles/);
    assert.match(brief, /## Plan review/);
    const css = await readFile(new URL(`${folder.name}/theme.css`, themeRoot), 'utf8');
    assert.ok(css.includes(`[data-theme='${folder.name}']`));
  }
  const themes = createThemeRegistry(modules);
  assert.equal(themes[0].id, 'default');
  assert.equal(themes.length, folders.length);
  assert.equal(findTheme(themes, 'nebuchadnezzar').layout, 'console');
  for (const theme of themes) assert.ok(themeSchema.layouts.includes(theme.layout));
});

test('registry rejects duplicates, unknown themes, and mismatched folders', () => {
  assert.throws(() => validateThemes([defaultTheme, defaultTheme]), /Duplicate theme id/);
  assert.throws(() => findTheme([defaultTheme], 'missing'), /Unknown theme/);
  assert.throws(() => createThemeRegistry({ './wrong/theme.js': { default: defaultTheme } }), /folder name/);
});

test('schema rejects unsupported schemes, layouts, options and malformed preview colours', () => {
  const cases = [
    { id: '../invalid' }, { name: '' }, { description: '  ' },
    { schemes: [] }, { schemes: ['sepia'] }, { schemes: ['dark', 'dark'] },
    { layout: 'unknown' }, { options: null },
    { options: { crt: { type: 'range', label: 'CRT finish', default: false } } },
    { options: { crt: { type: 'boolean', label: '', default: false } } },
    { options: { crt: { type: 'boolean', label: 'CRT finish', default: 'yes' } } },
    { options: { 'Bad option': { type: 'boolean', label: 'Finish', default: false } } },
    { preview: { ...defaultTheme.preview, canvas: 'red' } },
    { preview: { canvas: '#ffffff' } },
  ];
  for (const invalid of cases) assert.throws(() => validateTheme({ ...defaultTheme, ...invalid }), TypeError);
  assert.throws(() => validateTheme(null), TypeError);
  assert.deepEqual(themeSchema.schemes, ['light', 'dark']);
  const theme = defineTheme({ ...defaultTheme, id: 'unit-example' });
  assert.ok(Object.isFrozen(theme));
  assert.ok(Object.isFrozen(theme.options));
});

test('scheme resolution clamps a dark-only theme and supports the system preference', () => {
  assert.equal(resolveScheme(defaultTheme, 'system', undefined, undefined, true), 'dark');
  assert.equal(resolveScheme(defaultTheme, 'system', undefined, undefined, false), 'light');
  for (const scheme of ['light', 'dark', 'system', 'auto'] as const) {
    assert.equal(resolveScheme(consoleTheme, scheme), 'dark');
  }
});

test('auto uses solar boundaries and browser-local daytime when solar data is unavailable', () => {
  const at = (time: string) => new Date(`2026-11-03T${time}:00`);
  const sun = { sunrise: '08:15', sunset: '16:45' };
  assert.equal(resolveScheme(defaultTheme, 'auto', sun, at('08:14')), 'dark');
  assert.equal(resolveScheme(defaultTheme, 'auto', sun, at('08:15')), 'light');
  assert.equal(resolveScheme(defaultTheme, 'auto', sun, at('16:45')), 'dark');
  assert.equal(resolveScheme(defaultTheme, 'auto', undefined, at('07:00')), 'light');
  assert.equal(resolveScheme(defaultTheme, 'auto', undefined, at('19:00')), 'dark');
  for (const invalid of [
    { sunrise: 'invalid', sunset: '16:45' },
    { sunrise: '', sunset: '' },
    { sunrise: '', sunset: '16:45' },
    { sunrise: '08:15', sunset: '' },
    { sunrise: '25:00', sunset: '26:00' },
    { sunrise: '16:45', sunset: '08:15' },
    { sunrise: '2026-11-02T08:15:00', sunset: '2026-11-02T16:45:00' },
  ]) assert.equal(resolveScheme(defaultTheme, 'auto', invalid, at('12:00')), 'light');
  assert.equal(resolveScheme(defaultTheme, 'auto', {
    sunrise: '2026-11-03T08:15:00', sunset: '2026-11-03T16:45:00',
  }, at('07:30')), 'dark');
});

test('auto uses the selected solar day across browser-local midnight and timezone differences', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ['UTC', 'Etc/GMT+8', 'Etc/GMT-10']) {
      process.env.TZ = timezone;
      const east = { sunrise: '2026-11-03T07:00+14:00', sunset: '2026-11-03T17:00+14:00' };
      const west = { sunrise: '2026-11-03T07:00-12:00', sunset: '2026-11-03T17:00-12:00' };
      for (const [sun, instant, scheme] of [
        [east, '2026-11-02T16:59:00Z', 'dark'], [east, '2026-11-02T17:00:00Z', 'light'],
        [east, '2026-11-03T02:59:00Z', 'light'], [east, '2026-11-03T03:00:00Z', 'dark'],
        [west, '2026-11-03T18:59:00Z', 'dark'], [west, '2026-11-03T19:00:00Z', 'light'],
        [west, '2026-11-03T23:59:00Z', 'light'], [west, '2026-11-04T00:00:00Z', 'light'],
        [west, '2026-11-04T04:59:00Z', 'light'], [west, '2026-11-04T05:00:00Z', 'dark'],
        [{ sunrise: '2026-11-03T03:00Z', sunset: '2026-11-03T13:00Z' }, '2026-11-03T10:00:00Z', 'light'],
      ] as const) {
        assert.equal(resolveScheme(defaultTheme, 'auto', sun, new Date(instant)), scheme,
          `${timezone}: ${instant} with ${sun.sunrise}`);
      }
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('auto falls back for stale or future solar days in the selected offset and for polar gaps', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    const now = new Date('2026-11-03T12:00:00Z');
    for (const sun of [
      { sunrise: '2026-11-03T07:00+14:00', sunset: '2026-11-03T17:00+14:00' },
      { sunrise: '2026-11-05T07:00+14:00', sunset: '2026-11-05T17:00+14:00' },
      { sunrise: '2026-11-03T17:00-12:00', sunset: '2026-11-03T07:00-12:00' },
      { sunrise: '2026-11-03T07:00-12:00', sunset: '' },
      { sunrise: '', sunset: '2026-11-03T17:00-12:00' },
      { sunrise: '2026-11-03T25:00Z', sunset: '2026-11-03T26:00Z' },
      { sunrise: '', sunset: '' },
    ]) assert.equal(resolveScheme(defaultTheme, 'auto', sun, now), 'light');
    assert.equal(resolveScheme(defaultTheme, 'auto', {
      sunrise: '2026-11-03T07:00+14:00', sunset: '2026-11-03T17:00+14:00',
    }, new Date('2026-11-03T08:00:00Z')), 'dark');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('applying a theme sets manifest options and removes the previous theme finish', () => {
  const attributes = new Map<string, string>([['lang', 'en']]);
  const root = {
    getAttributeNames: () => [...attributes.keys()],
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
  } as unknown as HTMLElement;
  applyThemeToRoot(root, consoleTheme, 'light');
  assert.equal(attributes.get('data-theme'), 'nebuchadnezzar');
  assert.equal(attributes.get('data-bs-theme'), 'dark');
  assert.equal(attributes.get('data-layout'), 'console');
  assert.equal(attributes.get('data-theme-crt'), 'on');
  applyThemeToRoot(root, consoleTheme, 'dark', { crt: false, unknown: true });
  assert.equal(attributes.get('data-theme-crt'), 'off');
  assert.equal(attributes.has('data-theme-unknown'), false);
  applyThemeToRoot(root, defaultTheme, 'light');
  assert.equal(attributes.has('data-theme-crt'), false);
  assert.equal(attributes.get('data-layout'), 'standard');
  assert.equal(attributes.get('lang'), 'en');
});

test('required tokens cover every complete Bootstrap and dashboard role', () => {
  assert.equal(roleNames.length, 20);
  assert.equal(roleKeys.length, 9);
  assert.equal(new Set(requiredTokens).size, requiredTokens.length);
  for (const role of roleNames) {
    for (const key of roleKeys) assert.ok(requiredTokens.includes(`--${role}-${key}`));
  }
});

test('generator creates a self-contained valid starter and protects existing folders', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'dayframe-theme-'));
  try {
    await copyFile(new URL('../src/themes/define.ts', import.meta.url), join(destination, 'define.ts'));
    const folder = await createTheme('harbor-watch', destination);
    assert.deepEqual((await readdir(folder)).sort(), ['brief.md', 'theme.css', 'theme.js']);
    const manifest = await import(pathToFileURL(join(folder, 'theme.js')).href) as { default: Theme };
    validateTheme(manifest.default);
    assert.equal(manifest.default.id, 'harbor-watch');
    assert.deepEqual(manifest.default.schemes, ['light', 'dark']);
    const css = await readFile(join(folder, 'theme.css'), 'utf8');
    assert.ok(css.includes("[data-theme='harbor-watch']"));
    assert.ok(!css.includes("[data-theme='default']"));
    await assert.rejects(createTheme('harbor-watch', destination), { code: 'EEXIST' });
    for (const invalid of ['../escape', 'Uppercase', '', '-start', 'two--hyphens']) {
      await assert.rejects(createTheme(invalid, destination), TypeError);
    }
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});
