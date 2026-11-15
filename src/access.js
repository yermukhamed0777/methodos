import { safeNext } from './auth-flow.js';
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export function gateHTML(purpose = 'your private workspace') {
  return `<section class="access-gate work-empty"><span class="eyebrow">YOUR NEXT STEP, SAVED</span><h1>A workspace of your own.</h1><p>Sign in to use ${escape(purpose)}. Keep your saved opportunities, plans and documents private and available across devices.</p><div class="work-actions"><button class="primary" data-signin>Sign in or create an account</button><button class="secondary" data-view="finder">Keep exploring</button></div><p class="resource-note">Browsing courses, pathways and admissions guides is open to everyone.</p></section>`;
}
export function installAccess(w = window) {
  const d = w.document;
  let returnFocus;
  function promptSignIn(purpose = 'save your next step') {
    const dialog = d.querySelector('#signin-dialog');
    if (!dialog) return false;
    returnFocus = d.activeElement;
    const next = safeNext(w.location.href, w.location.origin);
    dialog.querySelector('[data-login-link]').href =
      '/login?next=' + encodeURIComponent(next);
    dialog.querySelector('[data-signin-purpose]').textContent =
      `Sign in to ${purpose}. Your saved work stays private.`;
    if (!dialog.open) dialog.showModal();
    return false;
  }
  d.addEventListener(
    'click',
    (e) => {
      if (e.target.closest('[data-signin]')) {
        e.preventDefault();
        promptSignIn();
      }
      if (e.target.closest('[data-close-signin]'))
        d.querySelector('#signin-dialog')?.close();
      if (
        !w.ProspectoAuth?.user &&
        e.target.closest(
          '[data-save], [data-add-task], [data-progress], #import-backup, #export-backup',
        )
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        promptSignIn('save and manage your opportunities');
      }
    },
    true,
  );
  d.querySelector('#signin-dialog')?.addEventListener('close', () =>
    returnFocus?.focus(),
  );
  return { promptSignIn, gateHTML };
}
