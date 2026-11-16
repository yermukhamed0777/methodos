import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createBootStatus } from '../src/boot-status.js';

test('bootstrap success hides the loader and releases the busy state', async () => {
  const w = new Window();
  try {
    w.document.body.innerHTML =
      '<div id="boot-status" role="status"><div class="spinner"></div></div>';
    const status = createBootStatus(w.document, () => {});
    assert.equal(w.document.body.getAttribute('aria-busy'), 'true');
    status.complete();
    status.complete();
    assert.equal(w.document.body.getAttribute('aria-busy'), 'false');
    assert(w.document.querySelector('#boot-status').hidden);
  } finally {
    await w.happyDOM.close();
  }
});

test('failed loading replaces animation with escaped error text and one working retry', async () => {
  const w = new Window();
  try {
    w.document.body.innerHTML =
      '<div id="boot-status"><div class="spinner"></div></div>';
    let retries = 0;
    const status = createBootStatus(w.document, () => retries++);
    status.complete();
    status.fail(Error('<img src=x onerror=bad()>'));
    status.fail(Error('<img src=x onerror=bad()>'));
    const element = w.document.querySelector('#boot-status');
    assert.equal(element.hidden, false);
    assert.equal(element.getAttribute('role'), 'alert');
    assert.equal(w.document.body.getAttribute('aria-busy'), 'false');
    assert.equal(element.querySelectorAll('img,.spinner').length, 0);
    assert.equal(element.querySelectorAll('button').length, 1);
    assert.match(element.textContent, /<img/);
    element.querySelector('button').click();
    assert.equal(retries, 1);
  } finally {
    await w.happyDOM.close();
  }
});
