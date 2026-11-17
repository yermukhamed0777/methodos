import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaNotice, secondsUntilUtcMidnight } from '../lib/quota.js';

test('the reset window counts down to the next UTC midnight', () => {
  assert.equal(
    secondsUntilUtcMidnight(new Date('2026-11-17T00:00:00Z')),
    86400,
  );
  assert.equal(secondsUntilUtcMidnight(new Date('2026-11-17T23:00:00Z')), 3600);
  assert.equal(secondsUntilUtcMidnight(new Date('2026-11-17T23:59:30Z')), 30);
});

test('the reset window is never negative', () => {
  assert.ok(secondsUntilUtcMidnight(new Date('2026-12-31T23:59:59Z')) >= 0);
});

test('the notice states the real reset time and keeps the catalog honest', () => {
  const text = quotaNotice(3600);
  assert.match(text, /00:00 UTC/);
  assert.match(text, /about 1 hour\)/);
  assert.match(text, /still real, reviewed entries/);
  assert.doesNotMatch(text, /temporarily unavailable/);
});

test('hours pluralise correctly', () => {
  assert.match(quotaNotice(7200), /about 2 hours/);
  assert.match(quotaNotice(60), /about 1 hour\)/);
});

test('a missing window still names the reset time', () => {
  const text = quotaNotice(null);
  assert.match(text, /at 00:00 UTC/);
  assert.doesNotMatch(text, /NaN|undefined/);
});
