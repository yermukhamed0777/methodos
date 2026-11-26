import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cycleStatus,
  verificationStatus,
  deadlineInfo,
} from '../lib/intelligence-core.js';

const now = new Date('2026-11-26T04:00:00Z');

test('a confirmed future deadline is an expected cycle, not unannounced', () => {
  const record = {
    id: 'rsi',
    finalDeadline: '2026-12-11',
    deadlineStart: '2026-12-11',
    deadlineConfirmed: true,
    dateStatus: 'Confirmed deadline',
    checkedOn: '2026-11-06',
  };
  assert.equal(cycleStatus(record, now), 'Upcoming');
  const badge = verificationStatus(record, now);
  assert.equal(badge.label, 'Expected Cycle');
  assert.doesNotMatch(badge.description, /unconfirmed|not announced/i);
  const deadline = deadlineInfo(record, 'UTC', now);
  assert.equal(deadline.verified, true);
  assert.match(deadline.text, /2026-12-11/);
});

test('an unconfirmed future deadline stays unannounced', () => {
  const record = {
    id: 'x',
    finalDeadline: '2027-01-15',
    deadlineConfirmed: false,
  };
  assert.equal(cycleStatus(record, now), 'Deadline not announced');
  assert.equal(deadlineInfo(record, 'UTC', now).verified, false);
});

test('a confirmed deadline is never promoted to an open application', () => {
  const record = {
    id: 'x',
    finalDeadline: '2027-01-15',
    deadlineConfirmed: true,
    checkedOn: '2026-11-06',
  };
  assert.equal(cycleStatus(record, now), 'Upcoming');
  assert.equal(verificationStatus(record, now).label, 'Expected Cycle');
});
