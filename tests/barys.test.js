import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { installBarys } from '../src/barys.js';
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
