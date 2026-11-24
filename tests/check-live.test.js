import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHECKS, summarize } from '../scripts/check-live.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

test('a fully matching deployment reports success', () => {
  const summary = summarize([
    { name: 'a', detail: 'x', ok: true, note: '' },
    { name: 'b', detail: 'y', ok: true, note: '' },
  ]);
  assert.equal(summary.ok, true);
  assert.equal(summary.passed, 2);
  assert.equal(summary.total, 2);
  assert.deepEqual(summary.failures, []);
});

test('a stale deployment explains every missing marker', () => {
  const summary = summarize([
    {
      name: 'glass.css is served',
      detail: 'merged in PR #18',
      ok: false,
      note: 'HTTP 404; expected CSS',
    },
    {
      name: 'public config answers',
      detail: 'public capability endpoint',
      ok: true,
      note: '',
    },
    {
      name: 'branded 404 page is served',
      detail: 'merged in PR #23',
      ok: false,
      note: 'HTTP 404; expected branded page',
    },
  ]);
  assert.equal(summary.ok, false);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failures.length, 2);
  assert.match(summary.failures[0], /HTTP 404; expected CSS/);
  assert.match(summary.failures[1], /branded 404 page is served/);
});

test('an empty run is not treated as success', () => {
  const summary = summarize([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.ok, false);
});

test('every probe is credential-free and same-origin', () => {
  assert.equal(CHECKS.length, 8);
  for (const check of CHECKS) {
    assert.match(check.path, /^\//, check.name + ' must be a relative path');
    assert.ok(check.hint.length > 15, check.name + ' needs an actionable hint');
    assert.ok(check.detail, check.name + ' needs provenance');
    assert.ok(
      !/authorization|apikey|token/i.test(JSON.stringify(check.headers || {})),
    );
  }
});

test('the only write-shaped request is an anonymous probe that must be rejected', () => {
  const posts = CHECKS.filter((c) => (c.method || 'GET') !== 'GET');
  assert.equal(posts.length, 1);
  const post = posts[0];
  assert.equal(post.method, 'POST');
  assert.equal(post.path, '/api/chat');
  assert.deepEqual(JSON.parse(post.body), { message: 'live deployment check' });
  assert.ok(!post.body.includes('profile'));
  assert.ok(!post.body.includes('history'));
  assert.equal(post.expect({ status: 200 }), false);
  assert.equal(post.expect({ status: 401 }), true);
  assert.equal(post.expect({ status: 403 }), true);
});

test('the live probe is not part of the ordinary CI gate', () => {
  assert.equal(pkg.scripts['check:live'], 'node scripts/check-live.js');
  assert.ok(!pkg.scripts.check.includes('check:live'));
  assert.ok(!pkg.scripts.test.includes('check:live'));
});

test('Methodos release markers distinguish the redesign from the old shell', () => {
  const [home, styles] = CHECKS;
  const body = readFileSync('dist/index.html', 'utf8');
  assert.equal(home.expect({ status: 200, body }), true);
  assert.equal(
    home.expect({ status: 200, body: body.replace('Methodos', 'ProspectoAI') }),
    false,
  );
  const stylesheet = readFileSync('dist/methodos-ui.css', 'utf8');
  assert.equal(
    styles.expect({
      status: 200,
      body: stylesheet,
      headers: { 'content-type': 'text/css' },
    }),
    true,
  );
  assert.equal(styles.expect({ status: 404, body: stylesheet }), false);
});
