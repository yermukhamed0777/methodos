/*
 * Theme toggling for ProspectoAI.
 * Supports Light, Dark, System preferences.
 * Persistence via localStorage key 'prefers-theme'.
 * Applies data-theme attribute on document.documentElement.
 */
const PREF_KEY = 'prefers-theme';
const THEME_ATTR = 'data-theme';

// Controller state – stored in module scope.
let systemMediaQuery = null;
let systemListener = null;

function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (!systemMediaQuery) {
      systemMediaQuery = mql;
    }
    const handler = (e) => {
      root.setAttribute(THEME_ATTR, e.matches ? 'dark' : 'light');
    };
    // Ensure only one listener
    if (!systemListener) {
      systemListener = handler;
      systemMediaQuery.addEventListener('change', systemListener);
    }
    root.setAttribute(THEME_ATTR, mql.matches ? 'dark' : 'light');
  } else {
    // Remove old OS listener if present
    if (systemListener && systemMediaQuery) {
      systemMediaQuery.removeEventListener('change', systemListener);
      systemListener = null;
      systemMediaQuery = null;
    }
    root.setAttribute(THEME_ATTR, theme);
  }
}

function init() {
  let stored;
  try {
    stored = localStorage.getItem(PREF_KEY);
  } catch (_) {
    stored = null;
  }
  const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  setTheme(theme);
  const select = document.getElementById('theme-select');
  if (select) {
    select.value = theme;
    select.addEventListener('change', (e) => {
      const v = e.target.value;
      setTheme(v === 'system' ? 'system' : v);
      try {
        localStorage.setItem(PREF_KEY, v);
      } catch (_) {
        // ignore persistence errors
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
