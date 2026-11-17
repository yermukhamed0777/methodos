import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { guidePlan } from '../src/guide-intent.js';
import { navigationFor } from '../lib/assistant.js';
import { installBarys } from '../src/barys.js';

test('the local guide routes account, private and public requests to known views', () => {
  assert.equal(guidePlan('I forgot my password').action, 'reset');
  assert.equal(guidePlan('I need to reset my password').action, 'reset');
  assert.equal(
    guidePlan('My confirmation email never arrived').action,
    'confirm',
  );
  assert.equal(
    guidePlan('How do I authorize access to my account?').action,
    'signin',
  );
  const saved = guidePlan('Show my saved tracker');
  assert.equal(saved.view, 'saved');
  assert.equal(saved.requiresAuth, true);
  const finder = guidePlan('Find hackathons for students');
  assert.equal(finder.view, 'finder');
  assert.equal(finder.requiresAuth, false);
  assert.equal(guidePlan('Explore my current university').view, 'campus');
  assert.equal(guidePlan('singing in the rain').kind, 'unknown');
  assert.deepEqual(
    navigationFor([
      { kind: 'course' },
      { kind: 'course' },
      { kind: 'university' },
      { kind: 'unknown' },
    ]),
    [
      { view: 'courses', label: 'Courses' },
      { view: 'universities', label: 'Universities' },
    ],
  );
});

test('BARYS turns a question into a working account or navigation action', async () => {
  const w = new Window({ url: 'https://app.example/' });
  try {
    w.document.write(
      '<main tabindex="-1"></main><button id="guide-btn">Guide</button>',
    );
    const visited = [],
      prompted = [];
    w.ProspectoNavigation = {
      navigate: (view) => {
        visited.push(view);
      },
    };
    w.ProspectoAuth = {
      promptSignIn: (purpose) => prompted.push(purpose),
    };
    w.ProspectoWorkspace = {
      getState: async () => ({ preferences: { basic: {} } }),
    };
    const barys = installBarys(w);
    const ask = (question) => {
      w.document.querySelector('#barys-ask-input').value = question;
      w.document
        .querySelector('#barys-ask-form')
        .dispatchEvent(
          new w.Event('submit', { bubbles: true, cancelable: true }),
        );
    };
    barys.open();
    ask('I forgot my password');
    assert.match(
      w.document.querySelector('#barys-plan').textContent,
      /Reset your password/,
    );
    assert.equal(
      w.document.querySelector('#barys-plan a').getAttribute('href'),
      '/reset-password',
    );
    ask('show my saved tracker');
    const access = w.document.querySelector('[data-barys-access]');
    assert.equal(access.dataset.barysAccess, 'saved');
    access.click();
    assert.deepEqual(visited, ['saved']);
    assert.match(prompted[0], /Tracker/);
    assert(!w.document.querySelector('#barys-dialog').open);

    w.ProspectoAuth.user = { id: 'signed-in' };
    barys.open();
    ask('find hackathons');
    w.document.querySelector('[data-barys-view]').click();
    assert.deepEqual(visited, ['saved', 'finder']);

    barys.open();
    ask('help me plan what to learn next');
    w.document.querySelector('[data-barys-ai]').click();
    assert.equal(
      w.sessionStorage.getItem('prospecto-ai-prefill'),
      'help me plan what to learn next',
    );
    assert.deepEqual(visited, ['saved', 'finder', 'assistant']);
    barys.destroy();
  } finally {
    await w.happyDOM.close();
  }
});
