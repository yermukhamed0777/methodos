#!/usr/bin/env node
// Constrained-mobile loading measurement. Read-only: no sign-in, no writes.
// Defaults to the local static preview; pass --live to probe the public origin.
// Uses a locally installed Chrome/Edge via playwright-core (no browser download).
import { createPreviewServer } from './dev-server.js';
import { chromium } from 'playwright-core';

const LIVE = process.argv.includes('--live');
const BASE = LIVE
  ? 'https://opportunity-explorer-ruddy.vercel.app'
  : 'http://127.0.0.1:0';

let server;
let base = BASE;
if (!LIVE) {
  server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}

let browser;
try {
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : { channel: 'chrome' }),
    });
  } catch {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  }
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  // 150 ms RTT, ~1.6 Mbps down / ~0.75 Mbps up: slow 4G-like conditions.
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200 * 1024,
    uploadThroughput: 94 * 1024,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const started = Date.now();
  await page.goto(`${base}/`, { waitUntil: 'load', timeout: 90000 });
  // Wait for the deferred catalog/script chain to settle so resource entries
  // include the bundles loaded after first paint.
  await page
    .waitForLoadState('networkidle', { timeout: 45000 })
    .catch(() => {});
  const wallMs = Date.now() - started;

  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const resources = performance.getEntriesByType('resource');
    const js = resources.filter((r) => r.initiatorType === 'script');
    const css = resources.filter((r) => /css$/.test(r.name.split('?')[0]));
    const sum = (list) =>
      list.reduce((s, r) => s + (r.encodedBodySize || 0), 0);
    const byName = (name) =>
      js.find((r) => r.name.endsWith('/' + name))?.encodedBodySize || 0;
    return {
      fcp:
        performance.getEntriesByName('first-contentful-paint')[0]?.startTime ??
        null,
      dcl: nav.domContentLoadedEventEnd ?? null,
      load: nav.loadEventEnd ?? null,
      resources: resources.length,
      jsRequests: js.length,
      jsBytes: sum(js),
      cssRequests: css.length,
      cssBytes: sum(css),
      bootstrap: byName('bootstrap.js'),
      app: byName('app.js'),
      workspace: byName('workspace.js'),
      intelligence: byName('intelligence.js'),
      platform: byName('platform.js'),
      scriptsInHead: document.head.querySelectorAll('script[src]').length,
      linksInHead: document.head.querySelectorAll('link[rel="stylesheet"]')
        .length,
      horizontalOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    };
  });

  const round = (n) => (n == null ? 'n/a' : `${Math.round(n)} ms`);
  const kb = (n) => `${Math.round(n / 1024)} KiB`;
  console.log(
    `perf: ${LIVE ? 'public origin' : 'local preview'}, 375x812, slow 4G, 4x CPU`,
  );
  console.log(`  wall clock to load + settle: ${wallMs} ms`);
  console.log(
    `  FCP ${round(m.fcp)} · DOMContentLoaded ${round(m.dcl)} · load ${round(m.load)}`,
  );
  console.log(
    `  resources ${m.resources} · JS ${m.jsRequests}/${kb(m.jsBytes)} · CSS ${m.cssRequests}/${kb(m.cssBytes)}`,
  );
  console.log(
    `  guest bundles: bootstrap ${kb(m.bootstrap)}, app ${kb(m.app)}, workspace ${kb(m.workspace)}, intelligence ${kb(m.intelligence)}, platform ${kb(m.platform)}`,
  );
  console.log(
    `  head: ${m.scriptsInHead} blocking script(s), ${m.linksInHead} stylesheets`,
  );
  console.log(
    `  horizontal overflow at 375 px: ${m.horizontalOverflow ? 'YES (defect)' : 'no'}`,
  );
  console.log(
    '  Measured only; budgets are proposals, not release gates. Private bundles on a guest path are unnecessary payload.',
  );
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
