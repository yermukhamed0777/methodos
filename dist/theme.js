/*
 * Theme toggling for ProspectoAI.
 * Supports Light, Dark, System preferences.
 * Persistence via localStorage key 'prefers-theme'.
 * Applies data-theme attribute on document.documentElement.
 */
const PREF_KEY = 'prefers-theme';
const THEME_ATTR = 'data-theme';

function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      root.setAttribute(THEME_ATTR, e.matches ? 'dark' : 'light');
    };
    // Store listener for cleanup
    theme._systemHandler = handler;
    mql.addEventListener('change', handler);
    root.setAttribute(THEME_ATTR, mql.matches ? 'dark' : 'light');
  } else {
    // Remove any previous system listener
    if (theme._systemHandler) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', theme._systemHandler);
      theme._systemHandler = null;
    }
    root.setAttribute(THEME_ATTR, theme);
  }
}

function init() {
  const stored = localStorage.getItem(PREF_KEY);
  const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  setTheme(theme);
  const select = document.getElementById('theme-select');
  if (select) {
    select.value = theme;
    select.addEventListener('change', (e) => {
      try {
        const v = e.target.value;
        setTheme(v === 'system' ? 'system' : v);
        localStorage.setItem(PREF_KEY, v);
      } catch (err) {
        console.warn('Failed to set theme', err);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
