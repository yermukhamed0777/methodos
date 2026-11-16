import { escape, officialLink } from './university-cards.js';
import { verificationStatus } from '../lib/intelligence-core.js';

export function campusOpenings(records, universityId, now = new Date()) {
  if (!universityId) return [];
  return records.filter(
    (r) =>
      ['opportunity', 'scholarship'].includes(r.kind) &&
      (r.universityId === universityId || r.university_id === universityId) &&
      verificationStatus(r, now).label === 'Verified Open',
  );
}
export function installCampus(w = window) {
  const d = w.document,
    panel = d.querySelector('#platform-panel');
  const records = w.PROSPECTO_INTELLIGENCE?.records || [];
  const universities = records
    .filter((r) => r.kind === 'university' && r.status !== 'Archived')
    .sort((a, b) => a.name.localeCompare(b.name));
  let selected = '',
    category = 'all';
  const categories = [
    ['all', 'All campus resources'],
    ['research', 'Research & laboratories'],
    ['exchange', 'Exchange & joint degrees'],
    ['careers', 'Careers & experience'],
  ];
  function render() {
    const r = universities.find((x) => x.id === selected);
    panel.innerHTML = `<header class="platform-heading"><span class="eyebrow">FOR STUDENTS ALREADY AT UNIVERSITY</span><h1>Make more of your campus.</h1><p>Find the research, partnerships and career resources connected to your institution. Access depends on the programme, supervisor and current rules.</p></header><form class="campus-picker"><label>Your university<select id="campus-university"><option value="">Choose a university</option>${universities.map((x) => `<option value="${escape(x.id)}" ${x.id === selected ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select></label><label>What would you like to explore?<select id="campus-category">${categories.map(([id, label]) => `<option value="${id}" ${id === category ? 'selected' : ''}>${label}</option>`).join('')}</select></label></form><div id="campus-results">${r ? content(r) : '<section class="work-empty"><img src="/assets/white-lion.svg" alt="" width="88" height="88"><h2>Your university is a starting point.</h2><p>Choose an institution above to see its researched resources. If yours is missing, use your university’s official research office, international office and careers service; coverage is still growing.</p><button class="secondary" data-view="universities">Browse university profiles</button></section>'}</div>`;
    d.querySelector('#breadcrumb-title').textContent = 'At my university';
  }
  function content(r) {
    const sections = [
      [
        'research',
        'Research & laboratories',
        [r.research, r.experience].filter(Boolean).join(' '),
      ],
      ['exchange', 'Exchange & joint degrees', r.partnership],
      ['careers', 'Careers & experience', r.careerServices],
    ];
    const openings = campusOpenings(records, r.id);
    return `<section class="campus-institution"><span class="eyebrow">${escape(r.country || r.region)}</span><h2>${escape(r.name)}</h2><p>Institutional profile reviewed ${escape(r.checkedOn || 'date unavailable')} · resources, not guaranteed placements</p></section><section class="campus-openings"><h2>Reviewed campus openings</h2>${openings.length ? openings.map((o) => `<article class="work-card"><span class="verification-badge status-open">Verified Open</span><h3>${escape(o.name)}</h3><p>${escape(o.eligibility || 'Check provider eligibility.')}</p>${officialLink(o.applicationUrl, 'Check the current application')}</article>`).join('') : '<p>No verified open listings are linked to this university in our current collection. This does not mean no openings exist. Explore the official resources below.</p>'}</section><div class="direction-grid">${sections
      .filter(([id]) => category === 'all' || category === id)
      .map(
        ([, title, text]) =>
          `<article class="direction-card"><span class="verification-badge status-directory">Directory / resource</span><h3>${title}</h3><p>${escape(text || 'This category has not been researched in the current profile. Ask the university’s official office for current options.')}</p></article>`,
      )
      .join(
        '',
      )}</div><section class="campus-sources"><h2>Go to the source</h2><p>These are the reviewed institutional sources. Confirm access, availability and dates on the university’s own site.</p><div class="resource-links">${(r.sources || []).map(([label, url]) => officialLink(url, label)).join('') || '<p>No verified source links are available for this profile.</p>'}</div><p class="resource-note">${escape(r.note || r.limitations || 'Facilities and partnerships describe capabilities, not an offer of access.')}</p><button class="secondary" data-view="plan">Plan my next campus step</button></section>`;
  }
  d.addEventListener('change', (event) => {
    if (!['campus-university', 'campus-category'].includes(event.target.id))
      return;
    const id = event.target.id;
    if (id === 'campus-university') selected = event.target.value;
    else category = event.target.value;
    render();
    d.getElementById(id)?.focus();
  });
  d.addEventListener('submit', (event) => {
    if (event.target.matches('.campus-picker')) event.preventDefault();
  });
  return { render };
}
