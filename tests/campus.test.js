import test from 'node:test';
import assert from 'node:assert/strict';
import { campusOpenings, installCampus } from '../src/campus.js';
import { Window } from 'happy-dom';
test('campus openings require a verified open cycle and exact institution ID', () => {
  const now = new Date('2026-11-16T10:00:00Z');
  const open = {
    kind: 'opportunity',
    universityId: 'uni-a',
    name: 'A',
    status: 'Open',
    openVerified: true,
    checkedOn: '2026-11-15',
    applicationUrl: 'https://example.edu/apply',
    finalDeadline: '2026-12-01',
  };
  const rows = [
    open,
    { ...open, universityId: 'uni-b' },
    { ...open, universityId: null, name: 'uni-a' },
    { ...open, isDirectory: true },
    { ...open, finalDeadline: '2026-11-01' },
  ];
  assert.deepEqual(campusOpenings(rows, 'uni-a', now), [open]);
  assert.deepEqual(campusOpenings(rows, '', now), []);
});
test('campus deep links select exact IDs, remember only after opt-in and can be cleared', async () => {
  const w = new Window({ url: 'https://app.example/?university=uni-a#campus' });
  try {
    w.document.write(
      '<strong id="breadcrumb-title"></strong><section id="platform-panel"></section>',
    );
    w.PROSPECTO_INTELLIGENCE = {
      records: [
        {
          kind: 'university',
          id: 'uni-a',
          name: 'Alpha',
          country: 'HK',
          sources: [],
        },
        { kind: 'university', id: 'uni-b', name: 'Beta', sources: [] },
      ],
    };
    const campus = installCampus(w);
    campus.render();
    assert.equal(w.document.querySelector('#campus-university').value, 'uni-a');
    assert.equal(w.localStorage.getItem('prospecto-campus'), null);
    const remember = w.document.querySelector('#remember-campus');
    remember.checked = true;
    remember.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(w.localStorage.getItem('prospecto-campus'), 'uni-a');
    const picker = w.document.querySelector('#campus-university');
    picker.value = 'uni-b';
    picker.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(
      new URL(w.location.href).searchParams.get('university'),
      'uni-b',
    );
    assert.equal(w.localStorage.getItem('prospecto-campus'), 'uni-b');
    assert.equal(w.document.activeElement.id, 'campus-university');
    w.document.querySelector('#clear-campus').click();
    assert.equal(w.localStorage.getItem('prospecto-campus'), null);
    assert.equal(w.document.querySelector('#campus-university').value, '');
    assert(!w.location.search.includes('university'));
  } finally {
    await w.happyDOM.close();
  }
});
