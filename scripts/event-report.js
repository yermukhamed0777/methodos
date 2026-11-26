#!/usr/bin/env node
// Read the anonymous daily counters written by /api/events.
//
//   npm run report:events
//   npm run report:events -- --days=7 --json
//   npm run report:events -- --prune
//
// The report contains no search text, notes, document names, email addresses
// or account IDs. A session is a random per-tab value that expires with the
// tab; the counters themselves are deleted after the retention window.

import { del, get, list } from '@vercel/blob';
import { EVENT_PREFIX } from '../lib/event-store.js';
import { eventTotals, funnel } from '../lib/product-events.js';

const RETENTION_DAYS = 30;

function option(name, fallback) {
  const prefix = '--' + name + '=';
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const days = Math.max(1, Math.min(365, Number(option('days', RETENTION_DAYS))));
const asJson = process.argv.includes('--json');
const prune = process.argv.includes('--prune');

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

async function readSnapshot(pathname) {
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text());
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull .env.local` first.',
    );
  }
  const since = new Date(Date.now() - (days - 1) * 86400000);
  const cutoff = dayString(since);
  const { blobs } = await list({ prefix: EVENT_PREFIX, limit: 1000 });
  const wanted = blobs
    .filter((blob) => {
      const date = blob.pathname.slice(EVENT_PREFIX.length, -5);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= cutoff;
    })
    .sort((a, b) => a.pathname.localeCompare(b.pathname));
  const snapshots = [];
  for (const blob of wanted) {
    const snapshot = await readSnapshot(blob.pathname);
    if (snapshot) snapshots.push(snapshot);
  }
  const { totals, dimensions } = eventTotals(snapshots);
  const steps = funnel(snapshots);
  const report = {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    from: cutoff,
    daysWithData: snapshots.length,
    sessions: steps.sessions,
    funnel: {
      search: steps.search,
      detail: steps.detail,
      save: steps.save,
      nextStep: steps.nextStep,
    },
    events: totals,
    dimensions,
  };
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `Methodos anonymous usage, ${cutoff} to ${dayString(new Date())}`,
    );
    console.log(
      `Days with data: ${report.daysWithData} · sessions: ${report.sessions}`,
    );
    console.log(
      `Sessions reaching each step: search ${steps.search}, detail ${steps.detail}, save ${steps.save}, next step ${steps.nextStep}`,
    );
    console.log('Events:');
    for (const [name, total] of Object.entries(totals).sort())
      console.log(`  ${name}: ${total}`);
    const top = Object.entries(dimensions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    if (top.length) {
      console.log('Top breakdowns:');
      for (const [key, total] of top) console.log(`  ${key}: ${total}`);
    }
    console.log(
      'Counts contain no search text, notes, document names, file URLs, email addresses or account IDs.',
    );
  }
  if (prune) {
    const old = blobs.filter((blob) => {
      const date = blob.pathname.slice(EVENT_PREFIX.length, -5);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < cutoff;
    });
    if (old.length) await del(old.map((blob) => blob.pathname));
    if (!asJson) console.log(`Pruned ${old.length} daily counter file(s).`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
