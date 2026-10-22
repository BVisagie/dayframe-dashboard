export const themeSchema = {
  schemes: ['light', 'dark'],
  layouts: ['standard', 'console'],
  optionTypes: ['boolean'],
  previewKeys: ['canvas', 'surface', 'ink', 'accent'],
} as const;

export type ColorScheme = (typeof themeSchema.schemes)[number];
export type SchemePreference = ColorScheme | 'system' | 'auto';
export type ThemeLayout = (typeof themeSchema.layouts)[number];

export interface BooleanThemeOption {
  type: 'boolean';
  label: string;
  default: boolean;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  schemes: readonly ColorScheme[];
  layout: ThemeLayout;
  options: Readonly<Record<string, BooleanThemeOption>>;
  preview: Readonly<Record<(typeof themeSchema.previewKeys)[number], string>>;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Kept independent of Vite so build scripts and Node use the same contract. */
export function validateTheme(value: unknown): asserts value is Theme {
  if (!record(value)) throw new TypeError('A theme manifest must be an object.');
  if (typeof value.id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.id)) {
    throw new TypeError('A theme id must use lowercase words separated by hyphens.');
  }
  if (!nonempty(value.name) || !nonempty(value.description)) {
    throw new TypeError(`Theme ${value.id} needs a name and description.`);
  }
  if (!Array.isArray(value.schemes) || value.schemes.length === 0 ||
      value.schemes.some((scheme) => !themeSchema.schemes.includes(scheme)) ||
      new Set(value.schemes).size !== value.schemes.length) {
    throw new TypeError(`Theme ${value.id} needs unique light or dark schemes.`);
  }
  if (!themeSchema.layouts.includes(value.layout as ThemeLayout)) {
    throw new TypeError(`Theme ${value.id} uses an unknown layout.`);
  }
  if (!record(value.options)) throw new TypeError(`Theme ${value.id} needs an options object.`);
  for (const [id, option] of Object.entries(value.options)) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id) || !record(option) ||
        option.type !== 'boolean' || !nonempty(option.label) || typeof option.default !== 'boolean') {
      throw new TypeError(`Theme ${value.id} has an invalid boolean option: ${id}.`);
    }
  }
  if (!record(value.preview)) throw new TypeError(`Theme ${value.id} needs preview colours.`);
  for (const key of themeSchema.previewKeys) {
    const color = value.preview[key];
    if (typeof color !== 'string' || !/^#[a-f\d]{6}$/i.test(color)) {
      throw new TypeError(`Theme ${value.id} needs a six-digit hex preview colour for ${key}.`);
    }
  }
}

export function defineTheme<const T extends Theme>(theme: T): T {
  validateTheme(theme);
  for (const option of Object.values(theme.options)) Object.freeze(option);
  Object.freeze(theme.options);
  Object.freeze(theme.preview);
  Object.freeze(theme.schemes);
  return Object.freeze(theme);
}
