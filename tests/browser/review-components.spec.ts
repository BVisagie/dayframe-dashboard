import type { Locator } from '@playwright/test';
import { test, expect, visit, settings } from './fixtures';

async function expectBootstrapFocusRing(control: Locator) {
  await expect(control).toBeFocused();
  const ring = await control.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      visible: node.matches(':focus-visible'),
      style: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
      minimum: Math.floor(
        parseFloat(getComputedStyle(document.documentElement).fontSize) *
          0.1875,
      ),
    };
  });
  expect(ring.visible).toBe(true);
  expect(ring.style).toBe('solid');
  expect(ring.width).toBeGreaterThanOrEqual(ring.minimum);
}

test('selected calendar days and lens-marked buttons retain the Bootstrap keyboard focus ring', async ({
  page,
}) => {
  await visit(page, { view: 'calendar', lens: '1' });
  await page.keyboard.press('Tab');
  const selected = page.locator('.month-day[aria-pressed="true"]');
  await selected.focus();
  await expectBootstrapFocusRing(selected);
  const inspected = page.locator('button.lens-target').first();
  await inspected.focus();
  await expectBootstrapFocusRing(inspected);
});

test('the selected theme keeps a visible check icon under forced colours', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await visit(page);
  const dialog = await settings(page);
  for (const name of ['Default', 'Tideline', 'Nebuchadnezzar']) {
    const choice = dialog.getByRole('button', {
      name: new RegExp(`^${name} `),
    });
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(
      choice
        .locator('svg')
        .filter({ has: page.locator('use[href$="#check-lg"]') }),
    ).toBeVisible();
    await expect(
      dialog.locator('.theme-choice use[href$="#check-lg"]'),
    ).toHaveCount(1);
  }
});

for (const viewport of [
  { width: 1366, height: 640 },
  { width: 390, height: 600 },
]) {
  const mobile = viewport.width === 390;
  test(`Settings ${mobile ? 'drawer' : 'dialog'} scrolls its body and keeps Done in the viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await visit(page);
    const trigger = page.getByRole('button', {
      name: 'Open settings',
      exact: true,
    });
    const dialog = await settings(page, 'Display');
    const body = dialog.locator(mobile ? '.drawer-body' : '.dialog-body');
    await expect(body).toHaveCSS('overflow-y', 'auto');
    const done = dialog.getByRole('button', { name: 'Done', exact: true });
    await expect(done).toBeInViewport({ ratio: 1 });
    await dialog
      .getByLabel('Time format', { exact: true })
      .scrollIntoViewIfNeeded();
    expect(await body.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await expect(done).toBeInViewport({ ratio: 1 });
    await done.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test(`full agenda ${mobile ? 'drawer' : 'dialog'} closes through Bootstrap and restores its trigger`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await visit(page, { view: 'calendar', clock: '2026-11-04T09:30:00Z' });
    const trigger = page.getByRole('button', { name: /^\+\d+ more events?$/ });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: /^All events for / });
    await expect(
      dialog.locator(mobile ? '.drawer-header' : '.dialog-header'),
    ).toBeVisible();
    await expect(
      dialog.locator(mobile ? '.drawer-body' : '.dialog-body'),
    ).toHaveCSS('overflow-y', 'auto');
    await dialog
      .getByRole('button', { name: 'Close all events', exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(
      await page
        .locator('html')
        .evaluate((node) => node.classList.contains('dialog-open')),
    ).toBe(false);
  });
}
