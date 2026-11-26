import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import catalogHandler from '../api/catalog.js';
import { publicPreview } from '../lib/public-catalog.js';
import { verificationStatus } from '../lib/intelligence-core.js';
import { installNavigation, HUBS } from '../src/navigation.js';
import { installAccess, gateHTML } from '../src/access.js';
const response = () => ({
  statusCode: 200,
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
const settle = async () => {
  for (let i = 0; i < 12; i++)
    await new Promise((resolve) => setImmediate(resolve));
};
const html = () =>
  readFileSync('dist/index.html', 'utf8').replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    '',
  );

test('anonymous catalog contains reviewed public content only; malformed authentication never grants private access', async () => {
  let res = response();
  await catalogHandler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.preview, true);
  assert(res.body.resources.courses.length >= 281);
  assert(res.body.intelligence.records.some((r) => r.kind === 'pathway'));
  assert(res.body.intelligence.records.some((r) => r.kind === 'university'));
  assert(!('reviewQueue' in res.body.intelligence));
  assert(!JSON.stringify(res.body).includes('before_payload'));
  res = response();
  await catalogHandler(
    { method: 'GET', headers: { authorization: 'invalid' } },
    res,
  );
  assert.equal(res.statusCode, 401);
  res = response();
  await catalogHandler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('preview projection omits private fields, audit revisions and unpublished candidates recursively', () => {
  const output = publicPreview({
    catalog: { opportunities: [] },
    resources: {},
    development: {},
    intelligence: {
      checkedOn: '2026-11-13',
      reviewQueue: [{ name: 'UNPUBLISHED' }],
      records: [
        {
          id: 'published',
          kind: 'course',
          name: 'Public course',
          notes: 'PRIVATE',
          user_id: 'PRIVATE',
          access_token: 'PRIVATE',
          funding: { coverage: 'Public award', privateNotes: 'PRIVATE' },
          sources: [['Official', 'https://example.edu']],
        },
        { id: 'draft', kind: 'course', status: 'Draft', name: 'UNPUBLISHED' },
        {
          id: 'review',
          kind: 'opportunity',
          status: 'Review',
          name: 'UNPUBLISHED',
        },
        { id: 'archive', kind: 'course', status: 'Archived', name: 'ARCHIVED' },
      ],
    },
  });
  const text = JSON.stringify(output);
  assert(!/PRIVATE|UNPUBLISHED|ARCHIVED/.test(text));
  assert.match(text, /Public course/);
  assert.match(text, /Public award/);
});

test('public preview keeps the reviewed credentials disclaimer on skills', async () => {
  const res = response();
  await catalogHandler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  const skills = res.body.resources.skills || [];
  assert.ok(skills.length > 0);
  const withDisclaimer = skills.filter(
    (s) => typeof s.credentials === 'string' && s.credentials.length > 0,
  );
  assert.ok(
    withDisclaimer.length > 0,
    'public skills must keep their certificate disclaimer',
  );
  assert.match(withDisclaimer[0].credentials, /certificate|access/i);
});

test('verification badges distinguish open, expected, directory, unreviewed and expired records', () => {
  const now = new Date('2026-11-13T10:00:00Z');
  const open = {
    status: 'Open',
    openVerified: true,
    applicationUrl: 'https://example.edu/apply',
    checkedOn: '2026-11-12',
    finalDeadline: '2026-12-01',
  };
  assert.equal(verificationStatus(open, now).label, 'Verified Open');
  for (const patch of [
    { openVerified: false },
    { checkedOn: '2026-09-01' },
    { checkedOn: '2026-12-01' },
    { checkedOn: null },
  ])
    assert.equal(
      verificationStatus({ ...open, ...patch }, now).label,
      'Awaiting Review',
    );
  assert.equal(
    verificationStatus({ status: 'Upcoming' }, now).label,
    'Expected Cycle',
  );
  assert.equal(
    verificationStatus({ type: 'Internship / job directory' }, now).label,
    'Directory / Evergreen',
  );
  assert.equal(
    verificationStatus({ ...open, status: 'Archived' }, now).label,
    'Archived',
  );
  assert.equal(
    verificationStatus({ ...open, finalDeadline: '2026-11-01' }, now).label,
    'Previous cycle',
  );
  assert.equal(
    verificationStatus({ closed: true, type: 'Job board' }, now).label,
    'Closed',
  );
  // A confirmed future deadline is an expected cycle, never an open
  // application and never "deadline not announced" (MTH-015).
  assert.equal(
    verificationStatus(
      { deadlineConfirmed: true, finalDeadline: '2026-12-01' },
      now,
    ).label,
    'Expected Cycle',
  );
});

test('four hubs preserve browser Back/Forward and keep administration in the role-gated account menu', async () => {
  const w = new Window({ url: 'https://app.example/' });
  try {
    w.document.write(html());
    const rendered = [];
    w.ProspectoTracker = { setView: (view) => rendered.push(view) };
    const nav = installNavigation(w);
    nav.start();
    assert.equal(w.document.querySelectorAll('.main-nav [data-hub]').length, 4);
    assert.equal(HUBS.length, 4);
    nav.navigate('courses');
    nav.navigate('universities');
    assert.equal(w.location.hash, '#universities');
    const length = w.history.length;
    w.history.back();
    await settle();
    assert.equal(w.location.hash, '#courses');
    assert.equal(rendered.at(-1), 'courses');
    w.history.forward();
    await settle();
    assert.equal(rendered.at(-1), 'universities');
    assert.equal(w.history.length, length);
    nav.setAdmin(false);
    assert(w.document.querySelector('[data-admin-only]').hidden);
    nav.setAdmin(true);
    assert(!w.document.querySelector('[data-admin-only]').hidden);
    assert.equal(
      w.document.querySelectorAll('.main-nav [data-view=admin]').length,
      0,
    );
  } finally {
    await w.happyDOM.close();
  }
});

test('sign-in prompts intercept bookmarks at the action, preserve the return view and restore focus', async () => {
  const w = new Window({ url: 'https://app.example/#courses' });
  try {
    w.document.write(html());
    w.ProspectoAuth = { user: null };
    const access = installAccess(w);
    const save = w.document.createElement('button');
    save.dataset.save = 'course';
    save.textContent = 'Bookmark';
    w.document.body.append(save);
    let changed = false;
    save.addEventListener('click', () => {
      changed = true;
    });
    save.focus();
    save.click();
    const dialog = w.document.querySelector('#signin-dialog');
    assert(dialog.open);
    assert.equal(changed, false);
    assert.match(
      dialog.querySelector('[data-login-link]').href,
      /next=%2F%23courses/,
    );
    dialog.close();
    assert.equal(w.document.activeElement, save);
    assert.equal(access.promptSignIn('upload a private document'), false);
  } finally {
    await w.happyDOM.close();
  }
});

test('guest discovery renders across all public hubs without reading or writing owner data; personal actions are gated', async () => {
  const w = new Window({ url: 'https://app.example/' });
  try {
    w.document.write(html());
    const res = response();
    await catalogHandler({ method: 'GET', headers: {} }, res);
    Object.assign(w, {
      PROSPECTO_RESOURCES: res.body.resources,
      PROSPECTO_DEVELOPMENT: res.body.development,
      PROSPECTO_INTELLIGENCE: res.body.intelligence,
      OPPORTUNITIES: res.body.catalog.opportunities,
    });
    let prompts = 0,
      queries = 0;
    w.ProspectoAuth = {
      user: null,
      preview: true,
      gateHTML,
      promptSignIn: () => {
        prompts++;
        return false;
      },
      client: new Proxy(
        {},
        {
          get() {
            queries++;
            throw Error('Guest must not query owner data');
          },
        },
      ),
    };
    w.ProspectoTracker = { setView() {} };
    w.eval(readFileSync('dist/workspace.js', 'utf8'));
    w.eval(readFileSync('dist/intelligence.js', 'utf8'));
    for (const view of [
      'finder',
      'courses',
      'skills',
      'universities',
      'professionals',
      'pathways',
      'locations',
      'funding',
    ]) {
      await w.ProspectoWorkspace.render(view);
      await settle();
      assert(w.document.querySelector('#platform-panel h1'), view);
      assert(
        !/Workspace unavailable|could not load/.test(
          w.document.querySelector('#platform-panel').textContent,
        ),
        view,
      );
    }
    await w.ProspectoWorkspace.render('finder');
    w.document.querySelector('[data-work=quick-plan]').click();
    await settle();
    assert.equal(prompts, 1);
    w.document.querySelector('[data-intel=save]').click();
    await settle();
    assert.equal(prompts, 2);
    await w.ProspectoWorkspace.render('documents');
    assert.match(
      w.document.querySelector('#platform-panel').textContent,
      /Sign in/,
    );
    assert.equal(queries, 0);
  } finally {
    await w.happyDOM.close();
  }
});
