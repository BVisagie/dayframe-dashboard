import { defineConfig } from '@playwright/test';
import { createRequire } from 'node:module';
import { viewports } from './tests/browser/matrix';

const require = createRequire(import.meta.url);
if (require('@playwright/test/package.json').version !== '1.64.1') {
  throw new Error('Browser validation requires @playwright/test 1.64.1 and mcr.microsoft.com/playwright:v1.64.1-noble.');
}

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // CI runners have two CPU cores; avoid oversubscribing browser processes.
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 7000, toHaveScreenshot: { maxDiffPixels: 0, threshold: 0 } },
  // Missing baselines must fail; creation is an explicit container-only operation.
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173/dayframe-dashboard/',
    locale: 'en-GB',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    colorScheme: 'light',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    ...(['chromium', 'firefox', 'webkit'] as const).map(browserName => ({
      name: browserName,
      testIgnore: /screenshots\.spec\.ts/,
      use: { browserName },
    })),
    ...viewports.flatMap(viewport => [1, 2].map(deviceScaleFactor => ({
      name: `screenshots-${viewport.width}x${viewport.height}-dpr${deviceScaleFactor}`,
      testMatch: /screenshots\.spec\.ts/,
      use: {
        browserName: 'chromium' as const,
        viewport,
        deviceScaleFactor,
        // Canonical rasterization avoids font-cache and host CPU differences.
        // Functional projects retain the browser's normal rendering settings.
        launchOptions: {
          args: ['--disable-font-subpixel-positioning', '--disable-skia-runtime-opts'],
        },
      },
    }))),
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 5173 --strictPort',
    url: 'http://localhost:5173/dayframe-dashboard/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
