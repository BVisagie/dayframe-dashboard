import { test as base, expect, type Page, type Request } from '@playwright/test';
import { referenceClock } from './matrix';

export const apiOrigins = [
  'https://api.open-meteo.com', 'https://geocoding-api.open-meteo.com',
  'https://blog.getbootstrap.com', 'https://api.github.com',
];
export type NetworkAudit = { external: Request[]; forbidden: string[]; errors: string[] };

export const test = base.extend<{ audit: NetworkAudit }>({
  audit: [async ({ page, baseURL }, use) => {
    const audit: NetworkAudit = { external: [], forbidden: [], errors: [] };
    const localOrigin = new URL(baseURL!).origin;
    page.on('pageerror', error => audit.errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol) || url.origin === localOrigin) return;
      audit.external.push(request);
      const allowed = apiOrigins.includes(url.origin)
        && ['fetch', 'xhr'].includes(request.resourceType())
        && (url.origin !== 'https://api.github.com' || url.pathname === '/repos/twbs/bootstrap/releases')
        && (url.origin !== 'https://blog.getbootstrap.com' || url.pathname === '/feed.xml')
        && (url.origin !== 'https://api.open-meteo.com' || url.pathname === '/v1/forecast')
        && (url.origin !== 'https://geocoding-api.open-meteo.com' || url.pathname === '/v1/search');
      if (!allowed) audit.forbidden.push(`${request.resourceType()} ${url.href}`);
    });
    // Live tests add more-specific mocks after this route. No test contacts an API.
    await page.route('**/*', route => new URL(route.request().url()).origin === localOrigin
      ? route.continue() : route.abort('blockedbyclient'));
    await use(audit);
    expect(audit.forbidden, 'Only approved APIs may load remotely; all assets must be local').toEqual([]);
    expect(audit.errors, 'Application exceptions').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function visit(page: Page, overrides: Record<string, string> = {}) {
  const query = new URLSearchParams({ clock: referenceClock, seed: 'reference', ...overrides });
  await page.goto(`?${query}`);
  await expect(page.locator('main h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

export async function settings(page: Page, section?: string) {
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(dialog).toBeVisible();
  if (section) await dialog.getByRole('tab', { name: section, exact: true }).click();
  return dialog;
}

export async function closeSettings(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toBeFocused();
}

export async function expectView(page: Page, view: string) {
  const name = view.charAt(0).toUpperCase() + view.slice(1);
  await expect(page.locator('main h1')).toHaveText(view === 'summary' ? 'Your day, in focus' : name);
  // NavOverflow keeps the original stateful button when its visible copy moves into More.
  await expect(page.getByRole('navigation', { name: 'Dashboard views' })
    .locator('.nav-link').filter({ hasText: new RegExp(`^${name}$`) })).toHaveAttribute('aria-current', 'page');
}

export async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    'The document must fit the viewport without horizontal scrolling').toBeLessThanOrEqual(0);
}
