import type { Page } from '@playwright/test';
import { requiredTokens, roleNames } from '../../src/themes/tokens';

/** Resolve and rasterize CSS colours in the browser; no application contrast helpers are used. */
export async function themeContract(page: Page) {
  return page.evaluate(({ tokens, roles }) => {
    const root = getComputedStyle(document.documentElement);
    const failures: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const probe = document.createElement('span');
    document.body.append(probe);
    const values: Record<string, number[]> = {};
    const properties: Record<string, string> = {
      '--border-width': 'border-width', '--border-style': 'border-style',
      '--body-font-family': 'font-family', '--display-font-family': 'font-family',
      '--font-mono': 'font-family', '--body-font-size': 'font-size',
      '--body-line-height': 'line-height', '--focus-ring-width': 'outline-width',
      '--focus-ring-offset': 'outline-offset',
    };
    for (const token of tokens) {
      const value = root.getPropertyValue(token).trim();
      const property = properties[token] ?? (token.startsWith('--radius-') ? 'border-radius'
        : token.startsWith('--box-shadow') ? 'box-shadow' : 'color');
      if (!value || !CSS.supports(property, value)) {
        failures.push(`${token} is not a valid ${property}: ${value || '(empty)'}`);
        continue;
      }
      probe.style.setProperty(property, `var(${token})`);
      const resolved = getComputedStyle(probe).getPropertyValue(property);
      if (!resolved || resolved.includes('var(')) failures.push(`${token} did not resolve: ${resolved}`);
      if (property === 'color') {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = resolved;
        context.fillRect(0, 0, 1, 1);
        values[token] = Array.from(context.getImageData(0, 0, 1, 1).data);
      }
      probe.style.removeProperty(property);
    }
    probe.remove();
    function composite(foreground: number[], background: number[]) {
      const alpha = foreground[3] / 255;
      return [...foreground.slice(0, 3).map((value, index) => value * alpha + background[index] * (1 - alpha)), 255];
    }
    function luminance(color: number[]) {
      const linear = color.slice(0, 3).map(channel => {
        const value = channel / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      });
      return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    }
    function check(foreground: string, background: string, minimum: number) {
      if (!values[foreground] || !values[background]) return;
      const surface = composite(values[background], values['--bg-body'] ?? [255, 255, 255, 255]);
      const ink = composite(values[foreground], surface);
      const [lighter, darker] = [luminance(ink), luminance(surface)].sort((a, b) => b - a);
      const ratio = (lighter + .05) / (darker + .05);
      if (ratio < minimum) failures.push(`${foreground} on ${background}: ${ratio.toFixed(3)} < ${minimum}:1`);
    }
    const surfaces = ['--bg-body', '--bg-1', '--bg-2', '--bg-3', '--bg-4', '--calendar-weekend-bg', '--calendar-outside-bg', '--clock-face'];
    for (const surface of surfaces) {
      for (const text of ['--fg-body', '--fg-1', '--fg-2', '--fg-3', '--fg-4']) check(text, surface, 4.5);
      check('--fg-1', surface, 3);
      check('--focus-ring-color', surface, 3);
      check('--border-emphasized', surface, 3);
    }
    for (const role of roles) {
      for (const surface of ['--bg-body', '--bg-1', `--${role}-bg-subtle`, `--${role}-bg-muted`]) {
        check(`--${role}-fg`, surface, 4.5);
        check(`--${role}-fg-emphasis`, surface, 4.5);
        check(`--${role}-base`, surface, 3);
        check(`--${role}-border`, surface, 3);
        check(`--${role}-focus-ring`, surface, 3);
      }
      check(`--${role}-contrast`, `--${role}-bg`, 4.5);
    }
    return { failures, checkedTokens: tokens.length, resolvedColors: Object.keys(values).length };
  }, { tokens: [...requiredTokens], roles: [...roleNames] });
}
