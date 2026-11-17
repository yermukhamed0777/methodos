#!/usr/bin/env node
// Proves which build is actually live.
//
// Merging to `main` and passing CI says nothing about production: this project
// has been deployed manually, so the live site can lag by many commits. Each
// check below targets a marker that only exists at or after a known commit, so a
// stale deployment fails loudly instead of looking fine.

const DEFAULT_BASE = 'https://opportunity-explorer-ruddy.vercel.app';

const CHECKS = [
  {
    name: 'glass.css is served',
    path: '/glass.css',
    expect: (r) => r.status === 200 && /--glass|backdrop-filter/.test(r.body),
    detail: 'merged in PR #18 (design tokens)',
  },
  {
    name: 'branded 404 page is served',
    path: '/404.html',
    expect: (r) =>
      r.status === 200 &&
      r.body.includes('This page does not exist.') &&
      r.body.includes('Page not found'),
    detail: 'merged in PR #23',
  },
  {
    name: 'BARYS asks for a request',
    path: '/bootstrap.js',
    expect: (r) =>
      r.status === 200 && r.body.includes('Tell BARYS what you need'),
    detail: 'merged in PR #15',
  },
  {
    name: 'sign-in page offers account creation',
    path: '/login',
    expect: (r) =>
      r.status === 200 &&
      r.body.includes('Resend confirmation email') &&
      /Create account|sign up/i.test(r.body),
    detail: 'sign-in entry point',
  },
  {
    name: 'public config answers',
    path: '/api/config',
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
    // A valid body is required: malformed input is rejected with 400 before the
    // auth gate runs, which would hide whether the gate exists.
    body: JSON.stringify({ message: 'live deployment check' }),
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
    return { status: response.status, body, url, error: null };
  } catch (error) {
    return { status: 0, body: '', url, error: error.message };
  }
}

export function summarize(results) {
  const failures = results.filter((r) => !r.ok);
  return {
    ok: results.length > 0 && failures.length === 0,
    passed: results.length - failures.length,
    total: results.length,
    failures: failures.map((r) => `${r.name} (${r.detail})`),
  };
}

async function main() {
  const base = process.argv[2] || process.env.LIVE_URL || DEFAULT_BASE;
  console.log('Checking ' + base + '\n');
  const results = [];
  for (const check of CHECKS) {
    const response = await probe(base, check);
    let ok = false;
    let note = response.error || `HTTP ${response.status}`;
    if (!response.error) {
      ok = check.expect(response);
      if (!ok) note = `HTTP ${response.status}, expected marker missing`;
    }
    results.push({ name: check.name, detail: check.detail, ok, note });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.name} — ${note}`);
  }
  const summary = summarize(results);
  console.log(
    `\n${summary.passed}/${summary.total} live checks passed for ${base}`,
  );
  if (!summary.ok) {
    console.log(
      '\nThis deployment does not match the current main. Deploy the exact tested commit, then re-run.',
    );
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('check-live.js')) {
  await main();
}
