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
    panel.innerHTML = `<div class="discovery-home"><header class="welcome-hero"><div><span class="eyebrow">YOUR NEXT POSSIBILITY</span><h1>A little curiosity.<br>A world of possibilities.</h1><p>Find the opportunity, university or skill that moves you forward. Start exploring; save your next step when you’re ready.</p><div class="work-actions"><button class="primary" data-view="finder">Find an opportunity →</button><button class="secondary" data-view="universities">Explore universities</button></div></div><figure class="welcome-mascot"><img src="/assets/white-lion.svg" width="160" height="160" alt="BARYS, your white-lion guide"><figcaption>Big possibilities.<br>One small next step.</figcaption></figure></header></div>`;
    d.querySelector('#breadcrumb-title').textContent = 'Start here';
    panel
      .querySelector('.discovery-home')
      .insertAdjacentHTML('beforeend', directions());
  }
  w.ProspectoPlatform.render = (view) => {
    if (view === 'home') home();
    else previous(view);
  };
  return { escape, home };
}
