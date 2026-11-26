// Privacy-safe product counters.
//
// The browser may only send the event names and coarse properties declared
// here. Search text, filters the person typed, notes, document names, file
// URLs and account identifiers are not part of any schema, so they cannot be
// stored even if a caller passes them by mistake.
//
// A session ID is a random per-tab value. It links events inside one tab so a
// search -> detail -> save -> next-step funnel can be counted. It is never
// derived from an account, email address, IP address or device fingerprint.

export const MAX_BATCH = 20;
export const MAX_SESSIONS = 2000;
export const MAX_DIMENSIONS = 2000;
export const SESSION_PATTERN = /^[a-f0-9]{16,64}$/i;

const VIEW = /^[a-z][a-z0-9-]{0,30}$/;
const BUCKETS = ['0', '1-5', '6-20', '21+'];

// Every allowed event and property. Values are either an allowlist or a
// narrow pattern; anything else drops the whole event.
export const EVENT_SCHEMA = {
  view: { view: VIEW },
  search: {
    surface: ['catalog', 'workspace'],
    results: BUCKETS,
    filters: ['none', 'some'],
  },
  detail_open: {
    kind: ['opportunity', 'resource', 'record'],
    surface: ['catalog', 'library', 'link', 'rail', 'feed'],
  },
  save: {
    action: ['add', 'remove'],
    kind: ['opportunity', 'resource'],
  },
  next_step: {
    action: [
      'quick_plan',
      'plan',
      'task',
      'activity',
      'calendar',
      'share',
      'progress',
      'assistant',
    ],
  },
  source_open: {
    surface: ['card', 'detail', 'library', 'feed'],
  },
};

export function resultsBucket(count) {
  const value = Number(count);
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value <= 5) return '1-5';
  if (value <= 20) return '6-20';
  return '21+';
}

function allowed(rule, value) {
  return rule instanceof RegExp ? rule.test(value) : rule.includes(value);
}

export function normalizeEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const name = typeof input.name === 'string' ? input.name : '';
  const schema = EVENT_SCHEMA[name];
  if (!schema) return null;
  const given =
    input.props &&
    typeof input.props === 'object' &&
    !Array.isArray(input.props)
      ? input.props
      : {};
  const props = {};
  for (const [key, rule] of Object.entries(schema)) {
    const raw = given[key];
    if (raw === undefined || raw === null || raw === '') continue;
    if (typeof raw !== 'string') return null;
    const value = raw.toLowerCase();
    if (!allowed(rule, value)) return null;
    props[key] = value;
  }
  return { name, props };
}

export function dimensionKey(event) {
  const parts = Object.keys(event.props)
    .sort()
    .map((key) => key + '=' + event.props[key]);
  return parts.length ? event.name + '|' + parts.join(',') : event.name;
}

function count(value) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function sessionCounts(value) {
  const counts = {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return counts;
  for (const [name, total] of Object.entries(value)) {
    if (EVENT_SCHEMA[name]) counts[name] = count(total);
  }
  return counts;
}

function copySnapshot(previous, date, now) {
  const snapshot = {
    version: 1,
    date,
    sessions: {},
    dimensions: {},
    updatedAt: now,
  };
  if (!previous || previous.version !== 1) return snapshot;
  if (typeof previous.date === 'string') snapshot.date = previous.date;
  const sessions = previous.sessions;
  if (sessions && typeof sessions === 'object' && !Array.isArray(sessions)) {
    for (const [id, value] of Object.entries(sessions)) {
      if (!value || typeof value !== 'object') continue;
      snapshot.sessions[id] = {
        first: typeof value.first === 'string' ? value.first : now,
        last: typeof value.last === 'string' ? value.last : now,
        counts: sessionCounts(value.counts),
      };
    }
  }
  const dimensions = previous.dimensions;
  if (
    dimensions &&
    typeof dimensions === 'object' &&
    !Array.isArray(dimensions)
  ) {
    for (const [key, total] of Object.entries(dimensions))
      snapshot.dimensions[key] = count(total);
  }
  return snapshot;
}

// Merge validated events into one day of counters. Pure and deterministic so
// the API, tests and a future exporter share exactly one implementation.
export function aggregate(
  previous,
  events,
  { session = '_other', now, date } = {},
) {
  const at = now instanceof Date ? now : new Date();
  const iso = at.toISOString();
  const day = date || iso.slice(0, 10);
  const snapshot = copySnapshot(previous, day, iso);
  const id = SESSION_PATTERN.test(session)
    ? session.slice(0, 16).toLowerCase()
    : '_other';
  const capped =
    !snapshot.sessions[id] &&
    Object.keys(snapshot.sessions).length >= MAX_SESSIONS;
  const key = capped ? '_other' : id;
  for (const input of events || []) {
    const event = normalizeEvent(input);
    if (!event) continue;
    const entry = (snapshot.sessions[key] ||= {
      first: iso,
      last: iso,
      counts: {},
    });
    entry.last = iso;
    entry.counts[event.name] = Math.min(
      10000,
      count(entry.counts[event.name]) + 1,
    );
    const dimension = dimensionKey(event);
    if (
      dimension in snapshot.dimensions ||
      Object.keys(snapshot.dimensions).length < MAX_DIMENSIONS
    )
      snapshot.dimensions[dimension] = Math.min(
        10000,
        count(snapshot.dimensions[dimension]) + 1,
      );
  }
  snapshot.updatedAt = iso;
  return snapshot;
}

// Session-level funnel counts for one or more daily snapshots. A session is
// counted at each step it reached; ordering inside the session is not stored.
export function funnel(snapshots) {
  const totals = {
    sessions: 0,
    search: 0,
    detail: 0,
    save: 0,
    nextStep: 0,
  };
  for (const snapshot of snapshots || []) {
    for (const session of Object.values(snapshot?.sessions || {})) {
      totals.sessions++;
      if (session.counts?.search) totals.search++;
      if (session.counts?.detail_open) totals.detail++;
      if (session.counts?.save) totals.save++;
      if (session.counts?.next_step) totals.nextStep++;
    }
  }
  return totals;
}

export function eventTotals(snapshots) {
  const totals = {};
  const dimensions = {};
  for (const snapshot of snapshots || []) {
    for (const session of Object.values(snapshot?.sessions || {}))
      for (const [name, value] of Object.entries(session.counts || {}))
        totals[name] = (totals[name] || 0) + count(value);
    for (const [key, value] of Object.entries(snapshot?.dimensions || {}))
      dimensions[key] = (dimensions[key] || 0) + count(value);
  }
  return { totals, dimensions };
}
