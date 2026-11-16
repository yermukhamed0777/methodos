/* Browser theme controller: apply before paint; bind controls once the DOM exists. */
(function installTheme(w) {
  if (w.ProspectoTheme) return;
  const d = w.document,
    key = 'prefers-theme';
  const valid = (value) =>
    ['light', 'dark', 'system'].includes(value) ? value : 'system';
  let mode,
    media,
    listening = false,
    select = null;
  try {
    media = w.matchMedia('(prefers-color-scheme: dark)');
  } catch {
    media = null;
  }
  function render() {
    const resolved =
      mode === 'system' ? (media?.matches ? 'dark' : 'light') : mode;
    d.documentElement.setAttribute('data-theme', resolved);
    const meta = d.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'dark' ? '#0b1018' : '#f5f7fb';
    if (select) select.value = mode;
  }
  function osChanged() {
    if (mode === 'system') render();
  }
  function unsubscribe() {
    if (!listening) return;
    if (media?.removeEventListener)
      media.removeEventListener('change', osChanged);
    else media?.removeListener?.(osChanged);
    listening = false;
  }
  function setMode(value, persist = true) {
    mode = valid(value);
    if (mode === 'system' && !listening && media) {
      if (media.addEventListener) media.addEventListener('change', osChanged);
      else media.addListener?.(osChanged);
      listening = true;
    } else if (mode !== 'system') unsubscribe();
    render();
    if (persist) {
      try {
        w.localStorage.setItem(key, mode);
      } catch {
        /* Device storage is optional. */
      }
    }
  }
  function changed(event) {
    setMode(event.target.value);
  }
  function bind() {
    const next = d.getElementById('theme-select');
    if (next === select) return;
    select?.removeEventListener('change', changed);
    select = next;
    select?.addEventListener('change', changed);
    render();
  }
  w.ProspectoTheme = {
    setMode,
    getMode: () => mode,
    destroy() {
      unsubscribe();
      select?.removeEventListener('change', changed);
      d.removeEventListener('DOMContentLoaded', bind);
      delete w.ProspectoTheme;
    },
  };
  let stored;
  try {
    stored = w.localStorage.getItem(key);
  } catch {
    /* Keep the system default. */
  }
  setMode(stored, false);
  if (d.readyState === 'loading')
    d.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})(window);
