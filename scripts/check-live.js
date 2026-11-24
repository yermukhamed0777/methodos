#!/usr/bin/env node
// Checks public release markers. Deployment metadata establishes the exact SHA.
//
// Merging to `main` and passing CI says nothing about production: the live site
// can lag by many commits. Every check below is read-only and credential-free:
// public GETs plus one anonymous POST that must be rejected.
// It never signs in, never sends personal data and never writes to production.
// It is deliberately NOT part of `npm run check`: production may lag PRs.

const DEFAULT_BASE = 'https://opportunity-explorer-ruddy.vercel.app';

export const CHECKS = [
  {
    name: 'Methodos homepage is served',
    path: '/',
    hint: 'HTTP 200 with the Methodos title and the new stylesheet link',
    expect: (r) =>
      r.status === 200 &&
      /<title>Methodos\b/.test(r.body) &&
      r.body.includes('href="/methodos-ui.css"'),
    detail: 'Methodos release shell',
  },
  {
    name: 'Methodos stylesheet is served',
    path: '/methodos-ui.css',
    hint: 'HTTP 200 CSS with the Methodos palette tokens',
    expect: (r) =>
      r.status === 200 &&
      (r.headers?.['content-type'] || '').includes('text/css') &&
      r.body.includes('--ui-yellow:'),
    detail: 'Methodos redesign asset',
  },
  {
    name: 'glass.css is served',
    path: '/glass.css',
    hint: 'HTTP 200 with CSS containing --glass or backdrop-filter',
    expect: (r) => r.status === 200 && /--glass|backdrop-filter/.test(r.body),
    detail: 'merged in PR #18',
  },
  {
    name: 'branded 404 page is served',
    path: '/404.html',
    hint: 'HTTP 200 containing "This page does not exist." and "Page not found"',
    expect: (r) =>
      r.status === 200 &&
      r.body.includes('This page does not exist.') &&
      r.body.includes('Page not found'),
    detail: 'merged in PR #23',
  },
  {
    name: 'BARYS asks for a request',
    path: '/bootstrap.js',
    hint: 'HTTP 200 with JS containing "Tell BARYS what you need"',
    expect: (r) =>
      r.status === 200 && r.body.includes('Tell BARYS what you need'),
    detail: 'merged in PR #15',
  },
  {
    name: 'sign-in page offers account creation',
    path: '/login',
    hint: 'HTTP 200 with "Resend confirmation email" and a signup action',
    expect: (r) =>
      r.status === 200 &&
      r.body.includes('Resend confirmation email') &&
      /Create account|sign up/i.test(r.body),
    detail: 'public sign-in entry point',
  },
  {
    name: 'public config answers',
    path: '/api/config',
    hint: 'HTTP 200 JSON with a supabaseUrl field',
    expect: (r) => {
      if (r.status !== 200) return false;
      try {
        return Boolean(JSON.parse(r.body).supabaseUrl);
      } catch {
        return false;
      }
    },
    detail: 'public capability endpoint',
  },
  {
    name: 'anonymous chat is rejected',
    path: '/api/chat',
    method: 'POST',
    // A harmless valid body; a signed-out request must be rejected before any
    // parsing, quota reservation or database work. No credentials are sent.
    body: JSON.stringify({ message: 'live deployment check' }),
    hint: 'HTTP 401 or 403 for an anonymous POST with no Authorization header',
    expect: (r) => r.status === 401 || r.status === 403,
    detail: 'protected API must not answer signed-out callers',
  },
];

async function probe(base, check, fetchImpl = fetch) {
  const url = base.replace(/\/$/, '') + check.path;
  try {
    const response = await fetchImpl(url, {
      method: check.method || 'GET',
      headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
      body: check.body,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.text();
    return {
      status: response.status,
      body,
      url,
      headers: { 'content-type': response.headers.get('content-type') || '' },
      error: null,
    };
  } catch (error) {
    return { status: 0, body: '', url, headers: {}, error: error.message };
  }
}

export function summarize(results) {
  const failures = results.filter((r) => !r.ok);
  return {
    ok: results.length > 0 && failures.length === 0,
    passed: results.length - failures.length,
    total: results.length,
    failures: failures.map((r) => `${r.name}: ${r.note} (${r.detail})`),
  };
}

async function main() {
  const base = process.argv[2] || process.env.LIVE_URL || DEFAULT_BASE;
  console.log('Checking ' + base + '\n');
  const results = [];
  for (const check of CHECKS) {
    const response = await probe(base, check);
    const ok = !response.error && check.expect(response);
    const note = response.error
      ? `network error: ${response.error}; expected ${check.hint}`
      : `HTTP ${response.status}, ${response.headers?.['content-type'] || 'unknown type'}; expected ${check.hint}`;
    results.push({ name: check.name, detail: check.detail, ok, note });
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${check.name} — ${ok ? `HTTP ${response.status} (${check.detail})` : note}`,
    );
  }
  const summary = summarize(results);
  console.log(
    `\n${summary.passed}/${summary.total} live checks passed for ${base}`,
  );
  if (!summary.ok) {
    console.log('\nFailed checks:');
    for (const failure of summary.failures) console.log('  - ' + failure);
    console.log(
      '\nRelease checks failed. Check the deployment source SHA and the failing routes, then re-run. This script is not part of npm run check.',
    );
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('check-live.js')) {
  await main();
}
