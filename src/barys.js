import { greeting } from './discovery-model.js';
import { escape } from './university-cards.js';

export function installBarys(w = window) {
  const d = w.document;
  const launcher = d.createElement('button');
  launcher.type = 'button';
  launcher.className = 'barys-launcher';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-controls', 'barys-dialog');
  launcher.innerHTML =
    '<img src="/assets/white-lion.svg" width="40" height="40" alt=""><span>Ask BARYS</span>';
  const dialog = d.createElement('dialog');
  dialog.id = 'barys-dialog';
  dialog.className = 'barys-dialog';
  dialog.setAttribute('aria-labelledby', 'barys-title');
  dialog.innerHTML = `<header class="barys-header"><img src="/assets/white-lion.svg" width="64" height="64" alt=""><div><span class="eyebrow">YOUR WHITE-LION GUIDE</span><h2 id="barys-title">Hi, I’m BARYS.</h2></div><button type="button" class="text-button" data-close-barys aria-label="Close BARYS">×</button></header><div class="barys-body"><p id="barys-greeting">${escape(greeting())} What would you like to move forward?</p><p>I can help you find your way around ProspectoAI. Choose a direction and we’ll take one small step.</p><div class="barys-actions">${[
    ['finder', 'Find an opportunity'],
    ['universities', 'Choose a university'],
    ['campus', 'Explore my current university'],
    ['courses', 'Learn a useful skill'],
    ['plan', 'Open my personal plan'],
  ]
    .map(
      ([view, label]) =>
        `<button class="secondary" data-barys-view="${view}">${label} →</button>`,
    )
    .join(
      '',
    )}</div><p class="resource-note">Built-in guidance works without AI. Your private workspace still requires sign-in.</p><button class="text-button" data-barys-view="assistant">Open the AI assistant (sign-in required) →</button></div>`;
  d.body.append(launcher, dialog);
  let returnFocus;
  function open() {
    returnFocus = d.activeElement;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-close-barys]').focus();
  }
  function clicked(event) {
    if (
      event.target.closest(
        '.barys-launcher,[data-open-barys],#guide-btn,#footer-guide',
      )
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      open();
    }
    if (event.target.closest('[data-close-barys]')) dialog.close();
    const action = event.target.closest('[data-barys-view]');
    if (action) {
      dialog.close();
      w.ProspectoNavigation.navigate(action.dataset.barysView);
    }
  }
  d.addEventListener('click', clicked, true);
  dialog.addEventListener(
    'close',
    () => returnFocus?.isConnected && returnFocus.focus(),
  );
  return {
    open,
    destroy() {
      d.removeEventListener('click', clicked, true);
      launcher.remove();
      dialog.remove();
    },
  };
}
