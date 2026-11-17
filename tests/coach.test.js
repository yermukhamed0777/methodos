import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoachHandler } from '../api/coach.js';
import { validateCoachInput, cleanDraft, templateDraft } from '../lib/coach.js';

const response = () => ({
  statusCode: 200,
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
function deps({
  rows,
  catalogError = null,
  allowed = true,
  quotaError = null,
  text = 'A grounded draft about my own project.',
} = {}) {
  const calls = { quota: 0, generate: 0 };
  const db = {
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      range: async () => ({ data: rows || [], error: catalogError }),
    }),
    rpc: async () => {
      calls.quota++;
      return { data: allowed, error: quotaError };
    },
  };
  return {
    calls,
    options: {
      env: {
        AI_GATEWAY_MODEL: 'openai/gpt-4.1-nano',
        VERCEL_OIDC_TOKEN: 'private-oidc',
      },
      authenticate: async () => ({ db, user: { id: 'verified-user' } }),
      generate: async () => {
        calls.generate++;
        return { text, aiModel: 'openai/gpt-4.1-nano', usedFallback: false };
      },
    },
  };
}
const row = {
  id: 'course-materials',
  kind: 'course',
  status: 'Published',
  payload: {
    id: 'course-materials',
    name: 'Materials course',
    summary: 'Materials science',
    checkedOn: '2026-11-01',
    url: 'https://example.edu/course',
  },
};

test('coach rejects invalid input before authentication', async () => {
  const handler = createCoachHandler({
    authenticate: () => assert.fail('Invalid input must stop before auth'),
  });
  for (const body of [
    '{',
    {},
    { target: '' },
    { target: 'x'.repeat(161) },
    { target: 'test', notes: 'x'.repeat(3001) },
  ]) {
    const res = response();
    await handler({ method: 'POST', body }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.deepEqual(
    validateCoachInput({ target: 'test', section: 'unknown' }).value.section,
    'motivation',
  );
});

test('coach returns an honest skeleton when AI is not configured or quota is exhausted', async () => {
  for (const patch of [{ env: {}, allowed: true }, { allowed: false }]) {
    const setup = deps({ rows: [row], ...patch });
    const res = response();
    await createCoachHandler({
      ...setup.options,
      ...(patch.env ? { env: patch.env } : {}),
    })(
      {
        method: 'POST',
        body: { target: 'materials', notes: 'I built a small battery cell.' },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.mode, 'template');
    assert.match(res.body.text, /draft skeleton/);
    assert.match(res.body.text, /I built a small battery cell/);
    // Ranking is relevance-first, so the published record is cited alongside
    // the closest catalog entries rather than pinned to position 0.
    assert(
      res.body.references.some((r) => r.id === 'course-materials'),
      'published record is cited',
    );
    assert.deepEqual(res.body.routes[0], { view: 'courses', label: 'Courses' });
    assert.equal(setup.calls.generate, 0);
  }
});

test('coach produces a cleaned AI draft with references and no saved side effects', async () => {
  const setup = deps({
    rows: [row],
    text: '<p>My project</p> [notes](https://evil.example) was useful.',
  });
  const res = response();
  await createCoachHandler(setup.options)(
    { method: 'POST', body: { target: 'materials', section: 'plan' } },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mode, 'ai');
  assert.equal(setup.calls.quota, 1);
  assert.equal(setup.calls.generate, 1);
  assert(!res.body.text.includes('<p>'));
  assert(!res.body.text.includes('https://evil.example'));
  assert.match(res.body.notice, /Nothing has been saved or submitted/);
});

test('draft helpers keep text bounded and never invent facts', () => {
  assert.equal(
    cleanDraft('<b>Hello</b> [world](https://example.org)'),
    'Hello world',
  );
  const text = templateDraft({
    target: 'summer research',
    notes: 'I helped in a school lab.',
    section: 'experience',
    references: [{ name: 'Official lab page', checkedOn: '2026-11-01' }],
  });
  assert.match(text, /I helped in a school lab/);
  assert.match(text, /Official lab page/);
  assert(!text.includes('https://'));
});
