import AxeBuilder from '@axe-core/playwright';
import { test, expect, visit, settings, noHorizontalOverflow } from './fixtures';
import { themeSchemes, views } from './matrix';
import { themeContract } from './contrast';

for (const { theme, scheme } of themeSchemes) {
  const defaultLight = theme.id === 'default' && scheme === 'light';
  test(`${theme.id} ${scheme} resolves every required token and passes the independent AA colour contract`, { tag: defaultLight ? '@smoke' : [] }, async ({ page }) => {
    await visit(page, { theme: theme.id, scheme });
    const result = await themeContract(page);
    expect(result.checkedTokens).toBeGreaterThan(200);
    expect(result.resolvedColors).toBeGreaterThan(180);
    expect(result.failures).toEqual([]);
  });

  for (const view of views) {
    test(`${theme.id} ${scheme} ${view} has no axe WCAG 2.2 AA violations`, { tag: defaultLight && view === 'summary' ? '@smoke' : [] }, async ({ page }) => {
      await visit(page, { theme: theme.id, scheme, view });
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(result.violations).toEqual([]);
    });
  }

  test(`${theme.id} ${scheme} Settings sections have no axe violations`, async ({ page }) => {
    await visit(page, { theme: theme.id, scheme });
    const dialog = await settings(page);
    for (const section of ['Appearance', 'Display', 'Weather', 'Calendar', 'Feeds', 'Demo']) {
      await dialog.getByRole('tab', { name: section, exact: true }).click();
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(result.violations, `${section} accessibility`).toEqual([]);
    }
  });

  test(`${theme.id} ${scheme} preserves visible keyboard focus and disables effects for reduced motion and forced colors`, { tag: defaultLight || (theme.id !== 'default' && scheme === 'dark') ? '@smoke' : [] }, async ({ page }) => {
    await visit(page, { theme: theme.id, scheme });
    for (const forcedColors of ['none', 'active'] as const) {
      await page.emulateMedia({ reducedMotion: forcedColors === 'none' ? 'reduce' : 'no-preference', forcedColors });
      const effects = await page.locator('.dashboard-shell').evaluate(shell => {
        const after = getComputedStyle(shell, '::after');
        return { visible: after.display !== 'none' && !['none', 'normal'].includes(after.content),
          animations: document.getAnimations().filter(animation => animation.playState === 'running').length };
      });
      expect(effects.visible, `Decorative overlay under ${forcedColors === 'active' ? 'forced colors' : 'reduced motion'}`).toBe(false);
      if (forcedColors === 'none') expect(effects.animations).toBe(0);
      await page.locator('main').focus();
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement;
        const style = getComputedStyle(element);
        return { visible: element.matches(':focus-visible'),
          outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0 && style.outlineColor !== 'rgba(0, 0, 0, 0)',
          shadow: style.boxShadow !== 'none', hidden: style.visibility === 'hidden' || style.display === 'none' };
      });
      expect(focus.visible).toBe(true);
      expect(focus.hidden).toBe(false);
      expect(focus.outline || focus.shadow, 'Keyboard focus must have a visible indicator').toBe(true);
    }
  });

  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    test(`${theme.id} ${scheme} fits every view vertically at 100% scale at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const view of views) {
        await visit(page, { theme: theme.id, scheme, view, scale: '100' });
        await noHorizontalOverflow(page);
        await expect.poll(() => page.evaluate(() => Math.max(
          document.documentElement.scrollHeight, document.body.scrollHeight,
        ) - window.innerHeight), `${view} must fit without vertical scrolling`).toBeLessThanOrEqual(0);
        await expect(page.locator('main')).toBeInViewport({ ratio: 1 });
        await expect(page.locator('footer')).toBeInViewport({ ratio: 1 });
      }
    });
  }

  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    for (const scale of ['70', '150']) {
      for (const view of views) {
        test(`${theme.id} ${scheme} ${view} fits at ${scale}% scale at ${viewport.width}x${viewport.height}`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await visit(page, { theme: theme.id, scheme, view, scale });
          await noHorizontalOverflow(page);
          expect(await page.locator('html').evaluate(node => parseFloat(getComputedStyle(node).fontSize)), 'Readable root text floor').toBeGreaterThanOrEqual(14);
        });
      }
    }
  }
}
