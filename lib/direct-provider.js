// Optional OpenAI-compatible server-side provider. It exists so generation
// does not depend on one deployment gateway. The key is never sent to clients.
const DEFAULT_BASE = 'https://api.openai.com/v1';
const MODEL = /^[a-z0-9][a-z0-9._:-]{1,100}$/i;
export function isDirectConfigured(env = process.env) {
  return !!(env.AI_DIRECT_API_KEY && env.AI_DIRECT_MODEL && directBase(env));
}
export function directBase(env = process.env) {
  const value = env.AI_DIRECT_BASE_URL || DEFAULT_BASE;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      /^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(
        url.hostname,
      )
    )
      return null;
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}
export async function generateDirect(
  options,
  { env = process.env, fetcher = fetch } = {},
) {
  if (!isDirectConfigured(env)) throw Error('Direct provider not configured.');
  if (!MODEL.test(env.AI_DIRECT_MODEL)) throw Error('Invalid direct model.');
  const responseFormat = options.output
    ? await options.output.responseFormat
    : null;
  let structured = null;
  if (responseFormat?.type === 'json')
    structured = responseFormat.schema
      ? {
          type: 'json_schema',
          json_schema: {
            name:
              String(responseFormat.name || 'output')
                .replace(/[^a-z0-9_-]/gi, '_')
                .slice(0, 64) || 'output',
            schema: responseFormat.schema,
            strict: true,
          },
        }
      : { type: 'json_object' };
  const request = {
    model: env.AI_DIRECT_MODEL,
    messages: [
      { role: 'system', content: String(options.system || '') },
      { role: 'user', content: String(options.prompt || '') },
    ],
    max_tokens: Math.min(Math.max(options.maxOutputTokens || 1000, 1), 4000),
    temperature: 0.2,
  };
  if (structured) request.response_format = structured;
  const response = await fetcher(directBase(env) + '/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.AI_DIRECT_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Object.assign(Error('Direct provider request failed.'), {
      statusCode: response.status,
    });
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim())
    throw Error('Direct provider returned empty content.');
  const result = {
    text,
    aiModel: 'direct/' + env.AI_DIRECT_MODEL,
    usedFallback: false,
  };
  if (options.output)
    result.output = await options.output.parseCompleteOutput(
      { text },
      {
        response: {
          id: data?.id || null,
          timestamp: new Date(),
          modelId: env.AI_DIRECT_MODEL,
        },
        usage: {
          inputTokens: data?.usage?.prompt_tokens ?? undefined,
          outputTokens: data?.usage?.completion_tokens ?? undefined,
          totalTokens: data?.usage?.total_tokens ?? undefined,
        },
        finishReason: data?.choices?.[0]?.finish_reason || 'stop',
      },
    );
  return result;
}
