import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discoveryChips,
  clearDiscoveryChip,
  sourceLinkLabel,
} from '../lib/discovery-ui.js';

test('only active finder filters become removable chips', () => {
  const chips = discoveryChips({
    q: '  robotics  ',
    field: 'cs',
    region: '',
    stage: 'University student',
    funding: 'funded',
  });
  assert.deepEqual(chips, [
    { key: 'q', label: 'Search: robotics' },
    { key: 'field', label: 'Field: cs' },
    { key: 'stage', label: 'Stage: University student' },
    { key: 'funding', label: 'Mentions funding' },
  ]);
});

test('clearing a chip preserves every other filter', () => {
  const before = { q: 'ai', field: 'bio', stage: 'Undergraduate degree' };
  assert.deepEqual(clearDiscoveryChip(before, 'field'), {
    q: 'ai',
    field: '',
    stage: 'Undergraduate degree',
  });
  assert.equal(before.field, 'bio', 'state is not mutated');
  assert.deepEqual(clearDiscoveryChip(before, 'unknown'), before);
});

test('source labels describe the destination without claiming an application', () => {
  assert.equal(
    sourceLinkLabel({ status: 'Directory / Evergreen' }),
    'View directory ↗',
  );
  assert.equal(
    sourceLinkLabel({ sourceLabel: 'Admissions page' }),
    'View admissions ↗',
  );
  assert.equal(sourceLinkLabel({}), 'View official source ↗');
});
