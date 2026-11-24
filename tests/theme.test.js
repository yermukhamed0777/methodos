import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
const code = readFileSync(new URL('../dist/theme.js', import.meta.url), 'utf8');
async function fixture(
  run,
  { stored, readFails = false, writeFails = false, dark = false } = {},
) {
  const w = new Window({ url: 'https://app.example/' });
  const listeners = new Set();
  let writes = 0;
  const media = {
    matches: dark,
    addEventListener(type, fn) {
      if (type === 'change') listeners.add(fn);
    },
    removeEventListener(type, fn) {
      if (type === 'change') listeners.delete(fn);
    },
  };
  w.matchMedia = () => media;
  const storage = {
    getItem() {
      if (readFails) throw Error('Storage denied');
      return stored;
    },
    setItem() {
      writes++;
      if (writeFails) throw Error('Storage denied');
    },
  };
  Object.defineProperty(w, 'localStorage', {
    configurable: true,
    value: storage,
  });
  w.document.write(
    '<meta name="theme-color"><select id="theme-select"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select>',
  );
  const choose = (value) => {
    const select = w.document.getElementById('theme-select');
    select.value = value;
    select.dispatchEvent(new w.Event('change'));
  };
  const emit = (matches) => {
    media.matches = matches;
    for (const listener of [...listeners]) listener({ matches });
  };
  try {
    w.eval(code);
    w.document.dispatchEvent(
      new w.Event('DOMContentLoaded', { bubbles: true }),
    );
    await run({
      w,
      listeners,
      choose,
      emit,
      writes: () => writes,
      resolved: () => w.document.documentElement.dataset.theme,
    });
  } finally {
    w.ProspectoTheme?.destroy();
    await w.happyDOM.close();
  }
}
test('theme applies a stored preference immediately, before controls are ready', () =>
  fixture(
    ({ w, resolved }) => {
      assert.equal(resolved(), 'dark');
      assert.equal(w.document.querySelector('meta').content, '#0b0b0a');
    },
    { stored: 'dark' },
  ));
test('System follows both directions of the same browser media query', () =>
  fixture(({ emit, resolved, listeners }) => {
    assert.equal(listeners.size, 1);
    emit(true);
    assert.equal(resolved(), 'dark');
    emit(false);
    assert.equal(resolved(), 'light');
  }));
for (const [mode, opposite] of [
  ['dark', false],
  ['light', true],
]) {
  test('System to manual ' + mode + ' removes the actual OS listener', () =>
    fixture(({ choose, emit, listeners, resolved }) => {
      choose(mode);
      assert.equal(listeners.size, 0);
      emit(opposite);
      assert.equal(resolved(), mode);
    }),
  );
}
test('repeated installation and DOM-ready events never duplicate handlers', () =>
  fixture(({ w, choose, writes, listeners }) => {
    w.eval(code);
    w.document.dispatchEvent(
      new w.Event('DOMContentLoaded', { bubbles: true }),
    );
    w.dispatchEvent(new w.Event('DOMContentLoaded'));
    choose('dark');
    assert.equal(writes(), 1);
    assert.equal(listeners.size, 0);
    choose('system');
    choose('system');
    assert.equal(listeners.size, 1);
  }));
test('storage read failure retains a usable controller and selector', () =>
  fixture(
    ({ choose, resolved }) => {
      choose('dark');
      assert.equal(resolved(), 'dark');
    },
    { readFails: true },
  ));
test('storage write failure preserves the selected manual theme', () =>
  fixture(
    ({ choose, resolved, writes }) => {
      choose('dark');
      assert.equal(resolved(), 'dark');
      assert.equal(writes(), 1);
    },
    { writeFails: true },
  ));
test('invalid stored values use the OS theme and destruction releases listeners', () =>
  fixture(
    ({ w, resolved, listeners }) => {
      assert.equal(resolved(), 'dark');
      assert.equal(w.ProspectoTheme.getMode(), 'system');
      w.ProspectoTheme.destroy();
      assert.equal(listeners.size, 0);
    },
    { stored: 'invalid', dark: true },
  ));
