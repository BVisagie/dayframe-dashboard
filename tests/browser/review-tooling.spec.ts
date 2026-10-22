import { test, expect, visit, settings } from './fixtures';
import { themeContract } from './contrast';

test('colour contract rejects a resolved colour canvas cannot parse', async ({ page }) => {
  await visit(page, { theme: 'default', scheme: 'light' });
  const baseline = await themeContract(page);
  expect(baseline.failures).toEqual([]);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--border-color-translucent', 'rgb(7, 11, 13)');
    const getPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
    // Simulate a CSS colour accepted by the style engine but unsupported by canvas.
    CSSStyleDeclaration.prototype.getPropertyValue = function (property) {
      const value = getPropertyValue.call(this, property);
      return property === 'color' && value === 'rgb(7, 11, 13)' ? 'invalid-canvas-colour' : value;
    };
  });
  const result = await themeContract(page);
  expect(result.failures).toEqual(['--border-color-translucent is not a valid canvas color: invalid-canvas-colour']);
  expect(result.resolvedColors).toBe(baseline.resolvedColors - 1);
});

test('colour contract accepts both sentinel colours as genuine token values', async ({ page }) => {
  await visit(page, { theme: 'default', scheme: 'light' });
  const baseline = await themeContract(page);
  expect(baseline.failures).toEqual([]);
  for (const color of ['#010203', '#040506']) {
    await page.evaluate(color => document.documentElement.style.setProperty('--border-color-translucent', color), color);
    const result = await themeContract(page);
    expect(result.failures).toEqual([]);
    expect(result.resolvedColors).toBe(baseline.resolvedColors);
  }
});

test('CRT finish follows its option and reduced motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
  await visit(page, { theme: 'nebuchadnezzar', scheme: 'dark' });
  const overlayVisible = () => page.locator('.dashboard-shell').evaluate(shell => {
    const after = getComputedStyle(shell, '::after');
    return after.display !== 'none' && !['none', 'normal'].includes(after.content);
  });
  await expect.poll(overlayVisible).toBe(true);
  const dialog = await settings(page, 'Appearance');
  const crt = dialog.getByRole('switch', { name: 'CRT finish', exact: true });
  await expect(crt).toBeChecked();
  await crt.uncheck();
  await expect.poll(overlayVisible).toBe(false);
  await crt.check();
  await expect.poll(overlayVisible).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(overlayVisible).toBe(false);
});
