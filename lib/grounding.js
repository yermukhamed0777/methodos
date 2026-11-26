// Structural safeguards for source-grounded answers.
//
// These checks do not pretend to prove that a sentence is true. They reject
// the specific shapes that cannot be supported by the reviewed catalog:
// invented live verification, URLs, guarantees and admission/outcome claims,
// stale review dates and contradictory source dates. Real semantic truthfulness
// still requires an owner-controlled model evaluation and is never claimed here.

export const MAX_REVIEW_AGE_DAYS = 365;

const URL_PATTERN = /\b(?:https?:\/\/|www\.)/i;
const LIVE_CHECK_PATTERN =
  /\b(?:i\s+(?:checked|browsed|verified|looked up)|live web|as of today|today i|i have (?:checked|browsed|verified))\b/i;
const UNSUPPORTED_CLAIM_PATTERN =
  /\b(?:guarantee(?:s|d|ed)?|accepts? every|admitted me|will be accepted|will get in|perfect score|nobel prize|minimum (?:sat|score|grades?))\b/i;

export function reviewAgeDays(checkedOn, now = new Date()) {
  if (typeof checkedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(checkedOn))
    return null;
  const reviewed = Date.parse(checkedOn + 'T00:00:00Z');
  if (!Number.isFinite(reviewed)) return null;
  const at = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(at)) return null;
  return Math.floor((at - reviewed) / 86400000);
}

export function isStale(entry, now = new Date(), maxAge = MAX_REVIEW_AGE_DAYS) {
  const age = reviewAgeDays(entry?.checkedOn, now);
  return age !== null && age > maxAge;
}

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

// Two active records with the same title but different dates/statuses cannot
// both be treated as confirmed. Surface the conflict instead of choosing one.
export function conflictNotes(results = []) {
  const groups = new Map();
  for (const entry of results) {
    const key = normalize(entry.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  const notes = [];
  for (const [name, entries] of groups) {
    if (entries.length < 2) continue;
    const deadlines = new Set(
      entries
        .map((e) => normalize(e.deadline || e.finalDeadline))
        .filter(Boolean),
    );
    const statuses = new Set(
      entries.map((e) => normalize(e.status || e.dateStatus)).filter(Boolean),
    );
    const hasOpenAndClosed =
      [...statuses].some((s) => /closed|archived/.test(s)) &&
      [...statuses].some((s) => /open|confirmed/.test(s));
    if (deadlines.size > 1 || hasOpenAndClosed)
      notes.push(
        `Sources for ${name} disagree about dates or availability. Check both provider pages before relying on either.`,
      );
  }
  return notes;
}

export function groundingViolation(text) {
  if (typeof text !== 'string' || !text.trim()) return 'The answer was empty.';
  if (URL_PATTERN.test(text))
    return 'The answer included a link instead of using the supplied references.';
  if (LIVE_CHECK_PATTERN.test(text))
    return 'The answer claimed live verification beyond the recorded review dates.';
  if (UNSUPPORTED_CLAIM_PATTERN.test(text))
    return 'The answer included a guarantee or admission outcome the catalog cannot support.';
  return null;
}
