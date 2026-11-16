import test from 'node:test';
import assert from 'node:assert/strict';
import {
  universityCard,
  officialLink,
  filterUniversities,
} from '../src/university-cards.js';
test('university cards prioritize the full name and keep detailed sources discoverable', () => {
  const html = universityCard({
    name: 'A <University>',
    country: 'Hong Kong',
    city: 'Hong Kong',
    sources: [['Research', 'https://example.edu/research']],
    research: 'Real strengths',
    checkedOn: '2026-11-11',
  });
  assert.match(html, /<h2>A &lt;University&gt;<\/h2>/);
  assert.match(html, /<details/);
  assert.match(html, /https:\/\/example.edu\/research/);
  assert.match(html, /not an open vacancy/);
  assert.equal(officialLink('javascript:alert(1)', 'Bad'), '');
});
test('university filters combine location, field and research query without mutating the catalog', () => {
  const rows = [
    {
      id: 'b',
      kind: 'university',
      name: 'Beta',
      country: 'UK',
      fieldIds: ['cs'],
      research: 'Robotics',
    },
    {
      id: 'a',
      kind: 'university',
      name: 'Alpha',
      country: 'HK',
      fieldIds: ['physics'],
    },
    {
      id: 'old',
      kind: 'university',
      name: 'Archived',
      status: 'Archived',
      country: 'UK',
      fieldIds: ['cs'],
    },
  ];
  assert.deepEqual(
    filterUniversities(rows, {
      query: ' robot ',
      country: 'UK',
      field: 'cs',
    }).map((x) => x.id),
    ['b'],
  );
  assert.deepEqual(
    filterUniversities(rows).map((x) => x.id),
    ['a', 'b'],
  );
  assert.deepEqual(filterUniversities(rows, { country: 'missing' }), []);
  assert.equal(rows[0].id, 'b');
});
