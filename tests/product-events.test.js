import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventsHandler } from '../api/events.js';
import {
  aggregate,
  eventTotals,
  funnel,
  normalizeEvent,
  resultsBucket,
} from '../lib/product-events.js';
import { installProductEvents, privacyBlocked } from '../src/product-events.js';

const response = () => ({
  statusCode: 200,
  headers: {},
  ended: false,
  setHeader(key, value) {
    this.headers[key] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  end() {
    this.ended = true;
    return this;
  },
});

test('result counts are bucketed, never stored as text', () => {
  assert.equal(resultsBucket(0), '0');
  assert.equal(resultsBucket(1), '1-5');
  assert.equal(resultsBucket(5), '1-5');
  assert.equal(resultsBucket(6), '6-20');
  assert.equal(resultsBucket(20), '6-20');
  assert.equal(resultsBucket(21), '21+');
  assert.equal(resultsBucket('not a number'), '0');
});

test('only allowlisted events and properties survive', () => {
  assert.deepEqual(
    normalizeEvent({
      name: 'search',
      props: {
        surface: 'catalog',
        results: '1-5',
        filters: 'some',
        query: 'private scholarship text',
        notes: 'private note',
      },
    }),
    {
      name: 'search',
      props: { surface: 'catalog', results: '1-5', filters: 'some' },
    },
  );
  assert.equal(
    normalizeEvent({ name: 'search', props: { query: 'x' } }).name,
    'search',
  );
  assert.equal(normalizeEvent({ name: 'unknown', props: {} }), null);
  assert.equal(
    normalizeEvent({ name: 'search', props: { results: 'everything' } }),
    null,
  );
  assert.equal(normalizeEvent({ name: 'save', props: { action: 1 } }), null);
  assert.equal(
    normalizeEvent({ name: 'save', props: { action: 'add' } }).props.action,
    'add',
  );
});

test('aggregation links a random session to coarse counters', () => {
  const now = new Date('2026-11-25T10:00:00.000Z');
  const snapshot = aggregate(
    null,
    [
      {
        name: 'search',
        props: { surface: 'catalog', results: '1-5', filters: 'none' },
      },
      {
        name: 'detail_open',
        props: { kind: 'opportunity', surface: 'catalog' },
      },
      { name: 'save', props: { action: 'add', kind: 'opportunity' } },
    ],
    { session: 'a'.repeat(32), now },
  );
  assert.equal(snapshot.date, '2026-11-25');
  assert.equal(Object.keys(snapshot.sessions).length, 1);
  const session = snapshot.sessions['a'.repeat(16)];
  assert.equal(session.counts.search, 1);
  assert.equal(session.counts.detail_open, 1);
  assert.equal(session.counts.save, 1);
  assert.equal(
    snapshot.dimensions['search|filters=none,results=1-5,surface=catalog'],
    1,
  );
  assert.deepEqual(funnel([snapshot]), {
    sessions: 1,
    search: 1,
    detail: 1,
    save: 1,
    nextStep: 0,
  });
  assert.deepEqual(eventTotals([snapshot]).totals, {
    search: 1,
    detail_open: 1,
    save: 1,
  });
});

test('an invalid session is grouped without creating an identifier', () => {
  const snapshot = aggregate(
    null,
    [{ name: 'view', props: { view: 'finder' } }],
    { session: 'not a session', now: new Date('2026-11-25T10:00:00Z') },
  );
  assert.deepEqual(Object.keys(snapshot.sessions), ['_other']);
});

test('the endpoint rejects non-POST and malformed bodies', async () => {
  const handler = createEventsHandler({ append: async () => {} });
  let res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');

  res = response();
  await handler({ method: 'POST', body: '{not json' }, res);
  assert.equal(res.statusCode, 400);

  res = response();
  await handler({ method: 'POST', body: { events: [] } }, res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);

  res = response();
  await handler({ method: 'POST', body: 'x'.repeat(9000) }, res);
  assert.equal(res.statusCode, 413);
});

test('the endpoint stores only validated events under the server date', async () => {
  const calls = [];
  const handler = createEventsHandler({
    now: () => new Date('2026-11-25T23:30:00.000Z'),
    append: async (...args) => calls.push(args),
  });
  const res = response();
  await handler(
    {
      method: 'POST',
      body: {
        session: 'ABCDEF0123456789ABCDEF0123456789',
        at: '2020-01-01',
        events: [
          {
            name: 'search',
            props: {
              surface: 'catalog',
              results: '6-20',
              filters: 'some',
              query: 'must not be stored',
            },
          },
          { name: 'unknown', props: { query: 'must not be stored' } },
          { name: 'save', props: { action: 'add', kind: 'opportunity' } },
        ],
      },
    },
    res,
  );
  assert.equal(res.statusCode, 204);
  assert.equal(calls.length, 1);
  const [date, events, options] = calls[0];
  assert.equal(date, '2026-11-25');
  assert.equal(options.session, 'abcdef0123456789');
  assert.equal(options.now.toISOString(), '2026-11-25T23:30:00.000Z');
  assert.deepEqual(events, [
    {
      name: 'search',
      props: { surface: 'catalog', results: '6-20', filters: 'some' },
    },
    { name: 'save', props: { action: 'add', kind: 'opportunity' } },
  ]);
  assert.equal(JSON.stringify(events).includes('must not be stored'), false);
});

test('a storage outage returns a generic 503', async () => {
  const handler = createEventsHandler({
    append: async () => {
      throw new Error('blob down');
    },
  });
  const res = response();
  await handler(
    {
      method: 'POST',
      body: { events: [{ name: 'view', props: { view: 'finder' } }] },
    },
    res,
  );
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /temporarily unavailable/);
});

