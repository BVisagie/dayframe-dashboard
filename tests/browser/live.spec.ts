import type { Page } from '@playwright/test';
import { test, expect, settings, closeSettings, apiOrigins } from './fixtures';
import { referenceClock } from './matrix';

function forecast(fahrenheit = false) {
  const dates = Array.from(
    { length: 7 },
    (_, index) => `2026-11-${String(3 + index).padStart(2, '0')}`,
  );
  return {
    current: {
      temperature_2m: fahrenheit ? 77 : 25,
      apparent_temperature: fahrenheit ? 79 : 26,
      weather_code: 61,
      wind_speed_10m: fahrenheit ? 10 : 16,
      relative_humidity_2m: 63,
    },
    daily: {
      time: dates,
      temperature_2m_min: dates.map(() => (fahrenheit ? 50 : 10)),
      temperature_2m_max: dates.map(() => (fahrenheit ? 77 : 25)),
      weather_code: [0, 2, 45, 61, 71, 80, 95],
      precipitation_probability_max: [0, 10, 20, 30, 40, 50, 60],
      sunrise: dates.map((date) => `${date}T07:00`),
      sunset: dates.map((date) => `${date}T19:00`),
    },
    hourly: {
      time: Array.from(
        { length: 24 },
        (_, index) => `2026-11-03T${String(index).padStart(2, '0')}:00`,
      ),
      temperature_2m: Array(24).fill(fahrenheit ? 68 : 20),
      weather_code: Array(24).fill(2),
      precipitation_probability: Array(24).fill(17),
    },
  };
}

async function mockSources(page: Page, failing = false) {
  const state = { failing, forecasts: [] as URL[], geocoding: [] as URL[] };
  await page.route(
    'https://api.open-meteo.com/v1/forecast?*',
    async (route) => {
      const url = new URL(route.request().url());
      state.forecasts.push(url);
      if (state.failing)
        return route.fulfill({ status: 503, body: 'Temporarily unavailable' });
      await route.fulfill({
        json: forecast(
          url.searchParams.get('temperature_unit') === 'fahrenheit',
        ),
      });
    },
  );
  await page.route(
    'https://geocoding-api.open-meteo.com/v1/search?*',
    (route) => {
      state.geocoding.push(new URL(route.request().url()));
      return route.fulfill({
        json: {
          results: [
            { name: 'Cloudfern', latitude: 0, longitude: 0, timezone: 'UTC' },
          ],
        },
      });
    },
  );
  await page.route('https://blog.getbootstrap.com/feed.xml', (route) =>
    route.fulfill({
      contentType: 'application/rss+xml',
      body: '<rss version="2.0"><channel><title>Bootstrap</title><item><title>Browser validation headline</title><link>https://blog.getbootstrap.com/2026/11/03/validation/</link><pubDate>Tue, 03 Nov 2026 09:00:00 GMT</pubDate></item></channel></rss>',
    }),
  );
  await page.route(
    'https://api.github.com/repos/twbs/bootstrap/releases?*',
    (route) =>
      route.fulfill({
        json: [
          {
            name: 'Bootstrap validation release',
            tag_name: 'validation',
            html_url:
              'https://github.com/twbs/bootstrap/releases/tag/validation',
            published_at: '2026-11-03T09:00:00Z',
            draft: false,
          },
        ],
      }),
  );
  return state;
}

