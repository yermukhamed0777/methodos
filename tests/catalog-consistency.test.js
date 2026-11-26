import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync('data/opportunities.json', 'utf8'));
const intelligence = JSON.parse(readFileSync('data/intelligence.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);

test('published opportunity mirrors agree with the reviewed catalog', () => {
  for (const source of catalog.opportunities) {
    const mirror = intelligence.records.find(
      (r) => r.id === `opportunity-${source.id}`,
    );
    assert.ok(mirror, `missing mirror for ${source.id}`);
    assert.equal(
      mirror.archived,
      !!source.archived,
      `${source.id} archive state disagrees`,
    );
    if (source.archived) {
      assert.equal(mirror.status, 'Previous cycle');
      continue;
    }
    if (source.openVerified && source.applicationUrl) {
      assert.equal(mirror.status, 'Open');
      continue;
    }
    if (
      source.finalDeadline &&
      source.deadlineConfirmed &&
      source.finalDeadline >= today
    ) {
      assert.equal(
        mirror.status,
        'Upcoming',
        `${source.id} confirmed deadline mislabelled`,
      );
      assert.equal(mirror.deadlineVerified, true);
    }
  }
});

test('programme deadlines never follow their start date and claims match their notes', () => {
  const development = JSON.parse(readFileSync('data/development.json', 'utf8'));
  for (const programme of development.opportunities) {
    if (programme.deadline && programme.startDate)
      assert.ok(
        programme.deadline <= programme.startDate,
        `${programme.id} deadline is after its start date`,
      );
    if (/confirmed/i.test(programme.verification || ''))
      assert.equal(
        /tentative|to verify|under construction/i.test(programme.note || ''),
        false,
        `${programme.id} claims confirmation but its note is uncertain`,
      );
  }
});

test('published course links use a live canonical source', () => {
  const macro = intelligence.records.find(
    (r) =>
      r.name === 'Intermediate Macroeconomics' &&
      r.provider === 'MIT OpenCourseWare',
  );
  assert.ok(macro, 'missing Intermediate Macroeconomics course');
  assert.equal(
    macro.url,
    'https://ocw.mit.edu/courses/14-05-intermediate-macroeconomics-fall-2025/',
  );
  assert.ok(
    macro.sources.some(([, url]) => url === macro.url),
    'sources must cite the same live URL',
  );
});

test('no published record claims a deadline is unannounced when one is confirmed', () => {
  const bad = intelligence.records.filter(
    (r) =>
      r.status === 'Deadline not announced' &&
      r.finalDeadline &&
      r.finalDeadline >= today &&
      r.deadlineVerified === true,
  );
  assert.deepEqual(
    bad.map((r) => r.id),
    [],
  );
});