test('the daily retention call requires the cron secret', async () => {
  const pruned = [];
  const handler = createEventsHandler({
    cronSecret: 'cron-secret',
    now: () => new Date('2026-11-25T10:00:00.000Z'),
    prune: async (cutoff) => {
      pruned.push(cutoff);
      return 3;
    },
  });
  let res = response();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);

  res = response();
  await handler(
    { method: 'GET', headers: { authorization: 'Bearer cron-secret' } },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    removed: 3,
    cutoff: '2026-10-26',
  });
  assert.deepEqual(pruned, ['2026-10-26']);
});

test('the retention call stays disabled without a configured secret', async () => {
  const handler = createEventsHandler({ cronSecret: '', prune: async () => 0 });
  const res = response();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('Do Not Track and Global Privacy Control disable the browser tracker', () => {
  assert.equal(privacyBlocked({ doNotTrack: '1' }), true);
  assert.equal(privacyBlocked({ doNotTrack: 'yes' }), true);
  assert.equal(
    privacyBlocked({ doNotTrack: null, globalPrivacyControl: true }),
    true,
  );
  assert.equal(
    privacyBlocked({ doNotTrack: null, globalPrivacyControl: false }),
    false,
  );
});

function fakeWindow({ doNotTrack = null, globalPrivacyControl = false } = {}) {
  const sent = [];
  const window = {
    navigator: { doNotTrack, globalPrivacyControl },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
    },
    crypto: {
      getRandomValues(bytes) {
        for (let i = 0; i < bytes.length; i++) bytes[i] = i + 1;
        return bytes;
      },
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
    addEventListener: () => {},
    document: { visibilityState: 'visible' },
  };
  return { window, sent };
}

test('the browser tracker batches only allowlisted fields', () => {
  const { window, sent } = fakeWindow();
  const tracker = installProductEvents(window, {
    send: (events) => sent.push(events),
  });
  assert.equal(tracker.enabled, true);
  assert.equal(
    tracker.track('search', {
      surface: 'catalog',
      results: '0',
      filters: 'none',
      query: 'private text',
      email: 'student@example.com',
    }),
    true,
  );
  assert.equal(tracker.track('search', { results: 'everything' }), false);
  assert.equal(tracker.track('unknown', {}), false);
  tracker.flush();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], [
    {
      name: 'search',
      props: { surface: 'catalog', results: '0', filters: 'none' },
    },
  ]);
});

test('a blocked browser tracker sends nothing', () => {
  const { window, sent } = fakeWindow({ globalPrivacyControl: true });
  const tracker = installProductEvents(window, {
    send: (events) => sent.push(events),
  });
  assert.equal(tracker.enabled, false);
  assert.equal(tracker.track('view', { view: 'finder' }), false);
  tracker.flush();
  assert.equal(sent.length, 0);
});
