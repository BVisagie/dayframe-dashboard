import {
  test,
  expect,
  visit,
  settings,
  closeSettings,
  expectView,
} from './fixtures';

test('character shortcuts can be disabled and Shift combinations leave the view alone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  await page.keyboard.press('Shift+w');
  await expectView(page, 'summary');
  const dialog = await settings(page, 'Display');
  await dialog
    .getByRole('switch', { name: 'Keyboard shortcuts', exact: true })
    .uncheck();
  await closeSettings(page);
  await page.locator('main').focus();
  for (const key of ['w', '3', ',']) await page.keyboard.press(key);
  await expectView(page, 'summary');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.locator('[data-view="weather"][aria-keyshortcuts]'),
  ).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expectView(page, 'agents');
  await page.reload();
  await page.locator('main').focus();
  await page.keyboard.press('w');
  await expectView(page, 'agents');
  const reopened = await settings(page, 'Display');
  await expect(
    reopened.getByRole('switch', { name: 'Keyboard shortcuts', exact: true }),
  ).not.toBeChecked();
});

for (const viewport of [
  { width: 1366, height: 640 },
  { width: 390, height: 600 },
]) {
  test(`About at ${viewport.width} scrolls and closes through Bootstrap with focus restored`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await visit(page);
    const trigger = page.getByRole('button', {
      name: 'About Bootstrap',
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole('dialog', {
      name: 'Bootstrap, at work',
      exact: true,
    });
    const mobile = viewport.width === 390;
    await expect(
      dialog.locator(mobile ? '.drawer-body' : '.dialog-body'),
    ).toHaveCSS('overflow-y', 'auto');
    await expect(
      dialog.locator(mobile ? '.drawer-header' : '.dialog-header'),
    ).toBeVisible();
    const close = dialog.getByRole('button', {
      name: 'Close about',
      exact: true,
    });
    await expect(close).toBeInViewport({ ratio: 1 });
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog
      .getByRole('button', { name: 'Turn on Bootstrap lens', exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('.lens-target').first()).toBeVisible();
  });
}

test.describe('browser time zones outside UTC', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('a replay clock without an offset has the same instant and content as UTC', async ({
    page,
  }) => {
    await visit(page, { clock: '2026-11-03T09:30', view: 'calendar' });
    const noOffset = await page.locator('main').innerText();
    await visit(page, { clock: '2026-11-03T09:30Z', view: 'calendar' });
    expect(await page.locator('main').innerText()).toBe(noOffset);
    await visit(page, { clock: '2026-11-03T09:30Z', view: 'summary' });
    const comingUp = page.getByRole('region', {
      name: 'Coming up',
      exact: true,
    });
    const more = comingUp.getByRole('button', { name: /^\+\d+ more events?$/ });
    const visible = await comingUp.locator('.agenda-list > li').count();
    const remaining = (await more.count())
      ? Number((await more.innerText()).match(/\d+/)![0])
      : 0;
    const summaryTitles = await comingUp
      .locator('[data-bs-component="popover"]')
      .allTextContents();
    await page.keyboard.press('c');
    const selected = page.locator('.month-day[aria-pressed="true"]');
    await expect(selected).toHaveAttribute(
      'aria-label',
      new RegExp(`, ${visible + remaining} events?$`),
    );
    for (const title of summaryTitles)
      await expect(
        page.getByRole('button', { name: `Details for ${title}`, exact: true }),
      ).toHaveCount(1);
  });

  test('cold live sources load quietly, match the time zone and survive unrelated settings edits', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-11-03T17:30:00Z') });
    let geocoding = 0;
    let forecasts = 0;
    let finishForecast!: () => void;
    const forecastGate = new Promise<void>((resolve) => {
      finishForecast = resolve;
    });
    await page.route(
      'https://geocoding-api.open-meteo.com/v1/search?*',
      (route) => {
        geocoding++;
        return route.fulfill({
          json: {
            results: [
              {
                name: 'Cloudfern',
                country: 'Elsewhere',
                latitude: 0,
                longitude: 0,
                timezone: 'UTC',
              },
              {
                name: 'Cloudfern',
                country: 'Westland',
                admin1: 'Coast',
                latitude: 1,
                longitude: 1,
                timezone: 'America/Los_Angeles',
              },
            ],
          },
        });
      },
    );
    await page.route(
      'https://api.open-meteo.com/v1/forecast?*',
      async (route) => {
        forecasts++;
        expect(
          new URL(route.request().url()).searchParams.get('latitude'),
        ).toBe('1');
        await forecastGate;
        const dates = Array.from(
          { length: 7 },
          (_, i) => `2026-11-${String(i + 3).padStart(2, '0')}`,
        );
        await route.fulfill({
          json: {
            current: {
              temperature_2m: 25,
              apparent_temperature: 26,
              weather_code: 0,
              wind_speed_10m: 16,
              relative_humidity_2m: 63,
            },
            daily: {
              time: dates,
              temperature_2m_min: dates.map(() => 10),
              temperature_2m_max: dates.map(() => 25),
              weather_code: dates.map(() => 0),
              precipitation_probability_max: dates.map(() => 0),
              sunrise: dates.map((date) => `${date}T07:00`),
              sunset: dates.map((date) => `${date}T19:00`),
            },
            hourly: {
              time: Array.from(
                { length: 24 },
                (_, i) => `2026-11-03T${String(i).padStart(2, '0')}:00`,
              ),
              temperature_2m: Array(24).fill(20),
              weather_code: Array(24).fill(0),
              precipitation_probability: Array(24).fill(0),
            },
          },
        });
      },
    );
    await page.route('https://blog.getbootstrap.com/feed.xml', (route) =>
      route.fulfill({
        contentType: 'application/rss+xml',
        body: '<rss><channel><item><title>Older live Bootstrap headline</title><link>https://blog.getbootstrap.com/2026/10/01/demo/</link><pubDate>Thu, 01 Oct 2026 09:00:00 GMT</pubDate></item></channel></rss>',
      }),
    );
    await page.route(
      'https://api.github.com/repos/twbs/bootstrap/releases?*',
      (route) => route.fulfill({ json: [] }),
    );
    await page.goto('?view=weather&seed=reference');
    await expect(
      page.getByRole('status').filter({ hasText: 'Loading weather' }),
    ).toBeVisible();
    await expect(
      page.getByText(/Weather (?:is offline|could not refresh)/),
    ).toHaveCount(0);
    finishForecast();
    await expect(page.locator('.weather-temperature')).toHaveText('25°C');
    const dialog = await settings(page, 'Appearance');
    await dialog.getByRole('button', { name: /^Tideline / }).click();
    await dialog.getByRole('tab', { name: 'Display', exact: true }).click();
    const scale = dialog.getByRole('slider', { name: /^Display scale:/ });
    await scale.focus();
    await page.keyboard.press('ArrowRight');
    await dialog
      .getByRole('switch', { name: 'Keyboard shortcuts', exact: true })
      .uncheck();
    await closeSettings(page);
    await expect(page.locator('.weather-temperature')).toHaveText('25°C');
    // A subsequent interaction and frame let any mistakenly rescheduled effect run.
    await page.getByRole('button', { name: 'Summary', exact: true }).click();
    await expect(
      page
        .getByRole('region', { name: 'Across your feeds', exact: true })
        .locator('h3')
        .first(),
    ).toHaveText('Older live Bootstrap headline');
    expect(geocoding).toBe(1);
    expect(forecasts).toBe(1);
  });
});
