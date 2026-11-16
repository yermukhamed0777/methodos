export const HUBS = [
  {
    id: 'explore',
    label: 'Explore',
    view: 'finder',
    items: [
      ['finder', 'Opportunities'],
      ['universities', 'Universities & Admissions'],
      ['campus', 'At my university'],
      ['funding', 'Funding'],
      ['locations', 'Location guides'],
      ['whats-new', 'Recently reviewed'],
      ['latest', 'Source leads'],
    ],
  },
  {
    id: 'learn',
    label: 'Courses & Skills',
    view: 'courses',
    items: [
      ['courses', 'Courses'],
      ['skills', 'Skills'],
      ['projects', 'Portfolio projects'],
      ['research', 'Research ideas'],
    ],
  },
  {
    id: 'career',
    label: 'Career Pathways',
    view: 'professionals',
    items: [
      ['professionals', 'Public profiles & pathways'],
      ['pathways', 'Learning routes'],
      ['careers', 'Career directories'],
      ['cv-library', 'CV examples'],
    ],
  },
  {
    id: 'workspace',
    label: 'My Workspace',
    view: 'dashboard',
    items: [
      ['dashboard', 'Overview'],
      ['plan', 'Planner'],
      ['saved', 'Tracker'],
      ['deadlines', 'Deadlines'],
      ['documents', 'Documents'],
      ['admissions-folders', 'Admissions folders'],
      ['saved-library', 'Saved library'],
      ['activities', 'Activities'],
      ['assistant', 'AI assistant'],
    ],
  },
];
export const PRIVATE_VIEWS = new Set([
  'dashboard',
  'plan',
  'saved',
  'deadlines',
  'documents',
  'admissions-folders',
  'saved-library',
  'activities',
  'assistant',
  'profile',
  'privacy',
  'onboarding',
  'comparison',
  'admin',
  'sources',
]);
export function hubFor(view) {
  if (view === 'home') return HUBS[0];
  return HUBS.find((h) => h.items.some(([v]) => v === view)) || HUBS[3];
}
const paths = {
  '/home': 'home',
  '/admissions': 'universities',
  '/professional-pathways': 'professionals',
  '/research': 'research',
  '/funding': 'funding',
  '/my-plan': 'plan',
  '/system-health': 'admin',
  '/dashboard': 'dashboard',
  '/search': 'finder',
};
const aliases = { explore: 'finder' };
export function installNavigation(w = window) {
  const d = w.document;
  let admin = false;
  const valid = new Set([
    ...HUBS.flatMap((h) => h.items.map(([v]) => v)),
    'profile',
    'privacy',
    'onboarding',
    'comparison',
    'admin',
    'sources',
    'explore',
    'home',
  ]);
  const current = () =>
    aliases[w.location.hash.slice(1)] ||
    (valid.has(w.location.hash.slice(1))
      ? w.location.hash.slice(1)
      : paths[w.location.pathname] ||
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
