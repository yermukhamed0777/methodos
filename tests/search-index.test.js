import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText,
  tokenize,
  scoreEntry,
  rankEntries,
} from '../lib/search-index.js';

test('normalizeText folds case, diacritics and punctuation', () => {
  assert.equal(normalizeText('Zürich, Switzerland'), 'zurich switzerland');
  assert.equal(normalizeText('Master’s degree'), 'masters degree');
  assert.equal(normalizeText(null), '');
});

test('tokenize drops stopwords, short tokens and plural endings', () => {
  assert.deepEqual(tokenize('Find the best materials studies'), [
    'material',
    'study',
  ]);
  assert.deepEqual(tokenize('a I of'), []);
});

test('a name match outranks an incidental summary mention', () => {
  const named = { id: 'a', name: 'Robotics Engineering', summary: 'A course.' };
  const mentioned = {
    id: 'b',
    name: 'History of Computing',
    summary: 'Touches on robotics briefly.',
  };
  const ranked = rankEntries([mentioned, named], 'robotics');
  assert.equal(ranked[0].id, 'a');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('substring noise no longer matches (art is not earth)', () => {
  const entries = [
    { id: 'earth', name: 'Earth science', summary: 'Climate and geology.' },
    { id: 'part', name: 'Partial differential equations', summary: 'Maths.' },
  ];
  assert.deepEqual(rankEntries(entries, 'art'), []);
});

test('multi-word phrase in the name earns a bonus', () => {
  const exact = { id: 'x', name: 'Materials Science', summary: '' };
  const scattered = {
    id: 'y',
    name: 'Engineering',
    summary: 'Materials and science topics.',
  };
  const ranked = rankEntries([scattered, exact], 'materials science');
  assert.equal(ranked[0].id, 'x');
});

test('ties break deterministically by name then id', () => {
  const a = { id: 'z', name: 'Alpha programme' };
  const b = { id: 'a', name: 'Alpha programme' };
  const c = { id: 'm', name: 'Beta programme' };
  const first = rankEntries([c, a, b], 'programme').map((x) => x.id);
  const second = rankEntries([b, c, a], 'programme').map((x) => x.id);
  assert.deepEqual(first, second);
  assert.deepEqual(first, ['a', 'z', 'm']);
});

test('weak tail matches are dropped by the relevance floor', () => {
  const strong = { id: 's', name: 'Quantum computing', summary: '' };
  const weak = { id: 'w', name: 'Gardening', summary: 'Quantum of soil.' };
  const ranked = rankEntries([strong, weak], 'quantum computing');
  assert.deepEqual(
    ranked.map((x) => x.id),
    ['s'],
  );
});

test('limit is respected and empty queries keep input order', () => {
  const entries = Array.from({ length: 20 }, (_, i) => ({
    id: 'e' + i,
    name: 'Entry ' + i,
  }));
  assert.equal(rankEntries(entries, 'entry', { limit: 5 }).length, 5);
  assert.equal(rankEntries(entries, '', { limit: 5 }).length, 5);
  assert.equal(rankEntries(entries, '')[0].id, 'e0');
});

test('scoreEntry only reads human-readable fields, not source URLs', () => {
  const entry = {
    id: 'u',
    name: 'Physics',
    summary: 'Fundamental science.',
    sources: [['Careers', 'https://example.org/oceanography']],
  };
  assert.equal(scoreEntry(entry, tokenize('oceanography')), 0);
});
