// Captures the README showcase images from the production build. These are
// documentation images, not test baselines: nothing compares against them.
// `npm run showcase` builds the site, then rewrites docs/images/showcase/.
import { access, mkdtemp, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

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

// preview() serves an empty site rather than failing when dist/ is missing.
await access('dist/index.html').catch(() => {
  throw new Error('dist/index.html is missing. Run npm run showcase, which builds first.');
});
// Port 0 asks the OS for a free port, and preview() resolves only once this
// server is listening, so captures can never come from another process's
// server.
const server = await preview({
  preview: { port: 0, strictPort: true, open: false },
  logLevel: 'warn',
});
// Capture into a sibling scratch folder so a failed run leaves the README
// images intact, and the final rename stays on one filesystem.
const scratch = await mkdtemp(`${output}-`);
try {
  const base = server.resolvedUrls?.local[0];
  if (!base) throw new Error('The preview server reported no local URL.');
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
    const name = `${theme}-${scheme}-${view}.png`;
    await page.screenshot({
      path: join(scratch, name),
      animations: 'disabled',
      caret: 'hide',
    });
    console.log(`${output}/${name}`);
    await page.close();
  }
  await browser.close();
  await rm(output, { recursive: true, force: true });
  await rename(scratch, output);
} finally {
  await rm(scratch, { recursive: true, force: true });
  await server.close();
}
