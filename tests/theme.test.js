import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

// happy-dom provides a DOM implementation for the test harness
import { Window } from 'happy-dom';

// Utility to set up a fresh Window for each test
function createWindow() {
  const dom = new Window();
  const win = dom.window;
  // expose globals required by the module under test
  globalThis.window = win;
  globalThis.document = win.document;
  // minimal DOM containing the theme selector used by the module
  win.document.body.innerHTML = `<select id="theme-select" class="theme-select"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select>`;
  // Simple matchMedia stub that allows mutable .matches and event handlers
  win.matchMedia = (query) => {
    const mql = {
      matches: false,
      media: query,
      listeners: [],
      addEventListener(type, fn) {
        if (type === 'change') this.listeners.push(fn);
      },
      removeEventListener(type, fn) {
        if (type === 'change')
          this.listeners = this.listeners.filter((h) => h !== fn);
      },
      dispatchEvent(ev) {
        if (ev.type === 'change') this.listeners.forEach((fn) => fn(ev));
      },
    };
    return mql;
  };
  // expose mock for Node test harness
  globalThis.__mockMatchMedia = win.matchMedia;
  return { dom, win };
}

// Load the theme module into the isolated window
async function loadTheme(win) {
  const code = fs.readFileSync('dist/theme.js', 'utf8');
  win.eval(code);
}

test('theme implementation', async (t) => {
  let windowHolder;
  beforeEach(() => {
    // Setup a clean window before each test
    windowHolder = createWindow();
  });
  afterEach(() => {
    if (windowHolder) {
      // happy-dom instances do not expose a dispose method; allow GC
      windowHolder = undefined;
    }
  });

  t.test('stored preference restored', async () => {
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'dark');
    await loadTheme(win);
    win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
    assert.strictEqual(
      win.document.documentElement.getAttribute('data-theme'),
      'dark',
    );
  });

  t.test('manual dark remains dark after OS light change', async () => {
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'dark');
    await loadTheme(win);
    win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
    const mql = globalThis.__mockMatchMedia('(prefers-color-scheme: dark)');
    mql.matches = false;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(
      win.document.documentElement.getAttribute('data-theme'),
      'dark',
    );
  });

  t.test('manual light remains light after OS dark change', async () => {
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'light');
    await loadTheme(win);
    win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
    const mql = globalThis.__mockMatchMedia('(prefers-color-scheme: dark)');
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(
      win.document.documentElement.getAttribute('data-theme'),
      'light',
    );
  });

  t.test('system mode follows OS changes', async () => {
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'system');
    await loadTheme(win);
    win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
    const mql = win.__themeAPI.getSystemMql();
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(
      win.document.documentElement.getAttribute('data-theme'),
      'dark',
    );
  });

  t.test('listener cleanup on manual switch', async () => {
    const { win } = windowHolder;
    win.localStorage.setItem('prefers-theme', 'system');
    await loadTheme(win);
    win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
    const select = win.document.getElementById('theme-select');
    select.value = 'light';
    select.dispatchEvent(new win.Event('change', { bubbles: true }));
    const mql = globalThis.__mockMatchMedia('(prefers-color-scheme: dark)');
    mql.matches = true;
    mql.dispatchEvent(new win.Event('change'));
    assert.strictEqual(
      win.document.documentElement.getAttribute('data-theme'),
      'light',
    );
  });

  t.test('storage read/write failures are non-fatal', async () => {
    const { win } = windowHolder;
    const originalGet = win.localStorage.getItem;
    const originalSet = win.localStorage.setItem;
    win.localStorage.getItem = () => {
      throw new Error('get fail');
    };
    win.localStorage.setItem = () => {
      throw new Error('set fail');
    };
    await loadTheme(win);
    win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
    assert.doesNotThrow(() => {
      const sel = win.document.getElementById('theme-select');
      sel.value = 'dark';
      sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    });
    win.localStorage.getItem = originalGet;
    win.localStorage.setItem = originalSet;
  });
});
