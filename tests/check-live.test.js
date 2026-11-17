import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../scripts/check-live.js';

test('a fully matching deployment reports success', () => {
  const summary = summarize([
    { name: 'a', detail: 'x', ok: true },
    { name: 'b', detail: 'y', ok: true },
  ]);
  assert.equal(summary.ok, true);
  assert.equal(summary.passed, 2);
  assert.equal(summary.total, 2);
  assert.deepEqual(summary.failures, []);
});

test('a stale deployment names every missing marker', () => {
  const summary = summarize([
    { name: 'glass.css is served', detail: 'merged in PR #18', ok: false },
    {
      name: 'public config answers',
      detail: 'public capability endpoint',
      ok: true,
    },
    {
      name: 'branded 404 page is served',
      detail: 'merged in PR #23',
      ok: false,
    },
  ]);
  assert.equal(summary.ok, false);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failures.length, 2);
  assert.match(
    summary.failures[0],
    /glass\.css is served \(merged in PR #18\)/,
  );
});

test('an empty run is not treated as success', () => {
  const summary = summarize([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.ok, false);
});
