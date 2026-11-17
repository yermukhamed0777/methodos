import test from 'node:test';
import assert from 'node:assert/strict';
import { searchResources, navigationFor } from '../lib/assistant.js';

test('a subject query puts the matching title first', () => {
  const results = searchResources('materials science');
  assert.ok(results.length > 0);
  assert.match(results[0].name, /materials/i);
  assert.match(results[0].name, /science|engineering/i);
});

test('short words no longer match inside longer words', () => {
  // "art" used to match entries containing "earth", "part" or "start".
  const results = searchResources('art');
  const noisy = results.filter((r) =>
    /earth|partial|starting/i.test(String(r.summary || '')),
  );
  assert.equal(
    noisy.length,
    0,
    'no entry should be returned for a substring-only match',
  );
});

test('source URLs are never used as ranking evidence', () => {
  const results = searchResources('oceanography');
  assert.equal(results.length, 0);
});

test('an alias expands to the underlying subject', () => {
  const results = searchResources('mse');
  assert.ok(results.length > 0);
  assert.match(results[0].name, /materials/i);
});

test('kind filters keep the coach on application targets', () => {
  const results = searchResources('materials', {
    kinds: ['opportunity', 'course', 'university'],
  });
  assert.ok(results.length > 0);
  assert(
    results.every((r) =>
      ['opportunity', 'course', 'university'].includes(r.kind),
    ),
  );
});

test('route chips follow a stable order, not retrieval order', () => {
  const routes = navigationFor([
    { kind: 'skill' },
    { kind: 'university' },
    { kind: 'course' },
  ]);
  assert.deepEqual(
    routes.map((r) => r.view),
    ['courses', 'universities', 'skills'],
  );
});
