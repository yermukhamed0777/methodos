#!/usr/bin/env node
// Deterministic, scripted walkthrough capture.
//
//   npm run walkthrough            # verify the committed fixture
//   npm run walkthrough -- --write # regenerate it byte-for-byte
//
// The transcript is a fixture, not a recording of a real person. It contains
// allowlisted event names and coarse properties only, so a video can be made
// later without re-running the app or handling user content.

import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyEvents } from './verify-events.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE_PATH = resolve(root, 'docs/walkthrough/transcript.json');

const LABELS = [
  'Open Home',
  'Search the reviewed catalog',
  'Open the first result',
  'Save it to the private tracker',
  'Add a next step to the plan',
  'Open the official source',
];

export function buildTranscript() {
  const verified = verifyEvents();
  const emitted = JSON.parse(verified.canonical).emitted.flat();
  return {
    version: 1,
    generatedAt: '2026-11-26T00:00:00.000Z',
    source: 'scripts/walkthrough.js',
    steps: LABELS.map((label, index) => ({
      n: index + 1,
      label,
      event: emitted[index],
    })),
    counter: {
      events: verified.events,
      dimensions: verified.dimensions,
      sha256: verified.sha256,
    },
  };
}

export function serialize(transcript) {
  return JSON.stringify(transcript, null, 2) + '\n';
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function main() {
  const text = serialize(buildTranscript());
  const hash = sha256(text);
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
    writeFileSync(FIXTURE_PATH, text);
    console.log(`Wrote ${FIXTURE_PATH}`);
  } else {
    let current;
    try {
      current = readFileSync(FIXTURE_PATH, 'utf8');
    } catch {
      console.error(
        'Missing walkthrough fixture. Run: npm run walkthrough -- --write',
      );
      process.exitCode = 1;
      return;
    }
    if (current !== text) {
      console.error(
        'Walkthrough fixture is stale. Run: npm run walkthrough -- --write',
      );
      process.exitCode = 1;
      return;
    }
  }
  console.log(`Walkthrough: PASS · steps 6 · sha256 ${hash}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
