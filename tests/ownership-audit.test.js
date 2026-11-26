import test from 'node:test';
import assert from 'node:assert/strict';
import { auditOwnership } from '../scripts/audit-ownership.js';

test('reviewed migrations keep owner policies on every private table', () => {
  const { tables, findings } = auditOwnership();
  assert.equal(findings.length, 0, findings.join('\n'));
  assert.ok(tables >= 18);
});
