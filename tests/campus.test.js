import test from 'node:test';
import assert from 'node:assert/strict';
import { campusOpenings } from '../src/campus.js';
test('campus openings require a verified open cycle and exact institution ID', () => {
  const now = new Date('2026-11-16T10:00:00Z');
  const open = {
    kind: 'opportunity',
    universityId: 'uni-a',
    name: 'A',
    status: 'Open',
    openVerified: true,
    checkedOn: '2026-11-15',
    applicationUrl: 'https://example.edu/apply',
    finalDeadline: '2026-12-01',
  };
  const rows = [
    open,
    { ...open, universityId: 'uni-b' },
    { ...open, universityId: null, name: 'uni-a' },
    { ...open, isDirectory: true },
    { ...open, finalDeadline: '2026-11-01' },
  ];
  assert.deepEqual(campusOpenings(rows, 'uni-a', now), [open]);
  assert.deepEqual(campusOpenings(rows, '', now), []);
});
