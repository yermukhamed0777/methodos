#!/usr/bin/env node
// Content-free verification for the anonymous product counters.
//
//   npm run verify-events
//
// Nothing here touches the network or a real account. A fake browser emits a
// fixed allowlisted script, including deliberate attempts to smuggle journal
// and account content into properties that are not in the schema. The exact
// emitted JSON, the aggregated snapshot and the report object are then checked
// for that content. A failure exits non-zero.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  aggregate,
  dimensionKey,
  eventTotals,
  funnel,
  normalizeEvent,
} from '../lib/product-events.js';
import { installProductEvents } from '../src/product-events.js';

export const SCRIPT = [
  { name: 'view', props: { view: 'finder' } },
  {
    name: 'search',
    props: { surface: 'catalog', results: '1-5', filters: 'none' },
  },
  { name: 'detail_open', props: { kind: 'opportunity', surface: 'catalog' } },
  { name: 'save', props: { action: 'add', kind: 'opportunity' } },
  { name: 'next_step', props: { action: 'task' } },
  { name: 'source_open', props: { surface: 'detail' } },
];

// Values a content-free counter must never carry, even if a caller sends them
// by mistake. They are sentinels, not real user data.
export const SENTINELS = [
  'journal-entry-private-text',
  'student@private.example',
  'my-cv-draft-final.docx',
  'file:///private/local/document',
  'account-identifier-secret',
  'typed-filter-phrase',
];

const POISON = {
  notes: SENTINELS[0],
  email: SENTINELS[1],
  document: SENTINELS[2],
  url: SENTINELS[3],
  userId: SENTINELS[4],
  query: SENTINELS[5],
};

function fakeWindow(
  sink,
  { doNotTrack = null, globalPrivacyControl = false } = {},
) {
  let networkCalls = 0;
  const w = {
    navigator: {
      doNotTrack,
      globalPrivacyControl,
      sendBeacon: () => {
        networkCalls++;
        return true;
      },
    },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    crypto: {
      getRandomValues(bytes) {
        for (let i = 0; i < bytes.length; i++) bytes[i] = i + 1;
        return bytes;
      },
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
    addEventListener: () => {},
    document: { visibilityState: 'visible' },
    Blob: class {},
    fetch: () => {
      networkCalls++;
      return Promise.resolve();
    },
  };
  return {
    w,
    networkCalls: () => networkCalls,
    tracker: installProductEvents(w, { send: sink }),
  };
}

function containsSentinel(value) {
  const text = JSON.stringify(value).toLowerCase();
  return (
    SENTINELS.find((sentinel) => text.includes(sentinel.toLowerCase())) || null
  );
}

export function verifyEvents({
  now = new Date('2026-11-26T00:00:00.000Z'),
} = {}) {
  const emitted = [];
  const { tracker } = fakeWindow((batch) => emitted.push(batch));
  if (!tracker.enabled) throw new Error('Tracker is disabled in the harness.');
  for (const event of SCRIPT) {
    if (!tracker.track(event.name, { ...event.props, ...POISON }))
      throw new Error('A valid allowlisted event was dropped.');
  }
  tracker.flush();

  const blocked = [];
  const blockedCase = fakeWindow((batch) => blocked.push(batch), {
    globalPrivacyControl: true,
  });
  blockedCase.tracker.track('view', { view: 'finder', ...POISON });
  blockedCase.tracker.flush();

  const snapshot = aggregate(null, emitted.flat(), {
    session: '0102030405060708',
    now,
  });
  const steps = funnel([snapshot]);
  const { totals, dimensions } = eventTotals([snapshot]);
  const report = {
    generatedAt: now.toISOString(),
    windowDays: 30,
    daysWithData: 1,
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

  const checked = { emitted, snapshot, report };
  const found = containsSentinel(checked);
  if (found) throw new Error('Content-free assertion failed: ' + found);
  if (blocked.length)
    throw new Error('A privacy-blocked tracker emitted data.');
  if (emitted.length !== 1 || emitted[0].length !== SCRIPT.length)
    throw new Error('Unexpected batch shape.');
  for (const event of emitted[0])
    if (
      dimensionKey(event).includes('journal') ||
      dimensionKey(event).includes('private')
    )
      throw new Error('A dimension key carries free text.');

  const canonical = JSON.stringify({ emitted, snapshot, report, blocked });
  return {
    ok: true,
    events: SCRIPT.length,
    dimensions: Object.keys(dimensions).length,
    session: '0102030405060708',
    sha256: createHash('sha256').update(canonical).digest('hex'),
    canonical,
  };
}

function main() {
  const result = verifyEvents();
  console.log(
    `Content-free: PASS · events ${result.events} · dimensions ${result.dimensions} · sha256 ${result.sha256}`,
  );
  console.log(
    'No journal text, account content, typed queries, file names or URLs were emitted, aggregated or reported.',
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
