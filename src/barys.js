import { greeting } from './discovery-model.js';
import { escape } from './university-cards.js';

export function guideFor(view) {
  return (
    {
      universities: [
        'Start with what you want to explore.',
        'Filter by location and field, open a profile’s official sources, then compare a few institutions. A research strength is not a promise of admission or lab access.',
      ],
      campus: [
        'Your campus has more than classes.',
        'Choose your university, explore its research and partnership resources, and ask the relevant office about eligibility. We only label an individual listing open when its cycle has been verified.',
      ],
      courses: [
        'Choose one skill you can put to use.',
        'Filter by learning provider, check the cost and syllabus, then save a course or add it to your plan. A finished project helps show what you learned.',
      ],
      finder: [
        'Read the status before the deadline.',
        'Verified Open means the recorded cycle was recently checked. Expected Cycle is preparation only. A Directory / Evergreen resource is not an individual vacancy. Always check the current official source.',
      ],
      plan: [
        'Make the next step small enough to start.',
        'A specific task, a realistic time budget and a useful outcome make progress easier to see. Keep personal details inside your private workspace.',
      ],
    }[view] || [
      'Where would you like to go next?',
      'You can browse opportunities, universities, courses and career pathways freely. Sign in when you want to save a discovery, upload a document or make a personal plan.',
    ]
  );
}

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
  const context = d.createElement('section');
  context.className = 'barys-context';
  context.setAttribute('aria-label', 'Help for this page');
  dialog.querySelector('.barys-actions').before(context);
  const faq = d.createElement('div');
  faq.className = 'barys-faq';
  faq.innerHTML =
    '<h3>A quick question?</h3><button class="text-button" data-barys-question="status">What does “Verified Open” mean?</button><button class="text-button" data-barys-question="privacy">What stays private?</button><button class="text-button" data-barys-question="next">How do I turn an idea into a next step?</button><p id="barys-answer" role="status" aria-live="polite"></p><button class="text-button" data-hide-barys>Hide the floating button for this session</button>';
  dialog.querySelector('.barys-body').append(faq);
  try {
    launcher.hidden =
      w.sessionStorage.getItem('prospecto-barys-hidden') === '1';
  } catch {
    /* Session memory is optional. */
  }
  let returnFocus;
  function open() {
    returnFocus = d.activeElement;
    const [title, text] = guideFor(d.body.dataset.currentView);
    context.innerHTML =
      '<h3>' + escape(title) + '</h3><p>' + escape(text) + '</p>';
    dialog.querySelector('#barys-answer').textContent = '';
    dialog.querySelector('#barys-greeting').textContent =
      greeting() + ' What would you like to move forward?';
    if (w.ProspectoAuth?.user)
      w.ProspectoWorkspace.getState()
        .then((state) => {
          if (dialog.open && dialog.isConnected)
            dialog.querySelector('#barys-greeting').textContent =
              greeting(
                state.preferences?.basic?.name ||
                  w.ProspectoAuth.user.user_metadata?.display_name,
              ) + ' What would you like to move forward?';
        })
        .catch(() => {});
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
      launcher.hidden = false;
      try {
        w.sessionStorage.removeItem('prospecto-barys-hidden');
      } catch {
        /* Optional. */
      }
    }
    if (event.target.closest('[data-close-barys]')) dialog.close();
    const question = event.target.closest('[data-barys-question]');
    if (question)
      dialog.querySelector('#barys-answer').textContent =
        {
          status:
            'The recorded application cycle was verified open within the last 30 days and its deadline has not passed. Dates and eligibility can still change; confirm them at the official source. A directory is not an open application.',
          privacy:
            'Your plans, saved items, uploads and profile are behind sign-in. This built-in guide does not send your documents to an AI model. The separate AI assistant requires sign-in and clearly states when a message is sent.',
          next: 'Choose one resource, read the requirements, and write one task you can finish this week. Open My personal plan to save it after signing in.',
        }[question.dataset.barysQuestion] || '';
    if (event.target.closest('[data-hide-barys]')) {
      dialog.close();
      launcher.hidden = true;
      try {
        w.sessionStorage.setItem('prospecto-barys-hidden', '1');
      } catch {
        /* Optional. */
      }
      d.querySelector('#guide-btn')?.focus();
    }
    const action = event.target.closest('[data-barys-view]');
    if (action) {
      returnFocus = null;
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
