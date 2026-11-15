import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// happy-dom provides a DOM implementation for the test harness
import 'happy-dom';

// Utility to set up a fresh Window for each test
function createWindow() {
  const dom = new Window();
  const win = dom.window;
  // expose globals required by the module under test
  globalThis.Window = win;
  globalThis.document = win.document;
  return { dom, win };
}

// Load the theme module into the isolated window
async function loadTheme(win) {
  const code = await import(`../dist/theme.js`, { assert: { type: 'module' } });
  // The module registers itself on DOMContentLoaded internally
}

test('theme implementation', async (t) => {
  let windowHolder;
  beforeEach(() => {
    // Setup a clean window before each test
    windowHolder = createWindow();
  });
  afterEach(() => {
    if (windowHolder) {
      windowHolder.dom.dispose();
      windowHolder = undefined;
    }
  });

  t.test('stored preference restored', async () => {
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'dark');
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'dark');
  });

  t.test('manual dark remains dark after OS light change', async () => {
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'dark');
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    mql.matches = false;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'dark');
  });

  t.test('manual light remains light after OS dark change', async () => {
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
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'system');
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'dark');
  });

  t.test('listener cleanup on manual switch', async () => {
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'system');
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    const select = win.document.getElementById('theme-select');
    select.value = 'light';
    select.dispatchEvent(new win.Event('change', { bubbles: true }));
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(win.document.documentElement.getAttribute('data-theme'), 'light');
  });

  t.test('storage read/write failures are non-fatal', async () => {
    const { win } = windowHolder;
    const originalGet = win.localStorage.getItem;
    const originalSet = win.localStorage.setItem;
    win.localStorage.getItem = () => { throw new Error('get fail'); };
    win.localStorage.setItem = () => { throw new Error('set fail'); };
    await loadTheme(win);
    win.dispatchEvent(new win.Event('DOMContentLoaded'));
    assert.doesNotThrow(() => {
      const sel = win.document.getElementById('theme-select');
      sel.value = 'dark';
      sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    });
    win.localStorage.getItem = originalGet;
    win.localStorage.setItem = originalSet;
  });
});
