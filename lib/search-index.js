// Deterministic, dependency-free ranking for the researched catalog.
//
// The previous scorer tested `JSON.stringify(entry).includes(token)`, which
// matched substrings inside unrelated words ("art" inside "earth") and counted
// source URLs as evidence. This module scores only the human-readable fields,
// weights names above prose, and breaks ties deterministically so identical
// queries always return the same order.

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'find',
  'best',
  'want',
  'options',
  'option',
  'plan',
  'show',
  'could',
  'please',
  'need',
  'about',
  'from',
  'that',
  'this',
  'into',
  'your',
  'you',
  'are',
  'how',
  'can',
  'get',
  'any',
  'all',
  'near',
  'where',
  'what',
  'of',
  'in',
  'to',
  'on',
  'at',
  'by',
  'or',
  'is',
  'it',
  'as',
  'be',
  'do',
  'if',
  'we',
  'my',
]);

// Longer phrases are more specific, so they are worth more.
const FIELD_WEIGHTS = [
  ['name', 8],
  ['org', 4],
  ['fields', 4],
  ['short', 3],
  ['skills', 2],
  ['summary', 2],
  ['eligibility', 1],
  ['stage', 1],
];

const PHRASE_BONUS = { name: 12, fields: 6, summary: 3 };
const COVERAGE_BONUS = 8;
const PREFIX_FACTOR = 0.6;
const MIN_PREFIX_LENGTH = 4;

export function normalizeText(value) {
  if (value == null) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/'/g, '')
    .trim();
}

function stem(token) {
  if (token.length <= 4) return token;
  // Physics, robotics, economics and mathematics are already singular.
  if (token.endsWith('ics')) return token;
  if (token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.endsWith('sses')) return token.slice(0, -2);
  if (token.endsWith('ss')) return token;
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

export function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
    .map(stem);
}

function collectText(value, out = []) {
  if (value == null) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, out);
    return out;
  }
  if (typeof value === 'object') return out;
  out.push(String(value));
  return out;
}

// Only human-readable fields are scored. Sources, ids and URLs are excluded so
// a URL slug can never outrank a real title match.
function fieldValues(entry) {
  const values = {};
  for (const [field] of FIELD_WEIGHTS) {
    const text = collectText(entry?.[field]).join(' ');
    if (text) values[field] = normalizeText(text);
  }
  return values;
}

function matchesWord(haystack, token) {
  if (!haystack) return 0;
  const words = haystack.split(' ');
  for (const word of words) {
    if (word === token || stem(word) === token) return 1;
  }
  if (token.length >= MIN_PREFIX_LENGTH) {
    for (const word of words) {
      if (word.startsWith(token)) return PREFIX_FACTOR;
    }
  }
  return 0;
}

/**
 * Score one entry against a query. Returns 0 when nothing matches, so callers
 * can drop non-matches instead of ranking them arbitrarily.
 */
export function scoreEntry(entry, tokens, phrase = '') {
  const values = fieldValues(entry);
  let score = 0;
  for (const token of tokens) {
    for (const [field, weight] of FIELD_WEIGHTS) {
      score += weight * matchesWord(values[field], token);
    }
  }
  if (phrase.includes(' ')) {
    for (const [field, bonus] of Object.entries(PHRASE_BONUS)) {
      if (values[field]?.includes(phrase)) score += bonus;
    }
  }
  if (tokens.length > 1 && values.name) {
    const everyTokenInName = tokens.every(
      (token) => matchesWord(values.name, token) > 0,
    );
    if (everyTokenInName) score += COVERAGE_BONUS;
  }
  return score;
}

function stableKey(entry) {
  return String(entry?.name || entry?.id || '');
}

/**
 * Rank entries for a query. Entries that match nothing are excluded unless the
 * query produced no tokens at all, in which case the caller's filter order is
 * preserved. Weak tail matches (below the floor) are dropped so a single
 * incidental word cannot pad the answer with unrelated entries.
 */
export function rankEntries(
  entries,
  query,
  { limit = 8, floorRatio = 0.15 } = {},
) {
  const phrase = normalizeText(query);
  const tokens = [...new Set(tokenize(query))];
  const scored = entries.map((entry) => ({
    entry,
    score: tokens.length ? scoreEntry(entry, tokens, phrase) : 0,
  }));
  const pool = tokens.length ? scored.filter((item) => item.score > 0) : scored;
  pool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const byName = stableKey(a.entry).localeCompare(stableKey(b.entry));
    if (byName !== 0) return byName;
    return String(a.entry.id || '').localeCompare(String(b.entry.id || ''));
  });
  const top = pool[0]?.score || 0;
  const floor = tokens.length ? Math.max(1.5, top * floorRatio) : 0;
  return pool
    .filter((item) => item.score >= floor)
    .slice(0, limit)
    .map((item) => ({
      ...item.entry,
      score: Math.round(item.score * 10) / 10,
    }));
}
