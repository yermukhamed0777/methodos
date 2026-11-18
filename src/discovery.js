import {
  greeting,
  nextSteps,
  recentSource,
  needsSetup,
  deadlineRadar,
} from './discovery-model.js';
import { officialLink } from './university-cards.js';
import { installCampus } from './campus.js';
import { installBarys } from './barys.js';
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
  const campus = installCampus(w);
  installBarys(w);
  w.ProspectoWorkspace.views.push('home', 'campus');
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
      [
        '05',
        'Already at university?',
        'Discover research, exchanges and careers resources inside your own university.',
        'campus',
        'Explore my campus',
      ],
    ];
    return `<section class="home-directions" aria-labelledby="directions-title"><div class="section-heading"><div><span class="eyebrow">CHOOSE YOUR DIRECTION</span><h2 id="directions-title">What brings you here today?</h2></div><p>No perfect plan needed. Start with one question.</p></div><div class="direction-grid">${cards.map(([n, title, text, view, label]) => `<article class="direction-card"><span class="direction-number" aria-hidden="true">${n}</span><h3>${title}</h3><p>${text}</p><button class="secondary" data-view="${view}">${label} →</button></article>`).join('')}</div></section><section class="home-proof" aria-label="About the collection"><p><strong>${escape(universities.length)}</strong> university profiles</p><p><strong>${escape(courses.length)}</strong> courses & learning resources</p><p><strong>Official sources</strong> with review dates</p><p><strong>Your workspace</strong> stays private</p></section>`;
  }
  function accessGuide() {
    return `<section class="home-access" aria-labelledby="access-title"><div class="section-heading"><div><span class="eyebrow">OPEN TO EXPLORE, PRIVATE TO SAVE</span><h2 id="access-title">What you can do right now</h2></div><p>No account needed to browse the collection.</p></div><div class="access-grid"><article class="glass-card"><h3>Explore freely</h3><ul><li>Compare opportunities and university research profiles</li><li>Browse courses, skills and career routes</li><li>Ask BARYS to guide you to the right place</li></ul></article><article class="glass-card"><h3>Save it with an account</h3><ul><li>Keep a shortlist and a plan you can return to</li><li>Store documents and admissions notes privately</li><li>Use the source-grounded AI assistant</li></ul><button class="secondary" id="home-sign-in">Sign in to save →</button></article></div></section>`;
  }
  function home() {
    const epoch = ++homeEpoch;
    panel.innerHTML = `<div class="discovery-home"><header class="welcome-hero"><div><span class="eyebrow">YOUR NEXT POSSIBILITY</span><h1>A little curiosity.<br>A world of possibilities.</h1><p>Find the opportunity, university or skill that moves you forward. Start exploring; save your next step when you’re ready. Browsing is open to everyone.</p><div class="work-actions"><button class="primary" id="home-search-entry" data-view="finder">Search opportunities →</button><button class="secondary" data-view="universities">Universities &amp; Admissions</button></div></div><figure class="welcome-mascot"><img src="/assets/white-lion.svg" width="160" height="160" alt="BARYS, your white-lion guide"><figcaption>Big possibilities.<br>One small next step.</figcaption></figure></header></div>`;
    d.querySelector('#breadcrumb-title').textContent = 'Start here';
    panel
      .querySelector('.discovery-home')
      .insertAdjacentHTML('beforeend', directions());
    panel
      .querySelector('.discovery-home')
      .insertAdjacentHTML('beforeend', accessGuide());
    const upcoming = deadlineRadar([
      ...(w.PROSPECTO_INTELLIGENCE?.records || []),
      ...(w.PROSPECTO_DEVELOPMENT?.opportunities || []),
      ...(w.OPPORTUNITIES || []),
    ]);
    panel
      .querySelector('.discovery-home')
      .insertAdjacentHTML(
        'beforeend',
        `<section class="home-deadlines"><div class="section-heading"><div><span class="eyebrow">CHECKED CYCLES, CLEARER DECISIONS</span><h2>Closing in the next 30 days</h2></div><button class="text-button" data-view="finder">All opportunities →</button></div>${upcoming.length ? `<div class="direction-grid">${upcoming.map((r) => `<article class="direction-card"><span class="verification-badge status-open">Verified Open</span><h3>${escape(r.name)}</h3><p>Recorded deadline: <strong>${escape(r.finalDeadline)}</strong>. Check the provider’s timezone and current eligibility.</p>${officialLink(r.applicationUrl, 'Read the application requirements')}</article>`).join('')}</div>` : '<p class="resource-note">No verified open deadlines fall in this window in the current collection. Expected cycles and directories are kept out of this list. You can still research and prepare.</p>'}<details class="status-explainer"><summary>What do the verification badges mean?</summary><dl><dt>Verified Open</dt><dd>A recently checked application cycle; confirm its current conditions.</dd><dt>Expected Cycle</dt><dd>Prepare ahead. Applications are not verified open.</dd><dt>Directory / Evergreen</dt><dd>A resource or directory, not an individual vacancy.</dd><dt>Awaiting Review</dt><dd>Current availability needs a fresh check.</dd></dl><button class="text-button" data-open-barys>Ask BARYS how to check a source →</button></details></section>`,
      );
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
          const recent = recentSource(state);
          const setup = needsSetup(state);
          const recentId = String(recent?.resource_id || '');
          const safeRecentId = /^[a-z0-9-]{1,120}$/.test(recentId)
            ? recentId
            : '';
          const resume = [
            recent
              ? `<article class="glass-card resume-card"><span class="eyebrow">PICK UP A SOURCE</span><h3>${escape(recent.title)}</h3><p>${escape(String(recent.viewed_at || '').slice(0, 10) || 'Recently opened')} · ${escape(recent.kind || 'Source')}</p>${safeRecentId ? `<a class="secondary" href="/?opportunity=${encodeURIComponent(safeRecentId)}">Open source →</a>` : '<button class="secondary" data-view="finder">Find it again →</button>'}</article>`
              : '',
            setup
              ? '<article class="glass-card resume-card"><span class="eyebrow">MAKE IT YOURS</span><h3>Finish your setup</h3><p>A few saved preferences make suggestions more useful. Setup is optional.</p><button class="secondary" data-view="onboarding">Continue setup →</button></article>'
              : '',
          ].filter(Boolean);
          slot.innerHTML = `<div class="section-heading"><div><span class="eyebrow">A SPACE FOR YOUR NEXT STEP</span><h2>${escape(greeting(name))}</h2><p>How’s your day? Pick one thing you’d like to move forward.</p></div><button class="secondary" data-view="dashboard">My workspace →</button></div><button class="text-button" data-view="courses">Resume learning →</button>${steps.length ? `<ul class="next-step-list">${steps.map((item) => `<li><strong>${escape(item.title)}</strong><span>${escape(item.due_date || 'No date set')} · ${escape(item.state)}</span></li>`).join('')}</ul><button class="text-button" data-view="plan">Open my planner →</button>` : '<p>No active plan tasks yet. One small step is enough to begin.</p><button class="secondary" data-view="plan">Make my first plan</button>'}${resume.length ? `<div class="resume-grid">${resume.join('')}</div>` : ''}`;
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
  d.addEventListener('click', (event) => {
    if (event.target?.closest?.('#home-sign-in'))
      w.ProspectoAuth?.promptSignIn?.('save your next step');
  });
  w.ProspectoPlatform.render = (view) => {
    if (view === 'home') home();
    else if (view === 'campus') campus.render();
    else previous(view);
  };
  return { escape, home };
}
