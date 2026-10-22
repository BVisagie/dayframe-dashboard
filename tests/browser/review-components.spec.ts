import type { Locator } from '@playwright/test';
import { test, expect, visit, settings, closeSettings } from './fixtures';

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

test('the Settings tooltip follows keyboard shortcut changes and cleans up when hidden', async ({
  page,
}) => {
  await visit(page);
  const trigger = page.getByRole('button', {
    name: 'Open settings',
    exact: true,
  });
  await trigger.focus();
  await expect(page.getByRole('tooltip')).toHaveText('Settings (,)');
  for (const enabled of [false, true]) {
    const dialog = await settings(page, 'Display');
    await dialog
      .getByRole('switch', { name: 'Keyboard shortcuts', exact: true })
      .setChecked(enabled);
    await closeSettings(page);
    await expect(page.getByRole('tooltip')).toHaveText(
      enabled ? 'Settings (,)' : 'Settings',
    );
    await expect(page.getByRole('tooltip')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(trigger).not.toHaveAttribute('aria-describedby');
  }
});

test('the lens keeps a scrolled mobile agenda drawer fixed in the viewport and cleans up labels', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await visit(page, {
    view: 'calendar',
    clock: '2026-11-04T09:30:00Z',
    lens: '1',
  });
  const trigger = page.getByRole('button', { name: /^\+\d+ more events?$/ });
  await trigger.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /^All events for / });
  await expect(dialog).toHaveCSS('position', 'fixed');
  await expect(dialog).toBeInViewport({ ratio: 1 });
  await expect(dialog).not.toHaveClass(/lens-target/);
  await expect(dialog.locator(':scope > .lens-label')).toHaveCount(0);
  await expect(
    dialog.getByRole('link', { name: 'Bootstrap list-group documentation' }),
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Close all events', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  const preferences = await settings(page, 'Demo');
  await preferences
    .getByRole('switch', { name: 'Bootstrap lens', exact: true })
    .uncheck();
  await expect(page.locator('.lens-target, .lens-label')).toHaveCount(0);
  await closeSettings(page);
});

for (const width of [688, 689, 767]) {
  test(`Settings tabs match the drawer breakpoint at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await visit(page);
    const dialog = await settings(page);
    const navigation = dialog.getByRole('tablist', {
      name: 'Settings sections',
    });
    await expect(navigation).toHaveCSS(
      'flex-direction',
      width <= 688 ? 'row' : 'column',
    );
    const tabs = navigation.getByRole('tab');
    for (const item of await tabs.all()) {
      await expect(item).toBeInViewport({ ratio: 1 });
    }
    if (width > 688) {
      const boxes = await tabs.evaluateAll((nodes) =>
        nodes.map((node) => {
          const { x, y, bottom } = node.getBoundingClientRect();
          return { x, y, bottom };
        }),
      );
      for (let index = 1; index < boxes.length; index++) {
        expect(boxes[index].x).toBe(boxes[0].x);
        expect(boxes[index].y).toBeGreaterThanOrEqual(boxes[index - 1].bottom);
      }
    }
  });
}

test('reset synchronizes the Range fill without creating input events', async ({
  page,
}) => {
  await visit(page);
  const dialog = await settings(page, 'Display');
  const scale = dialog.getByRole('slider', { name: /^Display scale:/ });
  const range = dialog.locator('.form-range');
  await scale.evaluate((node) => {
    node.dataset.inputEvents = '0';
    node.addEventListener('input', () => {
      node.dataset.inputEvents = String(Number(node.dataset.inputEvents) + 1);
    });
  });
  await scale.focus();
  await page.keyboard.press('End');
  await expect(scale).toHaveValue('150');
  await expect(range).toHaveCSS('--bs-range-fill', '1');
  await expect(scale).toHaveAttribute('data-input-events', '1');
  await dialog.getByRole('tab', { name: 'Demo', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Reset settings', exact: true })
    .click();
  await dialog.getByRole('tab', { name: 'Display', exact: true }).click();
  await expect(scale).toHaveValue('100');
  await expect(range).toHaveCSS('--bs-range-fill', '0.375');
  await expect(scale).toHaveAttribute('data-input-events', '1');
});

test('the saved city label retains the selected region and country', async ({
  page,
}) => {
  await page.route(
    'https://geocoding-api.open-meteo.com/v1/search?*',
    (route) =>
      route.fulfill({
        json: {
          results: ['West Vale', 'East Vale'].map((admin1, index) => ({
            name: 'Cloudfern',
            admin1,
            country: 'Lumen Isles',
            latitude: 0,
            longitude: index,
            timezone: 'UTC',
          })),
        },
      }),
  );
  await visit(page);
  let dialog = await settings(page, 'Weather');
  await dialog.getByLabel('Search for a city', { exact: true }).fill('Cloud');
  await dialog
    .getByRole('button', { name: 'Search cities', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Choose a city', exact: true })
    .click();
  await dialog
    .getByRole('option', {
      name: 'Cloudfern, East Vale, Lumen Isles',
      exact: true,
    })
    .click();
  await expect(
    dialog.locator('p').filter({ hasText: /^Location:/ }),
  ).toHaveText('Location: Cloudfern, East Vale, Lumen Isles');
  await closeSettings(page);
  dialog = await settings(page, 'Weather');
  await expect(
    dialog.locator('p').filter({ hasText: /^Location:/ }),
  ).toHaveText('Location: Cloudfern, East Vale, Lumen Isles');
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
