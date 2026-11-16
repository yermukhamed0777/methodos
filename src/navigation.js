import { HUBS, PATH_VIEWS, SAFE_HASH_VIEWS } from './view-registry.js';

export { HUBS, PRIVATE_VIEWS } from './view-registry.js';
export function hubFor(view) {
  if (view === 'home') return HUBS[0];
  return HUBS.find((h) => h.items.some(([v]) => v === view)) || HUBS[3];
}
const aliases = { explore: 'finder' };
export function installNavigation(w = window) {
  const d = w.document;
  let admin = false;
  const valid = SAFE_HASH_VIEWS;
  const current = () =>
    aliases[w.location.hash.slice(1)] ||
    (valid.has(w.location.hash.slice(1))
      ? w.location.hash.slice(1)
      : PATH_VIEWS[w.location.pathname] ||
        (new URL(w.location.href).searchParams.has('opportunity')
          ? 'finder'
          : 'home'));
  function paint(view) {
    const hub = hubFor(view);
    d.body.dataset.currentView = view;
    d.body.dataset.hub = hub.id;
    d.querySelector('[data-home-link]')?.setAttribute(
      'aria-current',
      view === 'home' ? 'page' : 'false',
    );
    d.querySelectorAll('.main-nav [data-hub]').forEach((el) => {
      const active = view !== 'home' && el.dataset.hub === hub.id;
      el.classList.toggle('active', active);
      el.setAttribute('aria-current', active ? 'page' : 'false');
    });
    const tabs = d.querySelector('#hub-navigation');
    if (tabs) tabs.hidden = view === 'home';
    if (tabs)
      tabs.innerHTML = hub.items
        .map(
          ([v, label]) =>
            `<button type="button" data-view="${v}" class="hub-tab ${v === view ? 'active' : ''}" ${v === view ? 'aria-current="page"' : ''}>${label}</button>`,
        )
        .join('');
    d.querySelectorAll('#account-menu [data-admin-only]').forEach((el) => {
      el.hidden = !admin;
    });
    d.querySelectorAll('button[data-view]').forEach((el) => {
      if (el.dataset.view === 'admin') el.hidden = !admin;
    });
    const menu = d.querySelector('#account-menu');
    tabs
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (menu) menu.hidden = true;
    d.querySelector('#account-button')?.setAttribute('aria-expanded', 'false');
  }
  function navigate(next, { push = true, focus = true } = {}) {
    const view = aliases[next] || (valid.has(next) ? next : 'finder');
    if (push && current() !== view) {
      const url = new URL(w.location.href);
      url.hash = view;
      url.searchParams.delete('opportunity');
      if (view !== 'campus') {
        url.searchParams.delete('university');
        url.searchParams.delete('campus-category');
      }
      w.history.pushState({ view }, '', url.pathname + url.search + url.hash);
    }
    w.ProspectoTracker?.setView(view);
    paint(view);
    if (focus) {
      w.scrollTo({ top: 0, behavior: 'instant' });
      const main = d.querySelector('main');
      main?.focus({ preventScroll: true });
    }
  }
  d.addEventListener(
    'click',
    (e) => {
      const target = e.target.closest('[data-view]');
      if (!target) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      navigate(target.dataset.view);
      d.body.classList.remove('navigation-open');
      const backdrop = d.querySelector('#nav-backdrop');
      if (backdrop) backdrop.hidden = true;
      d.querySelector('#nav-toggle')?.setAttribute('aria-expanded', 'false');
      const shell = d.querySelector('.main-shell');
      if (shell) shell.inert = false;
      const sidebar = d.querySelector('#workspace-navigation');
      sidebar?.removeAttribute('role');
      sidebar?.removeAttribute('aria-modal');
      if (sidebar && w.innerWidth <= 900) sidebar.inert = true;
    },
    true,
  );
  w.addEventListener('popstate', () => navigate(current(), { push: false }));
  w.addEventListener('hashchange', () => {
    if (valid.has(w.location.hash.slice(1)))
      navigate(current(), { push: false });
  });
  const api = {
    navigate,
    current,
    hubFor,
    setAdmin(value) {
      admin = value === true;
      paint(current());
    },
    start() {
      navigate(current(), { push: false, focus: false });
    },
  };
  w.ProspectoNavigation = api;
  return api;
}
