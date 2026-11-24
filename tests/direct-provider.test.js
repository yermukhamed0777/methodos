import test from 'node:test';
import assert from 'node:assert/strict';
import { Output } from 'ai';
import { z } from 'zod';
import { createConfigHandler } from '../api/config.js';
import {
  isDirectConfigured,
  directBase,
  generateDirect,
} from '../lib/direct-provider.js';
import { isGatewayConfigured } from '../lib/ai-config.js';
import { generateWithFallback } from '../lib/ai-gateway.js';

const directEnv = {
  AI_DIRECT_API_KEY: 'private-direct-key',
  AI_DIRECT_MODEL: 'gpt-4.1-nano',
};
const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test('direct provider requires a key, model and safe HTTPS endpoint', () => {
  assert.equal(isDirectConfigured(directEnv), true);
  assert.equal(isDirectConfigured({ AI_DIRECT_API_KEY: 'k' }), false);
  assert.equal(directBase({ AI_DIRECT_BASE_URL: 'http://evil.example' }), null);
  assert.equal(directBase({ AI_DIRECT_BASE_URL: 'http://127.0.0.1' }), null);
  assert.equal(
    directBase({ ...directEnv, AI_DIRECT_BASE_URL: 'https://api.example/v1/' }),
    'https://api.example/v1',
  );
});

test('direct generation sends a bounded request and never exposes the key', async () => {
  let request;
  const result = await generateDirect(
    {
      system: 'System rules',
      prompt: 'Student question',
      maxOutputTokens: 5000,
    },
    {
      env: directEnv,
      fetcher: async (url, options) => {
        request = { url, options };
        return jsonResponse({
          choices: [{ message: { content: 'A grounded answer.' } }],
        });
      },
    },
  );
  assert.equal(request.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(
    request.options.headers.Authorization,
    'Bearer private-direct-key',
  );
  const body = JSON.parse(request.options.body);
  assert.equal(body.max_tokens, 4000);
  assert.equal(body.messages[0].content, 'System rules');
  assert.equal(result.text, 'A grounded answer.');
  assert.equal(result.aiModel, 'direct/gpt-4.1-nano');
  assert(!JSON.stringify(result).includes('private-direct-key'));
  await assert.rejects(
    () =>
      generateDirect(
        { system: '', prompt: '' },
        { env: directEnv, fetcher: async () => jsonResponse({}, 401) },
      ),
    (error) => error.statusCode === 401,
  );
});

test('direct generation requests and parses structured output', async () => {
  let body;
  const output = Output.object({
    schema: z.object({ items: z.array(z.string().max(200)).min(1).max(8) }),
  });
  const result = await generateDirect(
    {
      system: 'Plan rules',
      prompt: 'Build a study plan',
      output,
      maxOutputTokens: 800,
    },
    {
      env: directEnv,
      fetcher: async (_url, options) => {
        body = JSON.parse(options.body);
        return jsonResponse({
          id: 'chatcmpl-structured',
          choices: [
            {
              message: { content: '{"items":["Read one set of notes"]}' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        });
      },
    },
  );
  assert.equal(body.response_format.type, 'json_schema');
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.response_format.json_schema.name, 'output');
  assert.deepEqual(body.response_format.json_schema.schema.type, 'object');
  assert.deepEqual(result.output, { items: ['Read one set of notes'] });
  assert.equal(result.text, '{"items":["Read one set of notes"]}');
  assert.equal(result.aiModel, 'direct/gpt-4.1-nano');
  await assert.rejects(
    () =>
      generateDirect(
        { system: '', prompt: '', output },
        {
          env: directEnv,
          fetcher: async () =>
            jsonResponse({
              choices: [
                { message: { content: 'not json' }, finish_reason: 'stop' },
              ],
            }),
        },
      ),
    /could not parse/,
  );
});

test('direct configuration enables the public capability flag and generation path', async () => {
  assert.equal(isGatewayConfigured(directEnv), true);
  const res = {
    statusCode: 0,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  createConfigHandler({
    ...directEnv,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  })({ method: 'GET' }, res);
  assert.equal(res.body.aiConfigured, true);
  assert(!JSON.stringify(res.body).includes('private-direct-key'));
  const result = await generateWithFallback(
    { system: 'Rules', prompt: 'Question' },
    {
      env: directEnv,
      fetcher: async () =>
        jsonResponse({ choices: [{ message: { content: 'Direct answer.' } }] }),
      generate: () =>
        assert.fail('Gateway must not be called when direct is configured'),
    },
  );
  assert.equal(result.text, 'Direct answer.');
});
