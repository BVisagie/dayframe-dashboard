// Captures the README showcase images from the production build. These are
// documentation images, not test baselines: nothing compares against them.
// `npm run showcase` builds the site, then rewrites docs/images/showcase/.
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const port = 4174;
const base = `http://localhost:${port}/dayframe-dashboard/`;
const output = 'docs/images/showcase';
// 1440×900 is the smallest common laptop window where the standard layout's
// Summary shows every agent without collapsing rows into "+N more" links.
const viewport = { width: 1440, height: 900 };
const shots = [
  { theme: 'default', scheme: 'light', view: 'summary' },
  { theme: 'default', scheme: 'light', view: 'agents' },
  { theme: 'default', scheme: 'light', view: 'calendar' },
  { theme: 'default', scheme: 'light', view: 'weather' },
  { theme: 'default', scheme: 'light', view: 'feeds' },
  { theme: 'default', scheme: 'dark', view: 'summary' },
  { theme: 'nebuchadnezzar', scheme: 'dark', view: 'summary' },
  { theme: 'tideline', scheme: 'light', view: 'summary' },
  { theme: 'tideline', scheme: 'dark', view: 'summary' },
];

const server = spawn(
  'node_modules/.bin/vite',
  ['preview', '--port', String(port), '--strictPort'],
  { stdio: 'ignore' },
);
try {
  await waitFor(base);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  for (const { theme, scheme, view } of shots) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 2,
      locale: 'en-GB',
      timezoneId: 'UTC',
      colorScheme: scheme,
      // Keep motion preferences at their default so optional theme finishes,
      // such as Nebuchadnezzar's CRT lines, appear as visitors see them.
      reducedMotion: 'no-preference',
      serviceWorkers: 'block',
    });
    // The fixed clock already selects simulated sources; this guarantees it.
    await page.route('**/*', route =>
      new URL(route.request().url()).origin === new URL(base).origin
        ? route.continue()
        : route.abort('blockedbyclient'),
    );
    const query = new URLSearchParams({
      clock: '2026-11-03T09:30:00Z',
      seed: 'reference',
      theme,
      scheme,
      view,
    });
    await page.goto(`${base}?${query}`);
    await page.locator('main h1').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const path = `${output}/${theme}-${scheme}-${view}.png`;
    await page.screenshot({ path, animations: 'disabled', caret: 'hide' });
    console.log(path);
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}

async function waitFor(url) {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`The preview server did not start at ${url}. Check that dist/ exists.`);
}
