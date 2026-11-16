import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { installBarys, guideFor } from '../src/barys.js';
test('BARYS opens on demand, restores focus and uses existing navigation for private actions', async () => {
  const w = new Window({ url: 'https://app.example/' });
  try {
    w.document.write('<button id="guide-btn">How this works</button>');
    let view;
    w.ProspectoNavigation = {
      navigate: (v) => {
        view = v;
      },
    };
    const barys = installBarys(w),
      button = w.document.querySelector('.barys-launcher'),
      dialog = w.document.querySelector('#barys-dialog');
    assert(!dialog.open);
    button.focus();
    button.click();
    assert(dialog.open);
    assert.equal(
      w.document.activeElement.getAttribute('aria-label'),
      'Close BARYS',
    );
    w.document.querySelector('[data-close-barys]').click();
    assert.equal(w.document.activeElement, button);
    w.document.querySelector('#guide-btn').click();
    assert(dialog.open);
    w.document.querySelector('[data-barys-view=plan]').click();
    assert.equal(view, 'plan');
    assert(!dialog.open);
    assert.match(dialog.textContent, /without AI/);
    barys.destroy();
    assert.equal(w.document.querySelector('#barys-dialog'), null);
  } finally {
    await w.happyDOM.close();
  }
});
test('BARYS explains the current page and hiding it keeps the sidebar reopen path', async () => {
  const w = new Window({ url: 'https://app.example/' });
  try {
    w.document.write('<button id="guide-btn">How this works</button>');
    w.document.body.dataset.currentView = 'campus';
    const barys = installBarys(w);
    barys.open();
    assert.match(
      w.document.querySelector('.barys-context').textContent,
      /more than classes/,
    );
    w.document.querySelector('[data-barys-question=status]').click();
    assert.match(
      w.document.querySelector('#barys-answer').textContent,
      /30 days/,
    );
    w.document.querySelector('[data-hide-barys]').click();
    assert(w.document.querySelector('.barys-launcher').hidden);
    assert.equal(w.sessionStorage.getItem('prospecto-barys-hidden'), '1');
    w.document.querySelector('#guide-btn').click();
    assert(!w.document.querySelector('.barys-launcher').hidden);
    assert(w.document.querySelector('#barys-dialog').open);
    assert.match(guideFor('courses')[1], /syllabus/);
  } finally {
    await w.happyDOM.close();
  }
});
