import fs from 'fs/promises';
import path from 'path';
import assert from 'node:assert/strict';
import { defineTest, afterEach } from 'node:test';

import 'happy-dom'; // provides global Window and document

// helper to create isolated window for each test
function createWindow() {
  const dom = new Window();
  const win = dom.window;
  globalThis.Window = win;
  globalThis.document = win.document;
  return { dom, win };
}

// Load the theme module into the isolated window
async function loadTheme(win) {
  const code = await fs.readFile(path.join(import.meta.dirname, '../dist/theme.js'), 'utf8');
  const script = new win.Function(code); // run in window scope
  script();
}

defineTest('theme implementation', (t) => {
  let windowHolder;
  afterEach(() => {
    if (windowHolder) {
      windowHolder.dom.dispose(); // clean up
      windowHolder = undefined;
    }
  });

  t.test('stored preference restored', async () => {
    windowHolder = createWindow();
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'dark');
    await loadTheme(win);
    const ev = new win.Event('DOMContentLoaded');
    win.dispatchEvent(ev);
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'dark');
  });

  t.test('manual dark remains dark after OS light change', async () => {
    windowHolder = createWindow();
    const { win } = windowHolder;
    // initial preference dark
    win.localStorage.setItem('prefers-theme', 'dark');
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    // change OS to light
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    mql.matches = false;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'dark');
  });

  t.test('manual light remains light after OS dark change', async () => {
    windowHolder = createWindow();
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'light');
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'light');
  });

  t.test('system mode follows OS changes', async () => {
    windowHolder = createWindow();
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'system');
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'dark');
    // switch to light preference
    win.localStorage.setItem('prefers-theme', 'light');
    const select = win.document.getElementById('theme-select');
    select.value = 'light';
    select.dispatchEvent(new win.Event('change', { bubbles: true }));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'light');
    // OS dark again – should not affect because not system
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'light');
  });

  t.test('repeated switching no duplicate listeners', async () => {
    windowHolder = createWindow();
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'system');
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    const select = win.document.getElementById('theme-select');
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    // toggle twice
    select.value = 'dark';
    select.dispatchEvent(new win.Event('change', { bubbles: true }));
    select.value = 'system';
    select.dispatchEvent(new win.Event('change', { bubbles: true }));
    // Changing OS
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'dark');
  });

  t.test('storage read/write failures are non‑fatal', async () => {
    windowHolder = createWindow();
    const { win } = windowHolder;
    // stub localStorage methods to throw
    const origGet = win.localStorage.getItem;
    const origSet = win.localStorage.setItem;
    win.localStorage.getItem = () => { throw new Error('get fail'); };
    win.localStorage.setItem = () => { throw new Error('set fail'); };
    await loadTheme(win);
    // should still fire event and not throw
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    assert.doesNotThrow(() => {
      const sel = win.document.getElementById('theme-select');
      sel.value = 'dark';
      sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    });
    // restore
    win.localStorage.getItem = origGet;
    win.localStorage.setItem = origSet;
  });
});
