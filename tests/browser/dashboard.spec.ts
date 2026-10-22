import type { Page } from '@playwright/test';
import { test, expect, visit, settings, closeSettings, expectView, noHorizontalOverflow } from './fixtures';
import { themes, views, referenceClock } from './matrix';
import { simulate } from '../../src/lib/data';
import { primaryAllowance } from '../../src/lib/agents';

async function browserDate(page: Page, date: string, locale: string, options: Intl.DateTimeFormatOptions = {}) {
  // Locale punctuation and padding come from the tested browser's Intl data.
  return page.evaluate(({ date, locale, options }) => new Intl.DateTimeFormat(locale, options)
    .format(new Date(`${date}T12:00:00`)), { date, locale, options });
}

test('all views navigate by controls, letters, numbers and wrapping arrows', { tag: '@smoke' }, async ({ page, audit }) => {
  await visit(page);
  const nav = page.getByRole('navigation', { name: 'Dashboard views' });
  for (const view of views) {
    await nav.getByRole('button', { name: new RegExp(`^${view}$`, 'i') }).click();
    await expectView(page, view);
    await expect(page).toHaveURL(new RegExp(`view=${view}`));
  }
  for (const [index, view] of views.entries()) {
    await page.keyboard.press(String(index + 1));
    await expectView(page, view);
  }
  await page.keyboard.press('ArrowRight');
  await expectView(page, 'summary');
  await page.keyboard.press('ArrowLeft');
  await expectView(page, 'feeds');
  for (const [key, view] of [['s', 'summary'], ['a', 'agents'], ['c', 'calendar'], ['w', 'weather'], ['f', 'feeds']]) {
    await page.keyboard.press(key);
    await expectView(page, view);
  }
  expect(audit.external, 'Replay must not request live sources').toHaveLength(0);
});

test('shortcuts ignore editable controls and modifier combinations', { tag: '@smoke' }, async ({ page }) => {
  await visit(page, { view: 'calendar' });
  await page.getByLabel('Jump to a date', { exact: true }).focus();
  await page.keyboard.press('w');
  await expectView(page, 'calendar');
  for (const kind of ['input', 'textarea', 'select', 'contenteditable']) {
    await page.locator('main').evaluate((main, kind) => {
      const field = document.createElement(kind === 'contenteditable' ? 'div' : kind);
      if (kind === 'contenteditable') field.contentEditable = 'true';
      if (kind === 'select') field.append(new Option('Editable choice', 'choice'));
      field.id = 'editable-guard-probe';
      field.setAttribute('aria-label', 'Editable shortcut probe');
      main.append(field);
      field.focus();
    }, kind);
    await page.keyboard.type('aswfc12345,');
    await expectView(page, 'calendar');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('#editable-guard-probe').evaluate(node => node.remove());
  }
  await page.locator('main').focus();
  await page.keyboard.press('Alt+a');
  await page.keyboard.press('Control+f');
  await expectView(page, 'calendar');
});

test('mobile navigation exposes overflowing views through the Bootstrap More menu', { tag: '@smoke' }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  const nav = page.getByRole('navigation', { name: 'Dashboard views' });
  for (const view of views) {
    const control = nav.getByRole('button', { name: new RegExp(`^${view}$`, 'i') });
    if (!await control.isVisible()) {
      await nav.getByRole('button', { name: 'More', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(nav.locator('.menu.show')).toBeVisible();
    }
    await control.click();
    await expectView(page, view);
    await noHorizontalOverflow(page);
  }
  await page.locator('main').focus();
  await page.keyboard.press('1');
  await expectView(page, 'summary');
});

for (const mobile of [false, true]) {
  test(`Settings ${mobile ? 'mobile drawer' : 'dialog'} keeps background inert, uses plugin tabs and restores focus on Escape`, { tag: '@smoke' }, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await visit(page);
    await page.keyboard.press(',');
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass(mobile ? /drawer/ : /dialog/);
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    const appearance = dialog.getByRole('tab', { name: 'Appearance', exact: true });
    await appearance.focus();
    for (const name of ['Display', 'Weather', 'Calendar', 'Feeds', 'Demo']) {
      await page.keyboard.press('ArrowRight');
      await expect(dialog.getByRole('tab', { name, exact: true })).toBeFocused();
      await expect(dialog.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(dialog.getByRole('tabpanel', { name, exact: true })).toBeVisible();
      await expectView(page, 'summary');
    }
    await page.keyboard.press('Home');
    await expect(appearance).toBeFocused();
    expect(await dialog.evaluate(node => node.matches(':modal'))).toBe(true);
    await page.getByRole('button', { name: 'Open settings', exact: true }).evaluate(node => node.focus());
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await dialog.getByRole('button', { name: 'Done', exact: true }).focus();
    // A native modal may visit browser chrome at its boundary; no background control may receive focus.
    for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate(node => document.activeElement === document.body || node.contains(document.activeElement))).toBe(true);
    }
    await closeSettings(page);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toBeFocused();
    await settings(page);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await noHorizontalOverflow(page);
  });
}

