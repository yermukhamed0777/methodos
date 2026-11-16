import test from 'node:test';
import assert from 'node:assert/strict';
import { universityCard, officialLink } from '../src/university-cards.js';
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
