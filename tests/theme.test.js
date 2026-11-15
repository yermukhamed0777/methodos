import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup a DOM environment using happy-dom.
await import('happy-dom');

// Read the theme script.
const themePath = path.join(import.meta.dirname, '../dist/theme.js');
const themeSrc = await fs.readFile(themePath, 'utf8');

// Wrap the script in a Function so it executes in the global scope.
const runScript = new Function(themeSrc);

describe('theme implementation', () => {
  beforeEach(() => {
    // Reset the DOM and localStorage before each test.
    document.body.innerHTML = '';
    localStorage.clear();
    // Add a minimal select element for theme switching.
    const select = document.createElement('select');
    select.id = 'theme-select';
    select.innerHTML = `<option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>`;
    document.body.appendChild(select);
  });

  test('applies stored theme on init', () => {
    localStorage.setItem('prefers-theme', 'dark');
    runScript();
    // Trigger DOMContentLoaded which will call init.
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('switches theme via select and persists', () => {
    runScript();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const select = document.getElementById('theme-select');
    // Simulate user choosing 'Dark'.
    select.value = 'dark';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('prefers-theme')).toBe('dark');
  });

  test('system mode follows media query changes and removes listeners', () => {
    runScript();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const select = document.getElementById('theme-select');
    select.value = 'system';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    // Simulate media query change to dark.
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.matches = true;
    mql.dispatchEvent(new Event('change'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    // Switch to another theme; system listener should be removed.
    select.value = 'light';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    // Changing media query should no longer affect theme.
    mql.matches = false;
    mql.dispatchEvent(new Event('change'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('graceful handling of storage failure', () => {
    // Mock setItem to throw.
    const originalSet = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('failed'); };
    runScript();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const select = document.getElementById('theme-select');
    // Try changing theme; should not throw.
    expect(() => {
      select.value = 'dark';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }).not.toThrow();
    // Restore original function.
    localStorage.setItem = originalSet;
  });
});
