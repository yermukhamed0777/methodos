import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from '../api/chat.js';

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

function harness(generate) {
  const calls = { generate: 0 };
  const db = {
    rpc: async () => ({ data: true, error: null }),
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      range: async () => ({
        error: null,
        data: [
          {
            status: 'Published',
            payload: {
              id: 'course-materials',
              kind: 'course',
              name: 'Materials course',
              summary: 'Materials science',
              url: 'https://example.edu/course',
              checkedOn: '2026-11-01',
            },
          },
        ],
      }),
    }),
  };
  return {
    calls,
    handler: createChatHandler({
      env: {
        AI_GATEWAY_MODEL: 'openai/gpt-4.1-nano',
        VERCEL_OIDC_TOKEN: 'private-oidc',
      },
      authenticate: async () => ({ db, user: { id: 'verified-user' } }),
      getContext: async () => ({ profileConsent: false }),
      generate: async (...args) => {
        calls.generate++;
        return generate(...args);
      },
    }),
  };
}

test('an empty model completion degrades to catalog search', async () => {
  const { handler, calls } = harness(async () => ({ text: '' }));
  const res = response();
  await handler({ method: 'POST', body: { message: 'materials' } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.mode, 'catalog');
  assert.equal(calls.generate, 1);
});

test('a completion that names no reviewed entry degrades to catalog search', async () => {
  const { handler } = harness(async () => ({
    text: 'Here is general advice with no catalog entry named.',
  }));
  const res = response();
  await handler({ method: 'POST', body: { message: 'materials' } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.mode, 'catalog');
  assert.match(res.body.notice, /did not name a reviewed catalog entry/);
});

test('a completion that names a reviewed entry is returned with its citation', async () => {
  const { handler } = harness(async () => ({
    text: 'Materials course is the closest reviewed match. Check the source.',
    aiModel: 'openai/gpt-4.1-nano',
  }));
  const res = response();
  await handler({ method: 'POST', body: { message: 'materials' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mode, 'ai');
  assert(
    res.body.references.some(
      (item) => item.name && res.body.text.includes(item.name),
    ),
  );
});
