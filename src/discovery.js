import { greeting, nextSteps } from './discovery-model.js';
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );

export function installDiscovery(w = window) {
  const d = w.document;
  const panel = d.querySelector('#platform-panel');
  const previous = w.ProspectoPlatform.render;
  let homeEpoch = 0;
  w.ProspectoWorkspace.views.push('home');
  function directions() {
    const courses = w.PROSPECTO_RESOURCES?.courses || [];
    const universities = (w.PROSPECTO_INTELLIGENCE?.records || []).filter(
      (r) => r.kind === 'university',
    );
    const cards = [
      [
        '01',
        'Find your next opportunity',
        'Research, competitions and funding. Check eligibility and the current cycle before applying.',
        'finder',
        'Explore opportunities',
      ],
      [
        '02',
        'Find your university',
        'Compare research strengths, campus life and admissions sources without guessing your chances.',
        'universities',
        'Universities & Admissions',
      ],
      [
        '03',
        'Build something you can show',
        'Choose a course, learn a useful skill and turn it into a portfolio project.',
        'courses',
        'Courses & Skills',
      ],
      [
        '04',
        'See where your interests lead',
        'Explore public career stories and possible routes from learning to work.',
        'professionals',
        'Career Pathways',
      ],
    ];
    return `<section class="home-directions" aria-labelledby="directions-title"><div class="section-heading"><div><span class="eyebrow">CHOOSE YOUR DIRECTION</span><h2 id="directions-title">What brings you here today?</h2></div><p>No perfect plan needed. Start with one question.</p></div><div class="direction-grid">${cards.map(([n, title, text, view, label]) => `<article class="direction-card"><span class="direction-number" aria-hidden="true">${n}</span><h3>${title}</h3><p>${text}</p><button class="secondary" data-view="${view}">${label} →</button></article>`).join('')}</div></section><section class="home-proof" aria-label="About the collection"><p><strong>${escape(universities.length)}</strong> university profiles</p><p><strong>${escape(courses.length)}</strong> courses & learning resources</p><p><strong>Official sources</strong> with review dates</p><p><strong>Your workspace</strong> stays private</p></section>`;
  }
  function home() {
    const epoch = ++homeEpoch;
    panel.innerHTML = `<div class="discovery-home"><header class="welcome-hero"><div><span class="eyebrow">YOUR NEXT POSSIBILITY</span><h1>A little curiosity.<br>A world of possibilities.</h1><p>Find the opportunity, university or skill that moves you forward. Start exploring; save your next step when you’re ready.</p><div class="work-actions"><button class="primary" data-view="finder">Find an opportunity →</button><button class="secondary" data-view="universities">Explore universities</button></div></div><figure class="welcome-mascot"><img src="/assets/white-lion.svg" width="160" height="160" alt="BARYS, your white-lion guide"><figcaption>Big possibilities.<br>One small next step.</figcaption></figure></header></div>`;
    d.querySelector('#breadcrumb-title').textContent = 'Start here';
    panel
      .querySelector('.discovery-home')
      .insertAdjacentHTML('beforeend', directions());
    if (w.ProspectoAuth?.user) {
      const slot = d.createElement('section');
      slot.className = 'home-continuation';
      slot.setAttribute('aria-label', 'Your next steps');
      slot.innerHTML =
        '<h2>' +
        escape(greeting()) +
        '</h2><p>Bringing your next steps together…</p>';
      panel.querySelector('.welcome-hero').after(slot);
      w.ProspectoWorkspace.getState()
        .then((state) => {
          if (!slot.isConnected || epoch !== homeEpoch) return;
          const name =
            state.preferences?.basic?.name ||
            w.ProspectoAuth.user.user_metadata?.display_name ||
            '';
          const steps = nextSteps(state);
          slot.innerHTML = `<div class="section-heading"><div><span class="eyebrow">A SPACE FOR YOUR NEXT STEP</span><h2>${escape(greeting(name))}</h2><p>How’s your day? Pick one thing you’d like to move forward.</p></div><button class="secondary" data-view="dashboard">My workspace →</button></div>${steps.length ? `<ul class="next-step-list">${steps.map((item) => `<li><strong>${escape(item.title)}</strong><span>${escape(item.due_date || 'No date set')} · ${escape(item.state)}</span></li>`).join('')}</ul><button class="text-button" data-view="plan">Open my planner →</button>` : '<p>No active plan tasks yet. One small step is enough to begin.</p><button class="secondary" data-view="plan">Make my first plan</button>'}`;
        })
        .catch(() => {
          if (slot.isConnected)
            slot.innerHTML =
              '<h2>' +
              escape(greeting()) +
              '</h2><p>Your saved steps could not sync. Your existing work is retained.</p><button class="secondary" data-view="dashboard">Open workspace to retry</button>';
        });
    }
  }
  w.ProspectoPlatform.render = (view) => {
    if (view === 'home') home();
    else previous(view);
  };
  return { escape, home };
}