for (const mobile of [false, true]) {
  test(`Settings ${mobile ? 'drawer' : 'dialog'} closes through its plugin with normal motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await visit(page);
    await page.evaluate(name => document.addEventListener(name, event => {
      (event.target as HTMLElement).dataset.pluginReady = 'true';
    }, { once: true }), mobile ? 'shown.bs.drawer' : 'shown.bs.dialog');
    const dialog = await settings(page);
    await expect(dialog).toHaveAttribute('data-plugin-ready', 'true');
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toBeFocused();
    await page.keyboard.press('w');
    await expectView(page, 'weather');
  });
}

test('URL overrides apply only to this visit, including after an unrelated deliberate edit', { tag: '@smoke' }, async ({ page }) => {
  await visit(page);
  let dialog = await settings(page, 'Display');
  await dialog.getByLabel('Startup view', { exact: true }).selectOption('agents');
  await closeSettings(page);
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('dayframe.settings.v1')!));
  await visit(page, { theme: 'nebuchadnezzar', scheme: 'light', scale: '150', scenario: 'offline', view: 'feeds' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'nebuchadnezzar');
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  await expectView(page, 'feeds');
  dialog = await settings(page, 'Calendar');
  await dialog.getByLabel('First day of the week', { exact: true }).selectOption('0');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dayframe.settings.v1')!));
  expect(saved).toEqual({ ...original, firstDay: 0 });
  await closeSettings(page);
  await visit(page);
  await expectView(page, 'agents');
  await expect(page.locator('html')).toHaveAttribute('data-theme', original.theme);
  expect(await page.locator('html').evaluate(node => node.style.getPropertyValue('--display-scale'))).toBe('1');
  await expect(page.getByText('Offline scenario:', { exact: false })).toHaveCount(0);
});

for (const source of ['stored', 'URL'] as const) {
  test(`unknown ${source} theme falls back consistently in the dashboard and theme controls`, async ({ page }) => {
    await visit(page);
    const stored = { version: 1, theme: source === 'stored' ? 'retired-theme' : 'nebuchadnezzar', startupView: 'agents' };
    await page.evaluate(value => localStorage.setItem('dayframe.settings.v1', JSON.stringify(value)), stored);
    await visit(page, source === 'URL' ? { theme: 'retired-theme' } : {});
    await expectView(page, 'agents');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');
    await expect(page.locator('html')).toHaveAttribute('data-layout', 'standard');
    await page.getByRole('button', { name: 'Choose theme', exact: true }).click();
    const menu = page.locator('.menu.show');
    await expect(menu.getByRole('button', { name: 'Default', exact: true })).toHaveAttribute('aria-current', 'true');
    await expect(menu.locator('[aria-current="true"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    const dialog = await settings(page);
    await expect(dialog.getByRole('button', { name: /^Default / })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.locator('.theme-choice[aria-pressed="true"]')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dayframe.settings.v1')!))).toEqual(stored);
    await dialog.getByRole('button', { name: /^Nebuchadnezzar / }).click();
    await closeSettings(page);
    await visit(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'nebuchadnezzar');
    await expect(page.locator('html')).toHaveAttribute('data-layout', 'console');
  });
}

test('theme picker discovers every manifest and generated options clear when switching themes', { tag: '@smoke' }, async ({ page }) => {
  await visit(page);
  const dialog = await settings(page);
  for (const theme of themes) {
    const choice = dialog.getByRole('button', { name: new RegExp(`^${theme.name} `) });
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);
    for (const [key, option] of Object.entries(theme.options)) {
      const control = dialog.getByRole('switch', { name: option.label, exact: true });
      await expect(control).toBeChecked({ checked: option.default });
      await control.setChecked(!option.default);
      await expect(page.locator('html')).toHaveAttribute(`data-theme-${key}`, option.default ? 'off' : 'on');
    }
  }
  await dialog.getByRole('button', { name: /^Default / }).click();
  expect(await page.locator('html').evaluate(node => node.getAttributeNames().filter(name => name.startsWith('data-theme-')))).toEqual([]);
  await closeSettings(page);
  await page.getByRole('button', { name: 'Choose theme', exact: true }).click();
  for (const theme of themes) await expect(page.locator('.menu.show').getByRole('button', { name: theme.name, exact: true })).toBeVisible();
  await page.locator('.menu.show').getByRole('button', { name: 'Nebuchadnezzar', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
});

test('system scheme reacts to preference changes; auto follows replay day and night', { tag: '@smoke' }, async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await visit(page, { scheme: 'system' });
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');
  await visit(page, { scheme: 'auto' });
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');
  await visit(page, { scheme: 'auto', clock: '2026-11-03T23:30:00Z' });
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  await visit(page, { theme: 'nebuchadnezzar', scheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
});

test('scale control changes root sizing and persists deliberate edits', { tag: '@smoke' }, async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await visit(page);
  const original = await page.locator('html').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  const dialog = await settings(page, 'Display');
  const scale = dialog.getByRole('slider', { name: /Display scale/ });
  await scale.focus();
  await page.keyboard.press('End');
  await expect(scale).toHaveValue('150');
  expect(await page.locator('html').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThan(original);
  await closeSettings(page);
  await page.reload();
  expect(await page.locator('html').evaluate(node => node.style.getPropertyValue('--display-scale'))).toBe('1.5');
});

for (const [scenario, message] of [
  ['running-low', 'is running low'], ['reconnect', 'needs reconnecting'],
  ['offline', 'Offline scenario:'], ['stale', 'Stale scenario:'],
]) {
  test(`${scenario} scenario has explicit status cues`, async ({ page, audit }) => {
    await visit(page, { scenario });
    await expect(page.locator('main').getByText(message, { exact: false }).first()).toBeVisible();
    if (scenario === 'reconnect' || scenario === 'running-low') {
      await page.getByRole('button', { name: /Review agent capacity/ }).click();
      await expect(page.getByText(scenario === 'reconnect' ? 'Reconnect needed' : 'Nearly exhausted', { exact: false }).first()).toBeVisible();
    } else {
      await page.keyboard.press('w');
      await expect(page.getByText(scenario === 'offline' ? 'Weather is offline.' : 'Weather could not refresh.', { exact: false })).toBeVisible();
      await page.keyboard.press('f');
      await expect(page.getByText('Bootstrap feeds could not refresh.', { exact: false })).toBeVisible();
    }
    expect(audit.external).toHaveLength(0);
  });
}

test('reminder toast can be dismissed and reminders can be disabled', async ({ page }) => {
  await visit(page, { scenario: 'reminder-due' });
  const toast = page.locator('.toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Release readiness check');
  await toast.getByRole('button', { name: 'Dismiss reminder' }).click();
  await expect(toast).toHaveCount(0);
  await visit(page, { scenario: 'reminder-due' });
  const dialog = await settings(page, 'Calendar');
  await dialog.getByRole('switch', { name: 'Show event reminders', exact: true }).uncheck();
  await closeSettings(page);
  await expect(toast).toHaveCount(0);
});

test('calendar changes months, keeps the datepicker input in sync and opens event details', async ({ page }) => {
  await visit(page, { view: 'calendar' });
  const input = page.getByLabel('Jump to a date', { exact: true });
  await expect(input).toHaveValue('03/11/2026');
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'December 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  const wednesday = page.getByRole('button', {
    name: `${await browserDate(page, '2026-11-04', 'en-GB', { dateStyle: 'full' })}, 5 events`, exact: true,
  });
  await wednesday.click();
  await expect(page.getByRole('heading', { name: 'Wednesday 4 Nov', exact: true })).toBeVisible();
  await expect(wednesday).toHaveAttribute('aria-pressed', 'true');
  await expect(input).toHaveValue('04/11/2026');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tuesday 3 Nov', exact: true })).toBeVisible();
  await expect(input).toHaveValue('03/11/2026');
  await page.getByRole('button', { name: /^\+\d+ more events$/ }).click();
  const agenda = page.getByRole('dialog', { name: /^All events for / });
  await expect(agenda).toBeVisible();
  const details = agenda.getByRole('button', { name: 'Details for Quiet build time', exact: true });
  await details.focus();
  await page.keyboard.press('ArrowRight');
  await expectView(page, 'calendar');
  await page.keyboard.press('Enter');
  await expect(page.locator('.popover')).toBeVisible();
  await expect(page.locator('.popover')).toContainText('Protect a little uninterrupted time');
  await page.keyboard.press('Enter');
  await expect(page.locator('.popover')).toHaveCount(0);
  await agenda.getByRole('button', { name: 'Close all events', exact: true }).click();
  await expect(agenda).toHaveCount(0);
  await page.getByLabel('Jump to a date', { exact: true }).click();
  const picker = page.locator('.vc');
  await expect(picker).toBeVisible();
  await expect(picker).toHaveCSS('opacity', '1');
  await picker.locator('[data-vc-date="2026-11-05"] button').click();
  await expect(page.getByRole('heading', { name: 'Thursday 5 Nov', exact: true })).toBeVisible();
  await expect(input).toHaveValue('05/11/2026');
  await expect(page.getByRole('button', {
    name: `${await browserDate(page, '2026-11-05', 'en-GB', { dateStyle: 'full' })}, 2 events`, exact: true,
  })).toHaveAttribute('aria-pressed', 'true');
  await expect(picker).toHaveAttribute('aria-hidden', 'true');
  await input.click();
  await expect(picker).toHaveCSS('opacity', '1');
  await expect(picker.locator('[data-vc-date-selected]')).toHaveCount(1);
  await expect(picker.locator('[data-vc-date-selected]')).toHaveAttribute('data-vc-date', '2026-11-05');
  await expect(input).toHaveValue('05/11/2026');
});

test('datepicker locale and first weekday follow Settings without losing the selected date', async ({ page }) => {
  await visit(page, { view: 'calendar' });
  await page.getByRole('button', {
    name: `${await browserDate(page, '2026-11-04', 'en-GB', { dateStyle: 'full' })}, 5 events`, exact: true,
  }).click();
  const input = page.getByLabel('Jump to a date', { exact: true });
  const picker = page.locator('.vc');
  await input.click();
  await expect(picker.locator('[data-vc-week-day]')).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await page.keyboard.press('Escape');
  for (const config of [
    { locale: 'en-US', firstDay: '0', month: 'November', weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    { locale: 'fr-FR', firstDay: '1', month: 'Novembre', weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] },
  ]) {
    const dialog = await settings(page, 'Display');
    await dialog.getByLabel('Date and number locale', { exact: true }).selectOption(config.locale);
    await dialog.getByRole('tab', { name: 'Calendar', exact: true }).click();
    await dialog.getByLabel('First day of the week', { exact: true }).selectOption(config.firstDay);
    await closeSettings(page);
    await expect(input).toHaveValue(await browserDate(page, '2026-11-04', config.locale));
    await input.click();
    await expect(picker).toHaveCount(1);
    await expect(picker).toHaveCSS('opacity', '1');
    await expect(picker.locator('[data-vc="month"]')).toHaveText(config.month);
    await expect(picker.locator('[data-vc-week-day]')).toHaveText(config.weekdays);
    await expect(picker.locator('[data-vc-date-selected]')).toHaveCount(1);
    await expect(picker.locator('[data-vc-date-selected]')).toHaveAttribute('data-vc-date', '2026-11-04');
    await page.keyboard.press('Escape');
  }
});

for (const [dateFormat, date] of [
  ['locale', 'Tue, Nov 3'], ['day-month', '03/11/2026'],
  ['month-day', '11/03/2026'], ['iso', '2026-11-03'],
]) {
  test(`${dateFormat} date format displays and persists independently of locale and time format`, async ({ page }) => {
    await visit(page, { view: 'calendar' });
    let dialog = await settings(page, 'Display');
    await dialog.getByLabel('Date and number locale', { exact: true }).selectOption('en-US');
    await dialog.getByLabel('Time format', { exact: true }).selectOption('h23');
    const original = await page.evaluate(() => JSON.parse(localStorage.getItem('dayframe.settings.v1')!));
    await dialog.getByLabel('Date format', { exact: true }).selectOption(dateFormat);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dayframe.settings.v1')!))).toEqual({ ...original, dateFormat });
    await closeSettings(page);
    await expect(page.locator('header').getByText(`${date} · replay`, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: dateFormat === 'locale' ? 'Tuesday, Nov 3' : date, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
    await expect(page.getByLabel('Current time', { exact: true })).toHaveText('09:30');
    dialog = await settings(page, 'Display');
    await dialog.getByLabel('Date and number locale', { exact: true }).selectOption('fr-FR');
    await dialog.getByLabel('Time format', { exact: true }).selectOption('h12');
    await expect(dialog.getByLabel('Date format', { exact: true })).toHaveValue(dateFormat);
    await closeSettings(page);
    await page.reload();
    const reloadedDate = dateFormat === 'locale' ? 'mar. 3 nov.' : date;
    await expect(page.locator('header').getByText(`${reloadedDate} · replay`, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: dateFormat === 'locale' ? 'mardi 3 nov.' : date, exact: true })).toBeVisible();
    dialog = await settings(page, 'Display');
    await expect(dialog.getByLabel('Date format', { exact: true })).toHaveValue(dateFormat);
    await expect(dialog.getByLabel('Date and number locale', { exact: true })).toHaveValue('fr-FR');
    await expect(dialog.getByLabel('Time format', { exact: true })).toHaveValue('h12');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dayframe.settings.v1')!))).toEqual({ ...original, dateFormat, locale: 'fr-FR', hourCycle: 'h12' });
  });
}

test('datepicker supports keyboard selection and Escape removes it visually and from the accessibility tree', { tag: '@smoke' }, async ({ page }) => {
  await visit(page, { view: 'calendar' });
  const input = page.getByLabel('Jump to a date', { exact: true });
  await input.focus();
  const picker = page.locator('.vc');
  await expect(picker).toBeVisible();
  await expect(picker).toHaveCSS('opacity', '1');
  const bounds = await picker.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await picker.locator('[data-vc-date="2026-11-05"] button').focus();
  await page.keyboard.press('ArrowRight');
  await expectView(page, 'calendar');
  await expect(picker.locator('[data-vc-date="2026-11-06"] button')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expectView(page, 'calendar');
  await expect(picker.locator('[data-vc-date="2026-11-05"] button')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Thursday 5 Nov', exact: true })).toBeVisible();
  await expect(input).toHaveValue('05/11/2026');
  // Bootstrap hides this popup with opacity and inert, preserving its positioning box.
  await expect(picker).toHaveCSS('opacity', '0');
  await expect(picker).toHaveAttribute('aria-hidden', 'true');
  await expect(picker).toHaveAttribute('inert', '');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await expect(picker).toBeVisible();
  await expect(picker).toHaveCSS('opacity', '1');
  await page.keyboard.press('ArrowDown');
  expect(await picker.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCSS('opacity', '0');
  await expect(picker).toHaveAttribute('aria-hidden', 'true');
  await expect(picker).toHaveAttribute('inert', '');
  await expect(input).toBeFocused();
  await expectView(page, 'calendar');
});

test('every agent shows percentage allowances, independent reset times and no message counts', async ({ page }) => {
  await visit(page, { view: 'agents' });
  const agents = simulate(new Date(referenceClock), 'reference', 'steady').agents;
  await expect(page.getByRole('article', { name: / capacity$/ })).toHaveCount(6);
  for (const agent of agents) {
    const card = page.getByRole('article', { name: `${agent.name} capacity`, exact: true });
    await expect(card.getByRole('heading', { name: agent.name, exact: true })).toBeVisible();
    await expect(card.locator('.quota-value')).toHaveText(`${primaryAllowance(agent).remainingPercent}% left`);
    await expect(card.getByRole('progressbar')).toHaveCount(agent.allowances.length);
    for (const allowance of agent.allowances) {
      const meter = card.getByRole('progressbar', { name: `${agent.name} ${allowance.label} remaining`, exact: true });
      await expect(meter).toHaveAttribute('aria-valuenow', String(allowance.remainingPercent));
      expect(await meter.locator('.progress-bar').evaluate(node => (node as HTMLElement).style.width)).toBe(`${allowance.remainingPercent}%`);
      await expect(meter.locator('..').locator('time')).toHaveAttribute('datetime', allowance.resetsAt);
    }
    await expect(card).not.toContainText(/(?:messages|requests|tokens|credits) left|% used/);
  }
  await expect(page.getByText('Reset credits', { exact: false })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Invented usage follows');
  await expect(page.locator('footer')).toContainText('Agent usage, accounts, calendars and non-Bootstrap feeds are simulated.');
});

test('the datepicker stays inside the viewport across themes, scale, scrolling and resizing', async ({ page }) => {
  const cases = [
    { width: 1280, height: 720, scale: '100', theme: 'default', scheme: 'light' },
    { width: 390, height: 844, scale: '100', theme: 'default', scheme: 'dark' },
    { width: 1280, height: 720, scale: '150', theme: 'nebuchadnezzar', scheme: 'dark' },
    { width: 1920, height: 1080, scale: '150', theme: 'tideline', scheme: 'light' },
    { width: 1024, height: 768, scale: '100', theme: 'tideline', scheme: 'dark' },
  ];
  for (const { width, height, ...overrides } of cases) {
    await page.setViewportSize({ width, height });
    await visit(page, { view: 'calendar', ...overrides });
    const input = page.getByLabel('Jump to a date', { exact: true });
    const picker = page.locator('.vc');
    await input.click();
    await expect(picker).toHaveCSS('opacity', '1');
    const fits = async () => picker.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth;
    });
    await expect.poll(fits, JSON.stringify({ width, height, ...overrides })).toBe(true);
    await page.setViewportSize({ width: width - 30, height: height - 30 });
    await expect.poll(fits, 'An open datepicker must reposition when the viewport changes').toBe(true);
    await picker.locator('[data-vc-date="2026-11-05"] button').click();
    await expect(input).toHaveValue('05/11/2026');
    await expect(picker).toHaveAttribute('aria-hidden', 'true');
  }
});

for (const { density, viewport, pageSize } of [
  { density: 'regular', viewport: { width: 1920, height: 1080 }, pageSize: 4 },
  { density: 'compact', viewport: { width: 1280, height: 720 }, pageSize: 2 },
]) {
  test(`${density} feed categories, pagination and empty-state recovery change visible stories`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await visit(page, { view: 'feeds' });
    const titles = page.locator('.story-title');
    await expect(titles).toHaveCount(pageSize);
    const first = await titles.allTextContents();
    const pages = page.getByRole('navigation', { name: 'Feed pages', exact: true });
    await expect(pages.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
    await pages.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(titles).toHaveCount(pageSize);
    expect(await titles.allTextContents()).not.toEqual(first);
    expect((await titles.allTextContents()).filter(title => first.includes(title))).toEqual([]);
    await expect(pages.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Science', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Science', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(pages.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
    await expect(titles).toHaveCount(Math.min(3, pageSize));
    const dialog = await settings(page, 'Feeds');
    for (const category of ['Bootstrap', 'Technology', 'Design', 'Science']) await dialog.getByRole('checkbox', { name: category, exact: true }).uncheck();
    await closeSettings(page);
    await expect(page.getByRole('heading', { name: 'No stories in these categories', exact: true })).toBeVisible();
    await expect(titles).toHaveCount(0);
    await page.getByRole('button', { name: 'Show all categories', exact: true }).click();
    await expect(titles).toHaveCount(pageSize);
  });
}

test('demo disclosure, Bootstrap information and inspection lens remain available', async ({ page }) => {
  await visit(page);
  await expect(page.locator('footer')).toContainText('Agent usage, accounts, calendars and non-Bootstrap feeds are simulated.');
  await expect(page.locator('footer')).toContainText('Dayframe is unaffiliated.');
  await page.getByRole('button', { name: 'About Bootstrap', exact: true }).click();
  const about = page.getByRole('dialog', { name: 'Bootstrap, at work', exact: true });
  await expect(about).toContainText('6.0.0-alpha.1');
  await expect(about).toContainText(`${themes.length} themes discovered automatically`);
  await about.getByRole('button', { name: 'Turn on Bootstrap lens', exact: true }).click();
  await expect(about).toHaveCount(0);
  expect(await page.locator('.lens-label').count()).toBeGreaterThan(0);
  for (const href of await page.locator('.lens-label').evaluateAll(nodes => nodes.map(node => (node as HTMLAnchorElement).href))) {
    expect(href).toMatch(/^https:\/\/getbootstrap\.com\/docs\/6\.0\//);
  }
});

test('storage failure leaves the dashboard usable and explains unsaved changes', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    get() { throw new DOMException('Storage unavailable in this test', 'SecurityError'); },
  }));
  await visit(page);
  const dialog = await settings(page);
  await dialog.getByLabel('Colour scheme', { exact: true }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  await closeSettings(page);
  await expect(page.getByRole('status').filter({ hasText: 'Settings could not be saved.' })).toBeVisible();
  await page.keyboard.press('w');
  await expectView(page, 'weather');
});

test('Demo scenario control applies immediately and reset restores browser defaults', async ({ page }) => {
  await visit(page, { theme: 'nebuchadnezzar', scheme: 'dark', scale: '150', scenario: 'offline' });
  let dialog = await settings(page, 'Demo');
  await dialog.getByLabel('Scenario', { exact: true }).selectOption('running-low');
  await closeSettings(page);
  await expect(page.locator('main').getByText('is running low', { exact: false }).first()).toBeVisible();
  dialog = await settings(page, 'Demo');
  await dialog.getByRole('button', { name: 'Reset settings', exact: true }).click();
  await expect(dialog.getByLabel('Scenario', { exact: true })).toHaveValue('steady');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');
  expect(await page.locator('html').evaluate(node => node.style.getPropertyValue('--display-scale'))).toBe('1');
  const query = new URL(page.url()).searchParams;
  for (const key of ['theme', 'scheme', 'scale', 'scenario']) expect(query.has(key)).toBe(false);
  await closeSettings(page);
  await expect(page.getByRole('status').filter({ hasText: 'Settings restored to this browser’s defaults.' })).toBeVisible();
  await visit(page);
  await expectView(page, 'summary');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');
});

test('rotation advances views and pauses during interaction with Settings', async ({ page }) => {
  await page.clock.install({ time: new Date(referenceClock) });
  await visit(page);
  const dialog = await settings(page, 'Display');
  await dialog.getByLabel('Seconds per view', { exact: true }).fill('10');
  await dialog.getByLabel('Seconds per view', { exact: true }).press('Tab');
  await dialog.getByRole('switch', { name: 'Rotate views', exact: true }).check();
  await page.clock.runFor(12_000);
  await expectView(page, 'summary');
  await closeSettings(page);
  await page.clock.runFor(12_000);
  await expectView(page, 'agents');
});

test('rotation pauses while the full agenda dialog is open and resumes after closing', async ({ page }) => {
  await page.clock.install({ time: new Date(referenceClock) });
  await visit(page, { view: 'calendar' });
  const dialog = await settings(page, 'Display');
  await dialog.getByLabel('Seconds per view', { exact: true }).fill('10');
  await dialog.getByLabel('Seconds per view', { exact: true }).press('Tab');
  await dialog.getByRole('switch', { name: 'Rotate views', exact: true }).check();
  await closeSettings(page);
  await page.getByRole('button', { name: /^\+\d+ more events$/ }).click();
  const agenda = page.getByRole('dialog', { name: /^All events for / });
  await expect(agenda).toBeVisible();
  await page.clock.runFor(12_000);
  await expectView(page, 'calendar');
  await expect(agenda).toBeVisible();
  await agenda.getByRole('button', { name: 'Close all events', exact: true }).click();
  await page.clock.runFor(12_000);
  await expectView(page, 'weather');
});
