import { validateTheme } from './define.ts';
import type { Theme } from './define.ts';

export function validateThemes(manifests: readonly unknown[]): Theme[] {
  const ids = new Set<string>();
  return manifests.map((manifest) => {
    validateTheme(manifest);
    if (ids.has(manifest.id)) throw new TypeError(`Duplicate theme id: ${manifest.id}.`);
    ids.add(manifest.id);
    return manifest;
  });
}

/** Folder identity is part of the contract: renames cannot leave stale selectors. */
export function createThemeRegistry(modules: Record<string, { default: unknown }>): Theme[] {
  const manifests = Object.entries(modules).map(([path, module]) => {
    validateTheme(module.default);
    if (path !== `./${module.default.id}/theme.js`) {
      throw new TypeError(`Theme ${module.default.id} must match its folder name.`);
    }
    return module.default;
  });
  return validateThemes(manifests).sort((a, b) => {
    if (a.id === 'default') return -1;
    if (b.id === 'default') return 1;
    return a.id.localeCompare(b.id, 'en');
  });
}

export function findTheme(themes: readonly Theme[], id: string): Theme {
  const theme = themes.find((candidate) => candidate.id === id);
  if (!theme) throw new RangeError(`Unknown theme: ${id}.`);
  return theme;
}
