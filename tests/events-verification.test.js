import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SENTINELS, verifyEvents } from '../scripts/verify-events.js';
import {
  FIXTURE_PATH,
  buildTranscript,
  serialize,
  sha256,
} from '../scripts/walkthrough.js';

test('the content-free harness passes and is deterministic', () => {
  const first = verifyEvents();
  const second = verifyEvents();
  assert.equal(first.ok, true);
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.events, 6);
  assert.equal(first.dimensions, 6);
  const text = first.canonical.toLowerCase();
  for (const sentinel of SENTINELS)
    assert.equal(text.includes(sentinel.toLowerCase()), false);
  assert.match(first.sha256, /^[a-f0-9]{64}$/);
});

test('the scripted walkthrough fixture matches its deterministic capture', () => {
  const transcript = buildTranscript();
  assert.equal(transcript.steps.length, 6);
  assert.deepEqual(
    transcript.steps.map((step) => step.event.name),
    ['view', 'search', 'detail_open', 'save', 'next_step', 'source_open'],
  );
  const text = serialize(transcript);
  assert.equal(readFileSync(FIXTURE_PATH, 'utf8'), text);
  assert.match(sha256(text), /^[a-f0-9]{64}$/);
});
