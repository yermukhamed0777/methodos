import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from '../api/chat.js';
import { createCoachHandler } from '../api/coach.js';

const env = {
  AI_GATEWAY_MODEL: 'openai/gpt-4.1-nano',
  VERCEL_OIDC_TOKEN: 'private-oidc',
};
const response = () => ({
  statusCode: 200,
  headers: {},
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

function chatSetup({ rows = [], generate } = {}) {
  const calls = { quota: 0, generate: 0 };
  let prompt = '';
  const db = {
    from: () => ({
      select() {
        return this;
      },
      range: async () => ({ data: rows, error: null }),
    }),
    rpc: async () => {
      calls.quota++;
      return { data: true, error: null };
    },
  };
  return {
    calls,
    getPrompt: () => prompt,
    options: {
      env,
      authenticate: async () => ({ db, user: { id: 'verified-user' } }),
      getContext: async () => ({ profileConsent: false }),
      generate: async (options) => {
        calls.generate++;
        prompt = JSON.stringify(options);
        const name = rows[0]?.payload?.name;
        return {
          text: generate
            ? generate(options)
            : name
              ? `${name} is a reviewed record in the catalog. Check its source before applying.`
              : 'A grounded answer.',
          aiModel: env.AI_GATEWAY_MODEL,
          usedFallback: false,
        };
      },
    },
  };
}

function coachSetup({ generate, rows } = {}) {
  const calls = { generate: 0 };
  let prompt = '';
  const db = {
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      range: async () => ({ data: rows ?? [], error: null }),
    }),
    rpc: async () => ({ data: true, error: null }),
  };
  return {
    calls,
    getPrompt: () => prompt,
    options: {
      env,
      authenticate: async () => ({ db, user: { id: 'verified-user' } }),
      generate: async (options) => {
        calls.generate++;
        prompt = JSON.stringify(options);
        if (generate) return generate(options);
        return {
          text: 'A grounded draft.',
          aiModel: env.AI_GATEWAY_MODEL,
          usedFallback: false,
        };
      },
    },
  };
}

test('an unsupported question with no reviewed match never invokes a model', async () => {
  const setup = chatSetup();
  const res = response();
  await createChatHandler(setup.options)(
    { method: 'POST', body: { message: 'qzxyw nonsense' } },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mode, 'catalog');
  assert.deepEqual(res.body.references, []);
  assert.match(res.body.notice, /not a search of the whole internet/);
  assert.equal(setup.calls.generate, 0, 'no provider call without evidence');
  assert.equal(setup.calls.quota, 0, 'no quota consumed without evidence');
});

test('chat citations are provider URLs only, never in-app anchors', async () => {
  const rows = [
    {
      status: 'Published',
      payload: {
        id: 'internal-skill',
        kind: 'skill',
        name: 'Materials skill map',
        summary: 'Materials science skills',
        checkedOn: '2026-11-01',
        url: '/#skills',
      },
    },
  ];
  const setup = chatSetup({ rows });
  const res = response();
  await createChatHandler(setup.options)(
    { method: 'POST', body: { message: 'materials' } },
    res,
  );
  assert.equal(res.body.mode, 'ai');
  const cited = res.body.references.find((r) => r.id === 'internal-skill');
  assert.ok(cited, 'the reviewed internal record is still cited by name');
  assert.equal(
    'url' in cited,
    false,
    'in-app anchor is not presented as a source',
  );
  assert(
    res.body.references.every(
      (r) => !('url' in r) || /^https:\/\//.test(r.url),
    ),
  );
});

test('coach prompt contains the reviewed record content it relies on', async () => {
  const row = {
    id: 'course-materials',
    kind: 'course',
    status: 'Published',
    payload: {
      id: 'course-materials',
      name: 'Materials course',
      summary: 'A reviewed summary about metallurgy',
      eligibility: 'Open to undergraduates',
      checkedOn: '2026-11-01',
      url: 'https://example.edu/course',
    },
  };
  const setup = coachSetup({ rows: [row] });
  const res = response();
  await createCoachHandler(setup.options)(
    {
      method: 'POST',
      body: { target: 'materials', notes: 'I read about alloys.' },
    },
    res,
  );
  assert.equal(res.body.mode, 'ai');
  const prompt = setup.getPrompt();
  assert.match(prompt, /A reviewed summary about metallurgy/);
  assert.match(prompt, /Open to undergraduates/);
});

test('coach provider failure degrades to a labelled skeleton, not a bare error', async () => {
  const setup = coachSetup({
    generate() {
      throw new Error('provider offline');
    },
  });
  const res = response();
  await createCoachHandler(setup.options)(
    {
      method: 'POST',
      body: { target: 'materials', notes: 'I built a small cell.' },
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mode, 'template');
  assert.match(res.body.text, /draft skeleton/);
  assert.match(res.body.notice, /AI drafting is unavailable/);
  assert.match(res.body.notice, /request/);
  assert.equal(setup.calls.generate, 1);
});

const chatRow = (name, extra = {}) => ({
  status: 'Published',
  payload: {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    kind: 'course',
    name,
    summary: 'A reviewed catalogue entry.',
    checkedOn: '2026-11-01',
    url: 'https://example.edu/course',
    ...extra,
  },
});

test('an answer with invented guarantees never reaches the student as AI text', async () => {
  const setup = chatSetup({
    rows: [chatRow('Materials course')],
    generate: () =>
      'Northstar University guarantees a full scholarship and a 99% acceptance rate; deadline 12 Dec 2027.',
  });
  const res = response();
  await createChatHandler(setup.options)(
    { method: 'POST', body: { message: 'materials' } },
    res,
  );
  assert.equal(res.body.mode, 'catalog');
  assert.match(
    res.body.notice,
    /could not be checked against the reviewed catalog/,
  );
  assert.equal(setup.calls.generate, 1);
});

test('an answer that names no reviewed record is replaced by catalog search', async () => {
  const setup = chatSetup({
    rows: [chatRow('Materials course')],
    generate: () => 'Study hard and apply broadly; you will find something.',
  });
  const res = response();
  await createChatHandler(setup.options)(
    { method: 'POST', body: { message: 'materials' } },
    res,
  );
  assert.equal(res.body.mode, 'catalog');
  assert.match(res.body.notice, /did not name a reviewed catalog entry/);
});

test('conflicting active records are labelled rather than silently combined', async () => {
  const setup = chatSetup({
    rows: [
      chatRow('Materials Summer School', {
        id: 'materials-summer-a',
        deadline: '01 Dec 2026',
        status: 'Open',
      }),
      chatRow('Materials Summer School', {
        id: 'materials-summer-b',
        deadline: '01 Jan 2027',
        status: 'Expected',
      }),
    ],
  });
  const res = response();
  await createChatHandler(setup.options)(
    { method: 'POST', body: { message: 'materials summer school' } },
    res,
  );
  assert.match(res.body.notice || '', /disagree about dates or availability/);
});

test('a stale review date is excluded from source-grounded retrieval', async () => {
  const { isStale } = await import('../lib/grounding.js');
  assert.equal(
    isStale({ checkedOn: '2024-01-15' }, new Date('2026-11-26')),
    true,
  );
  assert.equal(
    isStale({ checkedOn: '2026-11-01' }, new Date('2026-11-26')),
    false,
  );
});