test('live weather maps mocked current, daily and hourly fields; units and city combobox update requests', async ({
  page,
  audit,
}) => {
  await page.clock.install({ time: new Date(referenceClock) });
  const state = await mockSources(page);
  // A clock URL disables live sources. Freeze browser time instead for this integration path.
  await page.goto('?view=weather&seed=reference');
  await expect(page.getByText('Weather by', { exact: false })).toBeVisible();
  await expect(page.locator('.weather-temperature')).toHaveText('25°C');
  await expect(
    page.getByText('Feels like 26° · Wind 16 km/h · 63% humidity', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .locator('.weather-temperature')
      .locator('..')
      .getByText('Rain', { exact: true }),
  ).toBeVisible();
  const daily = page.getByRole('table', {
    name: 'Seven-day forecast',
    exact: true,
  });
  await expect(daily.locator('tbody tr')).toHaveCount(7);
  await expect(daily.locator('tbody tr').first()).toContainText('10°');
  await expect(daily.locator('tbody tr').last()).toContainText('60%');
  const hourly = page.getByRole('table', {
    name: 'Hourly temperatures and precipitation',
    exact: true,
  });
  await expect(hourly.locator('tbody tr')).toHaveCount(6);
  await expect(hourly.locator('tbody tr').first()).toContainText('20°');
  await expect(hourly.locator('tbody tr').first()).toContainText('17%');
  const pages = page.getByRole('navigation', { name: 'Hourly forecast pages' });
  await expect(
    pages.getByRole('button', { name: 'Previous hours' }),
  ).toBeDisabled();
  for (let index = 1; index < 4; index++) {
    await pages.getByRole('button', { name: 'Next hours' }).click();
    await expect(hourly.locator('tbody tr').first()).toContainText(
      `${index * 6}:00`,
    );
    await expect(hourly.locator('tbody tr')).toHaveCount(6);
  }
  await expect(
    pages.getByRole('button', { name: 'Next hours' }),
  ).toBeDisabled();
  let dialog = await settings(page, 'Weather');
  await dialog.getByLabel('Units', { exact: true }).selectOption('fahrenheit');
  await closeSettings(page);
  await expect(page.locator('.weather-temperature')).toHaveText('77°F');
  await expect(
    page.getByText('Feels like 79° · Wind 10 mph · 63% humidity', {
      exact: true,
    }),
  ).toBeVisible();
  expect(state.forecasts.at(-1)?.searchParams.get('wind_speed_unit')).toBe(
    'mph',
  );
  dialog = await settings(page, 'Weather');
  await dialog
    .getByLabel('Search for a city', { exact: true })
    .fill('Cloudfern');
  await dialog
    .getByRole('button', { name: 'Search cities', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('1 cities found');
  await dialog
    .getByRole('button', { name: 'Choose a city', exact: true })
    .click();
  await dialog.getByRole('option', { name: 'Cloudfern', exact: true }).click();
  await expect(
    dialog.locator('p').filter({ hasText: /^Location:/ }),
  ).toContainText('Cloudfern');
  await closeSettings(page);
  await expect(page.getByText('Cloudfern', { exact: true })).toBeVisible();
  expect(state.geocoding).toHaveLength(1);
  expect(
    new Set(audit.external.map((request) => new URL(request.url()).origin)),
  ).toEqual(new Set(apiOrigins));
  for (const request of audit.external)
    expect(request.headers().cookie).toBeUndefined();
});

test('live Bootstrap headlines show original links and refresh respects the release interval', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(referenceClock) });
  await mockSources(page);
  let releases = 0;
  page.on('request', (request) => {
    if (request.url().startsWith('https://api.github.com/')) releases++;
  });
  await page.goto('?view=feeds&seed=reference');
  await page.getByRole('button', { name: 'Bootstrap', exact: true }).click();
  await expect(
    page.getByRole('link', {
      name: 'Browser validation headline',
      exact: true,
    }),
  ).toHaveAttribute(
    'href',
    'https://blog.getbootstrap.com/2026/11/03/validation/',
  );
  await expect(
    page.getByRole('link', {
      name: 'Bootstrap validation release',
      exact: true,
    }),
  ).toHaveAttribute(
    'href',
    'https://github.com/twbs/bootstrap/releases/tag/validation',
  );
  await expect(page.locator('.story-excerpt')).toHaveCount(0);
  await expect(page.locator('.story-title')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Refresh live sources', exact: true })
    .click();
  expect(releases).toBe(1);
});

test('failed live forecast falls back and reconnect refresh recovers after backoff', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(referenceClock) });
  const state = await mockSources(page, true);
  await page.goto('?view=weather&seed=reference');
  await expect(
    page.getByRole('status').filter({ hasText: 'Weather is offline.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Simulated forecast · no live location selected.', {
      exact: true,
    }),
  ).toBeVisible();
  state.failing = false;
  await page.clock.runFor(61_000);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText('Weather by', { exact: false })).toBeVisible();
  await expect(page.locator('.weather-temperature')).toHaveText('25°C');
  await expect(
    page.getByRole('status').filter({ hasText: 'Weather is offline.' }),
  ).toHaveCount(0);
});

test('deterministic replay has identical content on reload and never requests a live API', async ({
  page,
  audit,
}) => {
  await page.goto(`?view=agents&clock=${referenceClock}&seed=reference`);
  await expect(page.locator('main h1')).toHaveText('Agents');
  const before = await page.locator('main').innerText();
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('Agents');
  expect(await page.locator('main').innerText()).toBe(before);
  await page
    .getByRole('button', { name: 'Refresh live sources', exact: true })
    .click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'This replay uses deterministic demo data.' }),
  ).toBeVisible();
  expect(audit.external).toHaveLength(0);
});
