import { rankEntries } from '../lib/search-index.js';
import { verificationStatus } from '../lib/intelligence-core.js';
import { triageDeadlines } from '../lib/deadline-triage.js';
import { buildCalendar, deadlineEvents } from '../lib/ics.js';
import { sharedPathId, shareLinkHTML } from './path-card.js';
import { glassStat } from './ui-components.js';
import { gateHTML } from './access.js';
import {
  activityCalendar,
  activityLabels,
  activityLevel,
  localStudyDate,
  validStudyDate,
} from './learning-activity.js';
import {
  discoveryChips,
  clearDiscoveryChip,
  sourceLinkLabel,
} from '../lib/discovery-ui.js';
import {
  filterCourses,
  paginateCourses,
  courseProvider as providerName,
} from './course-discovery.js';
import {
  monday,
  checkBudget,
  validateDocument,
  availability,
  fitReasons,
  profileEvidence,
  compareUniversities,
} from '../lib/workspace-model.js';
const D = window.PROSPECTO_DEVELOPMENT,
  R = window.PROSPECTO_RESOURCES,
  A = window.ProspectoAuth,
  db = A.client,
  uid = A.user?.id;
const track = (name, props) => window.ProspectoEvents?.track(name, props);
const TABLES = [
  'preferences',
  'documents',
  'profile_records',
  'user_skills',
  'course_progress',
  'plans',
  'plan_items',
  'saved_searches',
  'recent_views',
];
const views = [
  'dashboard',
  'my-learning',
  'onboarding',
  'profile',
  'documents',
  'courses',
  'skills',
  'plan',
  'pathways',
  'finder',
  'privacy',
  'universities',
];
let state = {},
  ready = false,
  loading,
  view = 'dashboard',
  field = D.majors[0].id,
  comparison = [],
  search = {
    q: '',
    field: '',
    region: '',
    stage: '',
    type: '',
    format: '',
    funding: '',
    availability: '',
  },
  courseSearch = '',
  selectedProvider = '',
  selectedFormat = '',
  coursePage = 1,
  focusFinderQuery = false,
  selectedPlan = '',
  planFilter = 'All',
  orderUndo = null;
const E = (x) =>
  String(x ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const select = (values, current = '', empty = 'Choose…') =>
  `<option value="">${E(empty)}</option>` +
  values
    .map((v) => {
      const [id, label] = Array.isArray(v) ? v : [v, v];
      return `<option value="${E(id)}" ${id === current ? 'selected' : ''}>${E(label)}</option>`;
    })
    .join('');
const link = (url, label) => {
  try {
    const u = new URL(url, location.origin);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return `<a href="${E(u.href)}" target="_blank" rel="noopener noreferrer">${E(label)} ↗</a>`;
  } catch {
    return '';
  }
};
const button = (action, label, id = '', cls = 'secondary') =>
  `<button type="button" class="${cls}" data-work="${action}" data-id="${E(id)}">${E(label)}</button>`;
const go = (page, label) => button('go', label, page);
const statusBadge = (r) => {
  const status = verificationStatus(r);
  return `<span class="verification-badge status-${status.tone}" title="${E(status.description)}">${E(status.label)}</span>`;
};
const tag = (text, cls = '') =>
  `<span class="work-tag ${cls}">${E(text)}</span>`;
const heading = (title, description) =>
  `<header class="platform-heading"><span class="eyebrow">EXPLORE. LEARN. MAKE YOUR NEXT MOVE.</span><h1>${E(title)}</h1><p>${E(description)}</p></header>`;
const empty = (text, action = '') =>
  `<div class="work-empty"><img src="/assets/white-lion.svg" alt="" width="88" height="70"><p>${E(text)}</p>${action}</div>`;
const input = (label, name, value = '', type = 'text', attrs = '') =>
  `<label>${E(label)}<input name="${name}" type="${type}" value="${E(value)}" ${attrs}></label>`;
const textarea = (label, name, value = '', max = 3000) =>
  `<label>${E(label)}<textarea name="${name}" maxlength="${max}" rows="3">${E(value)}</textarea></label>`;
const choose = (
  label,
  name,
  values,
  value = '',
  emptyLabel = 'Not specified',
) =>
  `<label>${E(label)}<select name="${name}">${select(values, value, emptyLabel)}</select></label>`;
function notify(text) {
  const el = document.querySelector('#work-status');
  if (el) el.textContent = text;
}
async function unwrap(query) {
  const { data, error } = await query;
  if (error)
    throw Error(
      error.message.includes('time budget') || error.message.includes('exceeds')
        ? error.message
        : 'Your change could not be saved. Please retry.',
    );
  return data;
}
async function load(force = false) {
  if (!uid) {
    for (const name of TABLES) state[name] = [];
    state.preferences = {
      basic: {},
      field_ids: [],
      goals: [],
      allow_profile_ai: false,
      in_app_reminders: false,
    };
    ready = true;
    return;
  }
  if (ready && !force) return;
  if (loading) return loading;
  loading = (async () => {
    const rows = await Promise.all(
      TABLES.map((t) => db.from(t).select('*').eq('user_id', uid)),
    );
    if (rows.some((x) => x.error))
      throw Error('Your workspace could not load. Please reload or try again.');
    for (let i = 0; i < TABLES.length; i++)
      state[TABLES[i]] = rows[i].data || [];
    state.preferences = state.preferences[0] || {
      user_id: uid,
      basic: {},
      field_ids: [],
      goals: [],
      onboarding_step: 0,
      onboarding_complete: false,
      allow_profile_ai: false,
      in_app_reminders: true,
      reminder_days: 7,
    };
    field = state.preferences.field_ids[0] || field;
    ready = true;
  })();
  try {
    await loading;
  } finally {
    loading = null;
  }
}
async function refresh() {
  await load(true);
  render(view);
}
async function save(table, value) {
  return unwrap(
    db
      .from(table)
      .upsert({ ...value, user_id: uid })
      .select(),
  );
}
async function remove(table, id) {
  await unwrap(db.from(table).delete().eq('user_id', uid).eq('id', id));
}
function modal(title, body, submit, onSubmit) {
  document.querySelector('#work-dialog')?.remove();
  const d = document.createElement('dialog');
  d.id = 'work-dialog';
  d.className = 'work-dialog';
  d.innerHTML = `<form class="work-form"><div class="work-dialog-head"><h2>${E(title)}</h2><button type="button" class="text-button" data-close aria-label="Close dialog">✕</button></div>${body}<p class="work-form-error" role="alert"></p><div class="work-actions">${submit ? `<button class="primary" type="submit">${E(submit)}</button>` : ''}<button type="button" class="secondary" data-close>Close</button></div></form>`;
  document.body.append(d);
  d.querySelectorAll('[data-close]').forEach(
    (x) => (x.onclick = () => d.close()),
  );
  d.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const b = d.querySelector('[type=submit]');
    if (!b) return;
    b.disabled = true;
    d.querySelector('[role=alert]').textContent = '';
    try {
      await onSubmit(new FormData(e.target), e.target);
      d.close();
      await load(true);
      await window.ProspectoWorkspace.render(
        document.body.dataset.currentView || view,
      );
    } catch (err) {
      d.querySelector('[role=alert]').textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
  d.addEventListener('close', () => d.remove(), { once: true });
  d.showModal();
  return d;
}
function preferenceForm(step) {
  const p = state.preferences,
    b = p.basic || {};
  const checks = (values, name, chosen) =>
    `<div class="work-check-grid">${values
      .map((v) => {
        const [id, label] = Array.isArray(v) ? v : [v, v];
        return `<label class="work-check"><input type="checkbox" name="${name}" value="${E(id)}" ${chosen.includes(id) ? 'checked' : ''}>${E(label)}</label>`;
      })
      .join('')}</div>`;
  if (step === 0)
    return `<div class="work-form-grid">${input('Preferred name (optional)', 'name', b.name, 'text', 'maxlength="80"')}${input('Current country / location', 'country', b.country, 'text', 'maxlength="120"')}${input('Nationality (optional; eligibility only)', 'nationality', b.nationality, 'text', 'maxlength="100"')}${choose('Age range (optional)', 'ageRange', ['Under 13', '13–15', '16–17', '18–21', '22–25', '26–32', '33+'], b.ageRange)}${input('Institution (optional)', 'institution', b.institution, 'text', 'maxlength="200"')}${choose('Education stage', 'stage', D.stages, b.stage)}${input('Expected graduation year', 'graduation', b.graduation, 'number', 'min="2020" max="2050"')}</div>`;
  if (step === 1)
    return `<fieldset><legend>Fields and career interests · choose up to 8</legend>${checks(
      D.majors.map((x) => [x.id, x.name]),
      'fields',
      p.field_ids,
    )}</fieldset><fieldset><legend>Goals · choose up to 8</legend>${checks(D.goals, 'goals', p.goals)}</fieldset>`;
  if (step === 2)
    return `<img class="work-mascot" src="/assets/white-lion.svg" alt="" width="116" height="90"><h2>Bring your experience, at your pace.</h2><p>Add education, projects, employment, volunteering and other evidence manually in My development profile, or upload a PDF / DOCX in Documents. Extracted text is always reviewed before it becomes a profile record.</p><p>You can finish these steps first and add records later.</p>`;
  return `<div class="work-form-grid">${input('Preferred opportunity locations', 'location', b.location, 'text', 'maxlength="200"')}${choose('Preferred format', 'format', ['Remote', 'Hybrid', 'On-site', 'Flexible'], b.format)}${input('Languages (optional)', 'languages', b.languages, 'text', 'maxlength="200"')}${input('Available hours per week', 'hours', b.hours || 5, 'number', 'min="0.5" max="80" step="0.5"')}${input('Budget / funding needs (optional)', 'budget', b.budget, 'text', 'maxlength="200"')}</div><label class="work-check"><input type="checkbox" name="allow_profile_ai" ${p.allow_profile_ai ? 'checked' : ''}>Allow the AI provider to use my selected profile preferences, skills, activities and plans when I ask for help. Only profile records individually permitted by me are included. Document files, private download links and unreviewed text are excluded.</label>`;
}
function onboarding() {
  const p = state.preferences,
    step = Math.min(3, p.onboarding_step);
  return (
    heading(
      'Make this workspace yours.',
      'Four short steps. Every question is optional; you can return and change your answers.',
    ) +
    `<div class="work-stepper" role="group" aria-label="Onboarding progress">${['About you', 'Fields & goals', 'Experience', 'Preferences'].map((s, i) => `<span ${i === step ? 'aria-current="step"' : ''}>${i + 1}. ${s}</span>`).join('')}</div><form id="work-onboarding" class="work-card work-form" data-step="${step}">${preferenceForm(step)}<div class="work-actions">${step ? button('onboard-back', 'Back') : ''}<button class="primary">${step === 3 ? 'Finish setup' : 'Save & continue'}</button>${button('onboard-skip', 'Skip for now')}</div></form>`
  );
}
function dashboard() {
  const p = state.preferences,
    b = p.basic || {},
    active = state.plan_items.filter((x) =>
      ['Planned', 'In progress'].includes(x.state),
    ),
    week = monday(),
    thisWeek = active.filter((x) => x.week_start === week),
    evidence = profileEvidence(
      state.profile_records,
      state.user_skills,
      state.course_progress,
    ),
    gaps = evidence.filter((x) => !x.evidence.length).slice(0, 3);
  const suggested = D.opportunities
    .filter((x) => !availability(x).startsWith('Closed'))
    .map((o) => ({ o, fit: fitReasons(o, p, D.skillMaps) }))
    .sort((a, b) => Number(b.fit.fieldMatch) - Number(a.fit.fieldMatch))
    .slice(0, 3);
  const today = new Date().toISOString().slice(0, 10),
    end = new Date(Date.now() + p.reminder_days * 86400000)
      .toISOString()
      .slice(0, 10);
  const deadlines = state.plan_items
    .filter(
      (x) =>
        x.due_date >= today && x.due_date <= end && x.state !== 'Completed',
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const ranked = triageDeadlines({
    opportunities: D.opportunities,
    tasks: state.plan_items,
    today,
    windowDays: p.reminder_days || 30,
  });
  return (
    heading(
      `${b.name ? b.name + ', your' : 'Your'} next step.`,
      'A focused view of your plans, evidence and opportunities. Fit explanations are editorial suggestions, not eligibility decisions.',
    ) +
    (!p.onboarding_complete
      ? `<div class="work-notice"><strong>Setup is optional.</strong> ${p.onboarding_step} of 4 steps saved. ${go('onboarding', 'Continue setup')}</div>`
      : '') +
    `<div class="work-stat-grid">${glassStat('Planned this week across your plans', thisWeek.reduce((n, x) => n + Number(x.weekly_hours), 0) + ' hours')}${glassStat('Marked completed by you', state.course_progress.filter((x) => x.state === 'Completed').length + ' courses')}${glassStat('Evidence you added or reviewed', state.profile_records.length + ' records')}</div><div class="work-two"><section class="work-card glass-card"><h2>This week</h2>${thisWeek.length ? thisWeek.map((x) => `<div class="work-list-row"><div><strong>${E(x.title)}</strong><p>${E(x.kind)} · ${x.weekly_hours} h · ${E(x.state)}</p></div>${button('edit-item', 'Edit', x.id)}</div>`).join('') : empty('Choose one small task to start.', go('plan', 'Open my plan'))}${go('plan', 'All plans')}</section><section class="work-card glass-card"><h2>Evidence to develop</h2>${gaps.map((x) => `<h3>${E(x.name)}</h3><p>${E(x.gap)} ${E(x.next)}</p>`).join('') || '<p>Review your recorded evidence and add outcomes.</p>'}${go('profile', 'Review my profile')}</section></div>` +
    `<section><h2>Possibilities to explore</h2><div class="resource-grid">${suggested.map(({ o, fit }) => `<article class="work-card">${tag(availability(o))}<h3>${E(o.name)}</h3><p>${E(fit.reasons.join(' · '))}</p><p class="resource-note">${E(fit.cautions[0] || o.note)}</p>${go('finder', 'Check full eligibility & source')}</article>`).join('')}</div></section>` +
    `<section class="work-card deadline-triage glass-panel"><h2>Deadline triage · next ${p.reminder_days || 30} days</h2>${
      ranked.length
        ? '<ol class="triage-list">' +
          ranked
            .map(
              (x) =>
                `<li><strong>${E(x.title)}</strong> <span class="triage-date">${E(x.date)}</span><p>${E(x.reason)}</p>${
                  x.url
                    ? `<a href="${E(x.url)}" target="_blank" rel="noopener noreferrer">Check official source ↗</a>`
                    : ''
                }</li>`,
            )
            .join('') +
          '</ol>'
        : '<p>No verified or planned dates in this window. Unknown cycles are never guessed.</p>'
    }${ranked.length ? `<div class="work-actions">${button('export-deadlines', 'Export these dates to my calendar')}</div>` : ''}<p class="resource-note">Ranked by date, then source confidence. A published date can still change; confirm at the official source.</p></section>` +
    (p.in_app_reminders
      ? `<section class="work-card"><h2>Reminders · next ${p.reminder_days} days</h2>${deadlines.length ? deadlines.map((x) => `<p>${tag(x.due_date, 'deadline')} ${E(x.title)} ${button('calendar', 'Calendar', x.id)}</p>`).join('') : '<p>No dated plan tasks in this window. These reminders appear in this workspace; email and push notifications are not enabled.</p>'}</section>`
      : '') +
    `<section class="work-card"><h2>Recent sources</h2>${
      state.recent_views
        .sort((a, b) => b.viewed_at.localeCompare(a.viewed_at))
        .slice(0, 5)
        .map(
          (x) =>
            `<p>${E(x.title)} <small>${E(x.viewed_at.slice(0, 10))}</small></p>`,
        )
        .join('') || '<p>Official sources you open here will appear here.</p>'
    }</section>`
  );
}
function profile() {
  const p = state.preferences,
    b = p.basic || {};
  return (
    heading(
      'My development profile.',
      'Your editable evidence, interests and progress. No admissions score or success prediction is assigned.',
    ) +
    `<div class="work-actions">${go('onboarding', 'Edit my direction')}${button('record', 'Add experience or evidence')}${go('documents', 'Upload documents')}${go('privacy', 'Privacy & export')}</div><section class="work-card"><h2>${E(b.name || 'Your direction')}</h2><p>${E([b.stage, b.institution, b.country].filter(Boolean).join(' · ') || 'Add details when you are ready.')}</p><p>${p.field_ids.map((id) => tag(D.majors.find((x) => x.id === id)?.name || id)).join(' ')}</p><p>${p.goals.map((x) => E(x)).join(' · ')}</p><p>Preferred locations: ${E(b.location || 'Not specified')} · ${E(b.format || 'Flexible')} · ${E(b.hours || 'Not specified')} hours/week</p></section><h2>Recorded evidence</h2>${state.profile_records.length ? state.profile_records.map((x) => `<article class="work-card">${tag(x.kind)}<h3>${E(x.title)}</h3><p>${E(x.organization)} ${E([x.start_date, x.end_date].filter(Boolean).join(' – '))}</p><p class="work-pre">${E(x.details)}</p><small>${x.ai_allowed ? 'Permitted for AI when global profile sharing is enabled' : 'Excluded from AI profile context'}</small><div class="work-actions">${button('record', 'Edit', x.id)}${button('delete-record', 'Delete', x.id)}</div></article>`).join('') : empty('Add one experience or project to start.', button('record', 'Add a record'))}<h2>Evidence review</h2><div class="resource-grid">${profileEvidence(
      state.profile_records,
      state.user_skills,
      state.course_progress,
    )
      .map(
        (x) =>
          `<article class="work-card"><h3>${E(x.name)}</h3><p>${E(x.evidence.length ? 'Evidence: ' + x.evidence.map((r) => r.title).join('; ') : x.gap)}</p><p>${E(x.why)} ${E(x.next)}</p><small>${E(x.time)} This review uses only records you entered; it does not verify proficiency.</small></article>`,
      )
      .join(
        '',
      )}</div><div class="work-actions">${go('plan', 'Plans')}${go('my-learning', 'My Learning')}${go('activities', 'Activities')}${go('saved', 'Application tracker')}</div>`
  );
}
function recordForm(id) {
  const r = state.profile_records.find((x) => x.id === id) || {};
  modal(
    id ? 'Edit profile evidence' : 'Add profile evidence',
    choose('Type', 'kind', D.recordKinds, r.kind || 'Project') +
      input('Title', 'title', r.title, 'text', 'required maxlength="200"') +
      input(
        'Organization / institution',
        'organization',
        r.organization,
        'text',
        'maxlength="200"',
      ) +
      `<div class="work-form-grid">${input('Start date (optional)', 'start_date', r.start_date, 'date')}${input('End date (optional)', 'end_date', r.end_date, 'date')}</div>` +
      textarea(
        'What you did, learned, or can demonstrate',
        'details',
        r.details,
        4000,
      ) +
      `<label class="work-check"><input type="checkbox" name="ai_allowed" ${r.ai_allowed ? 'checked' : ''}>Permit this record in AI profile context when global sharing is enabled</label>`,
    'Save record',
    async (fd) => {
      await save('profile_records', {
        ...(id ? { id } : {}),
        kind: fd.get('kind'),
        title: fd.get('title').trim(),
        organization: fd.get('organization'),
        start_date: fd.get('start_date') || null,
        end_date: fd.get('end_date') || null,
        details: fd.get('details'),
        source_document: r.source_document || null,
        ai_allowed: fd.has('ai_allowed'),
      });
    },
  );
}
function skillMap() {
  const map = D.skillMaps.find((x) => x.fieldId === field) || D.skillMaps[0];
  const groups = [...new Set(map.skills.map((s) => s.category))];
  return (
    heading(
      'Skills for Your Major or Career.',
      'Choose a direction, understand why a skill matters, and record evidence as you learn.',
    ) +
    `<div class="work-card"><label>Field<select id="work-field">${select(
      D.majors.map((x) => [x.id, x.name]),
      field,
    )}</select></label><p>${E(map.note)}</p><p>Example project: ${E(map.project)}</p><div class="resource-links">${map.sources.map(([l, u]) => link(u, l)).join('')}</div><small>Editorial learning map · sources checked ${map.checkedOn}. Time estimates are suggestions, not course durations.</small></div>` +
    groups
      .map(
        (g) =>
          `<section><h2>${E(g)}</h2><div class="resource-grid">${map.skills
            .filter((x) => x.category === g)
            .map((s) => {
              const progress = state.user_skills.find(
                (x) => x.skill_id === s.id,
              );
              return `<article class="work-card">${tag(progress?.state || 'Not started')} ${tag(s.level)}<h3>${E(s.name)}</h3><p>${E(s.description)}</p><p><strong>Why:</strong> ${E(s.why)}</p><p><strong>Show evidence:</strong> ${E(s.evidence)}</p><p><strong>Try:</strong> ${E(s.project)}</p><p class="resource-note">Suggested starter effort: ${E(s.estimatedWeeks)} at your own pace; adjust your plan.</p><details><summary>Levels, prerequisites and assessment</summary><dl>${Object.entries(
                s.interpretations || {},
              )
                .map(([k, v]) => `<dt>${E(k)}</dt><dd>${E(v)}</dd>`)
                .join(
                  '',
                )}<dt>Prerequisites</dt><dd>${E(s.prerequisites)}</dd><dt>Assessment</dt><dd>${E(s.assessment)}</dd><dt>Related careers</dt><dd>${E((s.relatedCareers || []).join(' · '))}</dd><dt>Professional boundaries</dt><dd>${E(s.regulatoryAwareness)}</dd></dl><p>Reviewed ${E(s.checkedOn)} · editorial learning guidance.</p><div class="resource-links">${(
                s.courseIds || []
              )
                .map((id) => {
                  const c = R.courses.find((x) => x.id === id);
                  return c ? link(c.url, c.name) : '';
                })
                .join(
                  '',
                )}</div></details>${progress?.evidence ? `<p>Your evidence: ${E(progress.evidence)}</p>` : ''}<button type="button" class="secondary" data-intel="link-skill" data-id="${E(s.id)}">Link a course, project or private evidence</button>${button('skill', 'Update progress', s.id)} ${button('quick-plan', 'Add preparation task', s.name)}</article>`;
            })
            .join('')}</div></section>`,
      )
      .join('') +
    `<section class="work-card"><h2>Related courses and pathways</h2>${map.courses
      .map((id) => {
        const c = R.courses.find((x) => x.id === id);
        return c ? `<p>${link(c.url, c.name)}</p>` : '';
      })
      .join(
        '',
      )}${go('courses', 'Explore courses')}${go('pathways', 'Illustrative careers')}${go('finder', 'Related opportunities')}</section>`
  );
}
function skillForm(id) {
  const skill = D.skillMaps.flatMap((x) => x.skills).find((x) => x.id === id),
    p = state.user_skills.find((x) => x.skill_id === id) || {};
  modal(
    skill?.name || id,
    choose(
      'Progress',
      'state',
      [
        'Not started',
        'Exploring',
        'Learning',
        'Practising',
        'Demonstrated',
        'Verified by evidence',
      ],
      p.state || 'Learning',
    ) +
      textarea('Notes', 'notes', p.notes, 2000) +
      textarea(
        'Evidence / artifact link / outcome',
        'evidence',
        p.evidence,
        2000,
      ) +
      (p.skill_id
        ? button('delete-skill', 'Delete this skill progress', id)
        : ''),
    'Save progress',
    async (fd) => {
      if (
        ['Demonstrated', 'Verified by evidence'].includes(fd.get('state')) &&
        !fd.get('evidence').trim()
      )
        throw Error('Add evidence to mark this skill as demonstrated.');
      await save('user_skills', {
        skill_id: id,
        state: fd.get('state'),
        notes: fd.get('notes'),
        evidence: fd.get('evidence'),
        updated_at: new Date().toISOString(),
      });
    },
  );
}
async function fetchLearning() {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const query = db.from('learning_activity').select('*').eq('user_id', uid);
    const { data, error } = await query
      .order('study_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id')
      .range(offset, offset + 499);
    if (['42P01', 'PGRST205'].includes(error?.code)) return null;
    if (error)
      throw Error('Your learning history could not load. Please retry.');
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

let learningRows = [],
  learningDate = '';
const courseTitle = (id) =>
  R.courses.find((course) => course.id === id)?.name ||
  'Course no longer in catalog';
const dayLabel = (date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(date + 'T00:00:00Z'));
function learningDay(rows, date) {
  const entries = rows.filter((row) => row.study_date === date);
  return `<h3>${E(dayLabel(date))}</h3><p>${entries.length} learning ${entries.length === 1 ? 'activity' : 'activities'}</p>${entries.length ? `<ul class="learning-entries">${entries.map((row) => `<li><div><strong>${E(courseTitle(row.course_id))}</strong><span>${E(activityLabels[row.kind])}${row.minutes ? ' · ' + row.minutes + ' min' : ''}${row.progress != null ? ' · ' + row.progress + '%' : ''}</span></div>${button('edit-learning', 'Edit entry', row.id, 'text-button')}</li>`).join('')}</ul>` : '<p>No activity logged on this day.</p>'}`;
}

function myLearning(rows) {
  const today = localStudyDate();
  const intro = heading(
    'My Learning',
    'Remember what you studied, when you studied it, and where to pick up.',
  );
  if (rows === null)
    return (
      intro +
      '<div class="work-notice" role="status">The activity calendar is unavailable on this deployment. Your existing course records are still available.</div>' +
      go('courses', 'Open courses')
    );
  const calendar = activityCalendar(rows, today);
  if (!learningDate || learningDate < calendar.start || learningDate > today)
    learningDate =
      rows.find(
        (row) => row.study_date >= calendar.start && row.study_date <= today,
      )?.study_date || today;
  const trackedIds = new Set([
    ...state.course_progress.map((row) => row.course_id),
    ...rows.map((row) => row.course_id),
  ]);
  const months = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    timeZone: 'UTC',
  });
  const monthLabels = new Map();
  calendar.days.forEach((day, index) => {
    if (day && (day.date.endsWith('-01') || day.date === calendar.start)) {
      const week = Math.floor(index / 7) + 1;
      if (week === 1 || week >= 4)
        monthLabels.set(week, months.format(new Date(day.date + 'T00:00:00Z')));
    }
  });
  const cells = calendar.days
    .map((day) => {
      if (!day)
        return '<span class="learning-square-placeholder" aria-hidden="true"></span>';
      const count = day.entries.length;
      const label = `${dayLabel(day.date)}: ${count} ${count === 1 ? 'activity' : 'activities'}`;
      return `<button class="learning-square level-${activityLevel(count)}" type="button" data-study-day="${day.date}" tabindex="-1" aria-label="${E(label)}" title="${E(label)}" aria-pressed="${day.date === learningDate}"></button>`;
    })
    .join('');
  return (
    intro +
    `<div class="work-actions learning-actions">${button('log-learning', 'Log learning activity', '', 'primary')}${go('courses', 'Browse courses')}</div><section class="work-card learning-calendar" aria-labelledby="learning-calendar-title"><div class="section-heading"><div><h2 id="learning-calendar-title">Learning activity</h2><p>Last 365 days · Self-reported activity</p></div><label>View a date<input type="date" id="learning-date" min="${calendar.start}" max="${today}" value="${learningDate}"></label></div><div class="learning-totals">${glassStat('Activities', calendar.count)}${glassStat('Active days', calendar.daily.size)}${glassStat('Courses completed', calendar.completed)}${glassStat('Study minutes logged', calendar.minutes)}</div><div class="learning-scroll" role="region" aria-label="Learning activity calendar, scroll to view more dates" tabindex="0"><div class="learning-months" aria-hidden="true">${[...monthLabels].map(([week, label]) => `<span style="grid-column:${week}">${E(label)}</span>`).join('')}</div><div class="learning-grid">${cells}</div></div><div class="learning-legend" role="group" aria-label="Daily activity levels">${['0', '1', '2', '3–4', '5+'].map((label, level) => `<span><i class="level-${level}" aria-hidden="true"></i>${label}</span>`).join('')}</div><p class="resource-note">Each dated start, study session, progress update, or completion counts as one activity. Use “View a date” to read entries with a keyboard.</p><div id="learning-day-result" aria-live="polite">${learningDay(rows, learningDate)}</div></section><section aria-labelledby="learning-courses-title"><h2 id="learning-courses-title">Your courses</h2>${
      trackedIds.size
        ? `<div class="resource-grid">${[...trackedIds]
            .map((id) => {
              const current = state.course_progress.find(
                (row) => row.course_id === id,
              );
              const entries = rows.filter((row) => row.course_id === id);
              const start = entries.find((row) => row.kind === 'started');
              const completion = entries.find(
                (row) => row.kind === 'completed',
              );
              const latest = entries.find((row) => row.progress != null);
              const known = R.courses.some((course) => course.id === id);
              return `<article class="work-card learning-course">${current ? tag(current.state) : ''}<h3>${E(courseTitle(id))}</h3><dl><dt>Started</dt><dd>${start ? E(dayLabel(start.study_date)) : 'Date not recorded'}</dd><dt>Completed</dt><dd>${completion ? E(dayLabel(completion.study_date)) : 'Date not recorded'}</dd>${latest ? `<dt>Reported progress</dt><dd><progress value="${latest.progress}" max="100" aria-label="Reported progress"></progress> ${latest.progress}%</dd>` : ''}</dl><div class="work-actions">${known ? button('course', 'Update course status', id) : ''}${button('log-learning', 'Log activity', id)}</div></article>`;
            })
            .join('')}</div>`
        : empty(
            'Choose a course to start tracking your learning.',
            go('courses', 'Find a course'),
          )
    }</section>`
  );
}

function learningForm(courseId, entry) {
  const id = entry?.id || window.crypto.randomUUID();
  const today = localStudyDate();
  const choices = new Map(R.courses.map((course) => [course.id, course.name]));
  if (courseId && !choices.has(courseId))
    choices.set(courseId, courseTitle(courseId));
  modal(
    entry ? 'Edit learning activity' : 'Log learning activity',
    choose('Course', 'course_id', [...choices], courseId, 'Choose a course') +
      choose(
        'Activity',
        'kind',
        Object.entries(activityLabels),
        entry?.kind || 'study',
      ) +
      input(
        'Study date',
        'study_date',
        entry?.study_date || today,
        'date',
        `min="1900-01-01" max="${today}" required`,
      ) +
      input(
        'Minutes studied (optional)',
        'minutes',
        entry?.minutes,
        'number',
        'min="1" max="1440" step="1"',
      ) +
      input(
        'Progress percent (optional)',
        'progress',
        entry?.progress,
        'number',
        'min="0" max="100" step="1"',
      ) +
      (entry
        ? button('delete-learning', 'Delete entry', id, 'text-button')
        : ''),
    entry ? 'Save corrections' : 'Save activity',
    async (fd) => {
      const course_id = fd.get('course_id'),
        kind = fd.get('kind'),
        study_date = fd.get('study_date');
      const numeric = (name) =>
        fd.get(name) === '' ? null : Number(fd.get(name));
      const minutes = numeric('minutes'),
        progress = numeric('progress');
      if (!choices.has(course_id) || !Object.hasOwn(activityLabels, kind))
        throw Error('Choose a course and an activity.');
      if (
        !validStudyDate(study_date) ||
        study_date > today ||
        study_date < '1900-01-01'
      )
        throw Error('Choose a valid date on or before today.');
      if (kind === 'progress' && progress === null)
        throw Error('Enter the progress percentage you reached.');
      if (
        !entry &&
        kind === 'progress' &&
        learningRows.some(
          (row) =>
            row.course_id === course_id &&
            row.kind === 'progress' &&
            row.study_date === study_date &&
            row.progress === progress,
        )
      )
        throw Error('That progress update is already recorded for this day.');
      const values = {
        course_id,
        kind,
        study_date,
        minutes,
        progress: progress ?? (kind === 'completed' ? 100 : null),
      };
      const table = db.from('learning_activity');
      const { error } = await (entry
        ? table
            .update(values)
            .eq('user_id', uid)
            .eq('id', id)
            .select('id')
            .single()
        : table.upsert(
            { ...values, id, user_id: uid },
            { onConflict: 'id', ignoreDuplicates: true },
          ));
      if (error?.code === '23505')
        throw Error(
          'That course milestone or progress update is already logged. Edit the existing entry to correct it.',
        );
      if (error) throw Error('The activity could not be saved. Please retry.');
      learningDate = study_date;
    },
  );
}

function selectLearningDay(date) {
  const input = document.getElementById('learning-date');
  if (!input || !validStudyDate(date) || date < input.min || date > input.max)
    return;
  learningDate = date;
  input.value = date;
  document
    .querySelectorAll('[data-study-day][aria-pressed="true"]')
    .forEach((cell) => cell.setAttribute('aria-pressed', 'false'));
  document
    .querySelector(`[data-study-day="${date}"]`)
    ?.setAttribute('aria-pressed', 'true');
  document.getElementById('learning-day-result').innerHTML = learningDay(
    learningRows,
    date,
  );
}

function courses() {
  const items = filterCourses(R.courses, {
    query: courseSearch,
    provider: selectedProvider,
    format: selectedFormat,
  });
  const page = paginateCourses(items, coursePage);
  coursePage = page.number;
  const pager = () =>
    `<nav class="course-pagination" aria-label="Course pages"><button class="secondary" data-work="course-page" data-id="${page.number - 1}" ${page.number === 1 ? 'disabled' : ''}>← Previous</button><span>Page ${page.number} of ${page.pages} · ${page.start}–${page.end} of ${items.length}</span><button class="secondary" data-work="course-page" data-id="${page.number + 1}" ${page.number === page.pages ? 'disabled' : ''}>Next →</button></nav>`;
  return (
    heading(
      'Courses with a purpose.',
      'Official courses and open learning resources. Link learning to evidence and a plan.',
    ) +
    `<div class="work-actions">${go('my-learning', 'My Learning')}</div><div class="work-notice">Pricing, regional access, auditing and certificates can change. Check university access for LinkedIn Learning. Unknown duration or level is shown explicitly.</div><div class="course-filterbar"><label>Search course, field, or provider<input id="work-course-search" value="${E(courseSearch)}" type="search" maxlength="150" placeholder="Try Python, materials or leadership"></label><label>Learning provider<select id="work-course-provider">${select([...new Set(R.courses.map(providerName).filter(Boolean))].sort(), selectedProvider, 'All providers')}</select></label><label>Format<select id="work-course-format">${select([...new Set(R.courses.map((c) => c.format).filter(Boolean))].map((x) => [x, x]).concat([['unknown', 'Format not yet reviewed']]), selectedFormat, 'All formats')}</select></label>${button('reset-courses', 'Clear filters')}</div><p role="status">${items.length} courses${courseSearch || selectedProvider || selectedFormat ? ' match your filters' : ' in the collection'}</p>${!items.length ? '<div class="work-empty"><h2>No courses match yet.</h2><p>Try another provider or a broader skill.</p>' + button('reset-courses', 'Show all courses') + '</div>' : pager()}<div class="resource-grid">${page.rows
      .map((c) => {
        const p = state.course_progress.find((x) => x.course_id === c.id);
        return `<article class="work-card">${tag(p?.state || 'Not saved')}<h2>${E(c.name)}</h2><p>${E(c.provider)}${c.institution ? ' · ' + E(c.institution) : ''}</p><p>${E((c.skills || []).join(' · '))}</p><dl><dt>Level</dt><dd>${E(c.level || 'Not verified')}</dd><dt>Duration</dt><dd>${E(c.duration || 'Not verified')}</dd><dt>Format</dt><dd>${E(c.format || 'Provider online course')}</dd><dt>Access and cost</dt><dd>${E(c.auditing || c.costType)}</dd><dt>Certificate</dt><dd>${E(c.certificate || 'Confirm provider conditions and price')}</dd></dl><p class="resource-note">Checked ${c.checkedOn}. Completion does not guarantee professional qualification.</p><div class="resource-links">${link(c.url, 'Official course page')}</div><div class="work-actions">${button('course', 'Track course', c.id)}${uid && p ? button('log-learning', 'Log study', c.id, 'text-button') : ''}${button('quick-plan', 'Add to plan', c.name)}</div>${p?.notes ? `<p>Your notes: ${E(p.notes)}</p>` : ''}</article>`;
      })
      .join('')}</div>${items.length ? pager() : ''}`
  );
}
function courseForm(id) {
  const c = R.courses.find((x) => x.id === id),
    p = state.course_progress.find((x) => x.course_id === id) || {};
  modal(
    c.name,
    choose(
      'Progress',
      'state',
      ['Planned', 'In progress', 'Completed'],
      p.state || 'Planned',
    ) +
      choose(
        'Target skill (optional)',
        'target_skill',
        D.skillMaps
          .find((x) => x.fieldId === field)
          .skills.map((x) => [x.id, x.name]),
        p.target_skill,
      ) +
      textarea('Notes', 'notes', p.notes, 2000) +
      textarea('My learning evidence / outcome', 'evidence', p.evidence, 2000) +
      choose(
        'Related portfolio project (optional)',
        'project_id',
        (window.PROSPECTO_INTELLIGENCE?.records || [])
          .filter((r) => r.kind === 'project')
          .map((r) => [r.id, r.name]),
        p.project_id,
      ) +
      (p.course_id
        ? button('delete-course', 'Delete this course progress', id)
        : ''),
    'Save learning',
    async (fd) => {
      const rows = await save('course_progress', {
        course_id: id,
        state: fd.get('state'),
        notes: fd.get('notes'),
        target_skill: fd.get('target_skill'),
        project_id: fd.get('project_id') || null,
        evidence: fd.get('evidence'),
        updated_at: new Date().toISOString(),
      });
      track('next_step', { action: 'progress' });
      return rows;
    },
  );
}
function documents() {
  return (
    heading(
      'Your documents, under your control.',
      'Upload selectable-text PDF or DOCX files up to 10 MB. Files stay in private storage. Text extraction is tentative until you review it.',
    ) +
    `<div class="work-actions">${button('upload', 'Upload a document')}${go('profile', 'My reviewed profile')}</div><p>Supported: CV, portfolio, transcript, project list, personal statement and LinkedIn export. PDFs are limited to 50 pages. Scanned images need OCR before upload. Downloads expire after 60 seconds; anyone holding the temporary link can use it until expiry.</p>${state.documents.length ? state.documents.map((d) => `<article class="work-card">${tag(d.processing_state, d.processing_state === 'Error' ? 'warning' : '')}<h2>${E(d.name)}</h2><p>${E(d.kind)} · ${(d.bytes / 1048576).toFixed(2)} MB · ${E(d.created_at.slice(0, 10))}</p>${d.error ? `<p role="alert">${E(d.error)}</p>` : ''}<div class="work-actions">${button('download-doc', 'Private download', d.id)}${button('process-doc', d.processing_state === 'Processing' ? 'Retry extraction' : 'Extract / retry text', d.id)}${d.extracted_text ? button('review-doc', 'Review extracted text', d.id) : ''}${button('upload', 'Replace', d.id)}${button('delete-doc', 'Delete file', d.id)}</div></article>`).join('') : empty('Start with a CV or add records manually.', go('profile', 'Add experience manually'))}`
  );
}
function uploadForm(replaceId) {
  modal(
    replaceId ? 'Replace document' : 'Upload a private document',
    choose(
      'Document type',
      'kind',
      [
        'CV',
        'Portfolio',
        'Transcript',
        'Project list',
        'Personal statement',
        'LinkedIn export',
      ],
      'CV',
    ) +
      '<label>PDF or DOCX · up to 10 MB<input name="file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label><p>Your file is uploaded privately. Extraction starts only when you choose Extract text. Reviewed records from a replaced document are retained.</p>',
    'Upload privately',
    async (fd) => {
      const f = fd.get('file'),
        bytes = new Uint8Array(await f.arrayBuffer()),
        type = validateDocument(f, bytes),
        path =
          uid +
          '/' +
          crypto.randomUUID() +
          '.' +
          f.name.split('.').at(-1).toLowerCase();
      await unwrap(
        db.storage
          .from('profile-documents')
          .upload(path, f, { contentType: type, upsert: false }),
      );
      try {
        await save('documents', {
          name: f.name.slice(0, 200),
          path,
          kind: fd.get('kind'),
          content_type: type,
          bytes: f.size,
        });
      } catch (err) {
        await db.storage.from('profile-documents').remove([path]);
        throw err;
      }
      if (replaceId) {
        try {
          await deleteDoc(replaceId);
        } catch {
          throw Error(
            'The new file was uploaded, but the old file could not be deleted. Close and retry its Delete button.',
          );
        }
      }
    },
  );
}
async function deleteDoc(id) {
  const doc = state.documents.find((x) => x.id === id);
  if (!doc) throw Error('Document no longer found. Refresh.');
  await unwrap(db.storage.from('profile-documents').remove([doc.path]));
  await remove('documents', id);
}
function reviewDoc(id) {
  const doc = state.documents.find((x) => x.id === id);
  const rows = doc.draft || [];
  modal(
    'Review extracted text',
    `<p>These are extracted lines with tentative categories, not verified CV facts. Edit each selected entry before saving. Uncheck contact details, duplicate lines and anything you do not want in your profile.</p><details><summary>View original extracted text</summary><pre class="work-extracted">${E(doc.extracted_text)}</pre></details>` +
      rows
        .map(
          (r, i) =>
            `<fieldset><legend><label class="work-check"><input type="checkbox" name="accept" value="${i}">Add entry ${i + 1}</label></legend>${choose('Type', 'kind-' + i, D.recordKinds, r.kind)}${input('Title', 'title-' + i, r.title, 'text', 'maxlength="200"')}${input('Organization', 'org-' + i, r.organization, 'text', 'maxlength="200"')}${textarea('Evidence / details', 'details-' + i, r.details, 4000)}<label class="work-check"><input type="checkbox" name="ai-${i}">Permit this reviewed entry for AI profile context</label></fieldset>`,
        )
        .join(''),
    'Save selected reviewed entries',
    async (fd) => {
      const selected = fd.getAll('accept').map(Number);
      if (!selected.length)
        throw Error('Select at least one entry, or close without saving.');
      const records = selected.map((i) => ({
        user_id: uid,
        kind: fd.get('kind-' + i),
        title: fd.get('title-' + i).trim(),
        organization: fd.get('org-' + i),
        details: fd.get('details-' + i),
        source_document: id,
        ai_allowed: fd.has('ai-' + i),
      }));
      if (records.some((x) => !x.title))
        throw Error('Each selected entry needs a title.');
      await unwrap(
        db.rpc('review_document_entries', {
          document_id: id,
          expected_revision: doc.revision || 0,
          entries: records.map(({ user_id, source_document, ...x }) => x),
          remaining_draft: rows.filter((_, i) => !selected.includes(i)),
        }),
      );
    },
  );
}
function plans() {
  if (!selectedPlan || !state.plans.some((x) => x.id === selectedPlan))
    selectedPlan = state.plans[0]?.id || '';
  const p = state.plans.find((x) => x.id === selectedPlan),
    today = new Date().toISOString().slice(0, 10),
    week = monday(),
    month = today.slice(0, 7);
  let items = state.plan_items
    .filter((x) => x.plan_id === selectedPlan)
    .sort(
      (a, b) =>
        a.week_start.localeCompare(b.week_start) ||
        a.position - b.position ||
        a.created_at.localeCompare(b.created_at),
    );
  items = items.filter(
    (x) =>
      planFilter === 'All' ||
      (planFilter === 'This week' && x.week_start === week) ||
      (planFilter === 'This month' && x.week_start.startsWith(month)) ||
      (planFilter === 'Deadlines' && x.due_date >= today) ||
      planFilter === x.state,
  );
  return (
    heading(
      'My development plan.',
      'Set a goal and a weekly limit. Add milestones, courses, projects and applications; adjust them as your priorities change.',
    ) +
    `<div class="work-actions">${orderUndo ? button('undo-order', 'Undo last reordering') : ''}${button('new-plan', 'Create plan')}${button('ai-plan', 'Draft a plan with AI')}</div>` +
    (p
      ? `<div class="work-card"><label>Plan<select id="work-plan">${select(
          state.plans.map((x) => [x.id, x.goal]),
          selectedPlan,
        )}</select></label><h2>${E(p.goal)}</h2><p>${p.weekly_hours} hours maximum per week · ${E(p.notes)}</p><div class="work-actions">${button('edit-plan', 'Edit goal / limit', p.id)}${button('new-item', 'Add task / milestone', p.id)}${button('delete-plan', 'Delete plan', p.id)}</div><label>Show<select id="work-plan-filter">${select(['All', 'This week', 'This month', 'Deadlines', 'Planned', 'In progress', 'Completed', 'Saved for later'], planFilter)}</select></label></div>${items.length ? items.map((x, i) => `<article class="work-card" draggable="true" data-plan-item="${E(x.id)}">${tag(x.state)} ${tag(x.kind)}<h3>${E(x.title)}</h3><p>Week of ${E(x.week_start)} · ${x.weekly_hours} hours ${x.due_date ? ' · Due ' + E(x.due_date) : ''}</p>${x.target_skill ? `<p>Target skill: ${E(D.skillMaps.flatMap((m) => m.skills).find((s) => s.id === x.target_skill)?.name || x.target_skill)}</p>` : ''}<p class="work-pre">${E(x.notes)}</p>${x.dependencies ? `<p>Dependencies / prerequisites: ${E(x.dependencies)}</p>` : ''}<div class="work-actions">${button('edit-item', 'Edit / update status', x.id)}${button('item-up', 'Move earlier', x.id)}${button('item-down', 'Move later', x.id)}${x.due_date ? button('calendar', 'Calendar reminder', x.id) : ''}${button('delete-item', 'Delete', x.id)}</div></article>`).join('') : empty('No tasks in this view.', button('new-item', 'Add a task', p.id))}`
      : empty(
          'Start with a goal and a realistic weekly time limit.',
          button('new-plan', 'Create my first plan'),
        ))
  );
}
function planForm(id) {
  const p = state.plans.find((x) => x.id === id) || {};
  modal(
    id ? 'Edit development plan' : 'Create development plan',
    input('Goal', 'goal', p.goal, 'text', 'required maxlength="200"') +
      input(
        'Weekly hours limit',
        'weekly_hours',
        p.weekly_hours || state.preferences.basic.hours || 5,
        'number',
        'required min="0.5" max="80" step="0.5"',
      ) +
      textarea('Notes', 'notes', p.notes),
    'Save plan',
    async (fd) => {
      const rows = await save('plans', {
        ...(id ? { id } : {}),
        goal: fd.get('goal').trim(),
        weekly_hours: Number(fd.get('weekly_hours')),
        notes: fd.get('notes'),
      });
      selectedPlan = rows[0].id;
    },
  );
}
function itemForm(id = '', title = '', planId = '') {
  const item = state.plan_items.find((x) => x.id === id) || {},
    p =
      state.plans.find(
        (x) => x.id === (item.plan_id || planId || selectedPlan),
      ) || state.plans[0];
  if (!p) return planForm();
  modal(
    id ? 'Edit plan item' : 'Add plan item',
    input(
      'Task or milestone',
      'title',
      item.title || title,
      'text',
      'required maxlength="200"',
    ) +
      `<div class="work-form-grid">${choose('Type', 'kind', ['Task', 'Milestone', 'Course', 'Skill', 'Application', 'Research', 'Project', 'Backup'], item.kind || 'Task')}${choose('Status', 'state', ['Planned', 'In progress', 'Completed', 'Saved for later'], item.state || 'Planned')}${input('Week starting Monday', 'week_start', item.week_start || monday(), 'date', 'required')}${input('Hours in this week', 'weekly_hours', item.weekly_hours ?? 1, 'number', 'required min="0" max="80" step="0.5"')}${input('Deadline / due date (optional)', 'due_date', item.due_date, 'date')}${choose(
        'Target skill (optional)',
        'target_skill',
        D.skillMaps
          .find((m) => m.fieldId === field)
          .skills.map((s) => [s.id, s.name]),
        item.target_skill,
      )}</div>` +
      input(
        'Dependencies / prerequisites',
        'dependencies',
        item.dependencies,
        'text',
        'maxlength="1000"',
      ) +
      textarea('Notes / source / backup option', 'notes', item.notes) +
      `<p>This plan allows ${p.weekly_hours} hours each week. Completed and saved-for-later tasks do not reserve time.</p>`,
    'Save task',
    async (fd) => {
      const candidate = {
        ...(id ? { id } : {}),
        plan_id: p.id,
        title: fd.get('title').trim(),
        kind: fd.get('kind'),
        state: fd.get('state'),
        week_start: fd.get('week_start'),
        weekly_hours: Number(fd.get('weekly_hours')),
        due_date: fd.get('due_date') || null,
        target_skill: fd.get('target_skill'),
        dependencies: fd.get('dependencies'),
        notes: fd.get('notes'),
        position:
          item.position ??
          state.plan_items.filter((x) => x.plan_id === p.id).length * 10,
      };
      checkBudget(p, state.plan_items, candidate);
      await save('plan_items', candidate);
    },
  );
}
function aiPlan() {
  modal(
    'Draft a plan with AI',
    input(
      'What would you like to achieve?',
      'goal',
      '',
      'text',
      'required maxlength="200"',
    ) +
      input(
        'Maximum hours per week',
        'hours',
        state.preferences.basic.hours || 5,
        'number',
        'required min="0.5" max="80" step="0.5"',
      ) +
      `<p>The AI receives your goal, time limit and public catalog. ${state.preferences.allow_profile_ai ? 'Your permitted profile context is also included.' : 'Your saved profile is excluded; enable sharing in Privacy if desired.'} Drafts are suggestions. You choose what to save.</p>`,
    'Generate draft',
    async (fd) => {
      const goal = fd.get('goal'),
        hours = Number(fd.get('hours'));
      const response = await A.fetch('/api/development', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, hours }),
        signal: AbortSignal.timeout(35000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Draft failed.');
      // Wait for the request form to close before opening the review dialog.
      setTimeout(() => reviewPlanDraft(goal, hours, result), 0);
    },
  );
}
function reviewPlanDraft(goal, hours, result) {
  const draft = result.draft;
  modal(
    'Review your AI plan draft',
    input('Plan goal', 'goal', goal, 'text', 'required maxlength="200"') +
      `<p>${E(result.notice)} Weekly limit: ${hours} hours.</p>` +
      draft.items
        .map(
          (x, i) =>
            `<fieldset><legend><label class="work-check"><input type="checkbox" name="accept" value="${i}" checked>Accept suggestion ${i + 1}</label></legend>${input('Task', 'title-' + i, x.title, 'text', 'maxlength="200"')}<div class="work-form-grid">${input('Hours', 'hours-' + i, x.hours, 'number', 'min="0.5" max="80" step="0.5"')}${input('Week offset (0 = this week)', 'week-' + i, x.weekOffset, 'number', 'min="0" max="12" step="1"')}</div><p>${E(x.reason)}</p><p>Dependencies: ${E(x.dependencies || 'None suggested')}</p>${x.resourceId ? `<p>Source: ${link(result.references.find((r) => r.id === x.resourceId)?.url, result.references.find((r) => r.id === x.resourceId)?.name || x.resourceId)}</p>` : ''}</fieldset>`,
        )
        .join(''),
    'Save accepted tasks as a new plan',
    async (fd) => {
      const chosen = fd.getAll('accept').map(Number);
      if (!chosen.length)
        throw Error('Select a suggestion or close to reject the draft.');
      const items = chosen.map((i, n) => {
        const x = draft.items[i],
          offset = Number(fd.get('week-' + i));
        if (!Number.isInteger(offset) || offset < 0 || offset > 12)
          throw Error('Week offset must be an integer from 0 to 12.');
        const date = new Date(monday() + 'T12:00:00Z');
        date.setUTCDate(date.getUTCDate() + offset * 7);
        return {
          title: fd.get('title-' + i).trim(),
          kind: x.kind,
          state: 'Planned',
          week_start: monday(date),
          weekly_hours: Number(fd.get('hours-' + i)),
          resource_id: x.resourceId,
          notes: x.reason,
          dependencies: x.dependencies,
          position: n * 10,
        };
      });
      for (let i = 0; i < items.length; i++) {
        if (!items[i].title) throw Error('Each selected task needs a title.');
        checkBudget({ weekly_hours: hours }, items.slice(0, i), items[i]);
      }
      const plans = await save('plans', {
        goal: fd.get('goal').trim(),
        weekly_hours: hours,
        notes: 'Reviewed AI draft; tasks may be adjusted.',
      });
      try {
        await unwrap(
          db
            .from('plan_items')
            .insert(
              items.map((x) => ({ ...x, user_id: uid, plan_id: plans[0].id })),
            ),
        );
      } catch (err) {
        await remove('plans', plans[0].id);
        throw err;
      }
      selectedPlan = plans[0].id;
      view = 'plan';
      window.ProspectoTracker.setView('plan');
      window.ProspectoNavigation?.navigate('plan');
    },
  );
}
function opportunities() {
  const legacy = window.OPPORTUNITIES.map((o) => ({
    ...o,
    name: o.name,
    region: o.region || o.location,
    country: o.location,
    format: o.formats?.join(' / '),
    funding: o.cost,
    status: o.openVerified && o.applicationUrl ? 'Open' : o.status,
    verification: o.archived
      ? 'Past cycle'
      : o.deadlineConfirmed
        ? 'Published provider deadline'
        : 'Next deadline not confirmed',
    closed: o.archived,
    recordId: 'opportunity-' + o.id,
    url: o.applicationUrl || o.sources[0][1],
    note: o.caution,
    educationLevels: [],
    fieldIds: D.majors
      .filter((m) =>
        o.fields.some(
          (f) =>
            m.name.toLowerCase().includes(f.toLowerCase()) ||
            m.aliases?.some((a) => f.toLowerCase().includes(a.toLowerCase())),
        ),
      )
      .map((m) => m.id),
  }));
  return [
    ...(window.PROSPECTO_INTELLIGENCE?.records || [])
      .filter(
        (r) =>
          ['opportunity', 'scholarship'].includes(r.kind) &&
          !r.id.startsWith('programme-') &&
          !r.id.startsWith('opportunity-') &&
          r.status !== 'Archived',
      )
      .map((r) => ({
        ...r,
        org: r.organization,
        recordId: r.id,
        educationLevels: r.stages || [],
        type:
          r.type || (r.kind === 'scholarship' ? 'Scholarship' : 'Programme'),
        funding: typeof r.funding === 'object' ? r.funding.coverage : r.funding,
        note: r.limitations,
        closed: ['Closed', 'Previous cycle', 'Archived'].includes(r.status),
        verification: r.status,
      })),
    ...D.opportunities.map((o) => ({ ...o, recordId: 'programme-' + o.id })),
    ...legacy,
    ...R.careers.map((o) => ({
      ...o,
      type:
        o.kind === 'Internship posting'
          ? 'Internship'
          : 'Internship / job directory',
      verification:
        o.kind === 'Internship posting' ? o.status : 'Employer directory',
      country: o.region,
      format: o.arrangement,
      funding: 'Varies by individual posting',
      note: o.deadlineNote,
      fieldIds: [],
      educationLevels: [],
      closed: o.status?.toLowerCase().includes('closed'),
    })),
  ];
}
let originOpportunityButton;
function deadlineLabel(o) {
  const final = o.finalDeadline || o.deadlineEnd;
  const regular = o.deadline;
  if (!final) return E(regular || 'Not confirmed');
  if (!regular || regular === final) return E(final);
  // A final/late cut-off must never hide an earlier regular deadline.
  return `${E(regular)} · final ${E(final)}`;
}
function opportunityDetails(o) {
  return `${statusBadge(o)}<p>${E(o.org)} · ${E(o.country || o.region)}</p><div class="work-actions opportunity-cta">${link(o.url, 'View official source')}${o.recordId ? `<button class="secondary" data-intel="save" data-id="${E(o.recordId)}">Save</button>` : ''}</div><h3>Who should check</h3><p>${E(o.eligibility)}</p><h3>Funding / costs</h3><p>${E(o.funding || 'Not verified')}</p><h3>Dates, format and commitment</h3><p>${deadlineLabel(o)} · ${E(o.duration || o.effort || 'Check the provider')} · ${E(o.format || 'Check the provider')}</p><h3>Before you apply</h3><p>${E(o.note || o.caution || 'Check the current eligibility and application notice at the source.')}</p><p>${E(fitReasons(o, state.preferences).reasons.join('; '))}</p><p class="resource-note">Reviewed ${E(o.checkedOn)}. ${E(verificationStatus(o).description)}</p>${button('quick-plan', 'Add preparation task', o.name)}`;
}
function finder() {
  const all = opportunities();
  let items = all.filter((o) => {
    const text = JSON.stringify(o).toLowerCase();
    return (
      (!search.field ||
        o.fieldIds?.includes(search.field) ||
        o.fields?.includes('All subjects')) &&
      (!search.region ||
        (o.region || '').toLowerCase().includes(search.region.toLowerCase())) &&
      (!search.stage ||
        o.educationLevels?.includes(search.stage) ||
        o.eligibilityTags?.some((t) =>
          search.stage === 'High school'
            ? /high school/i.test(t)
            : search.stage === 'Undergraduate degree'
              ? /university/i.test(t)
              : false,
        )) &&
      (!search.type || (o.type || '').includes(search.type)) &&
      (!search.format || text.includes(search.format.toLowerCase())) &&
      (!search.funding ||
        (/fund|paid|stipend|scholarship/i.test(o.funding || '') &&
          !/unpaid|unfunded|self-funded/i.test(o.funding || ''))) &&
      (!search.availability || !availability(o).startsWith('Closed'))
    );
  });
  if (search.q)
    items = rankEntries(items, search.q, {
      limit: items.length,
      floorRatio: 0,
    });
  items.sort((a, b) => {
    if (search.sort === 'name')
      return (a.name || '').localeCompare(b.name || '');
    if (search.sort === 'deadline')
      return (a.finalDeadline || a.deadline || '9999').localeCompare(
        b.finalDeadline || b.deadline || '9999',
      );
    if (search.q) return b.score - a.score;
    const af = fitReasons(a, state.preferences).fieldMatch,
      bf = fitReasons(b, state.preferences).fieldMatch;
    return (
      Number(bf) - Number(af) ||
      (a.finalDeadline || '9999').localeCompare(b.finalDeadline || '9999')
    );
  });
  return (
    heading(
      'DISCOVER',
      'Find your next opportunity.',
      'Explore programmes and official directories. Search first, then refine; every source keeps its review date.',
    ) +
    `<form id="work-search" class="work-form discovery-search-form"><label class="discovery-query">Search programmes, scholarships and directories<input id="work-search-q" name="q" type="search" maxlength="150" value="${E(search.q)}" placeholder="Try a subject, provider or location"></label><div class="work-actions discovery-search-actions"><button class="primary" type="submit">Search</button>${button('reset-search', 'Clear', '', 'text-button')}<button class="secondary" type="button" id="discovery-filter-toggle" aria-expanded="false" aria-controls="discovery-filters">Filters</button></div><details class="work-card discovery-filters" id="discovery-filters"><summary>Filters <span>Field, region, stage and availability</span></summary><div class="work-form-grid">${choose(
      'Field',
      'field',
      D.majors.map((x) => [x.id, x.name]),
      search.field,
      'All fields',
    )}${choose('Region', 'region', ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania', 'Middle East', 'Worldwide'], search.region, 'All regions')}${choose('Education stage', 'stage', D.stages, search.stage, 'All stages')}${choose('Opportunity type', 'type', D.opportunityTypes, search.type, 'All types')}${choose('Format', 'format', ['Remote', 'Hybrid', 'In person', 'On-site'], search.format, 'Any format')}${choose('Funding', 'funding', [['funded', 'Mentions funding / pay (verify)']], search.funding, 'Any funding')}${choose('Availability', 'availability', [['current', 'Exclude known closed / past cycles']], search.availability, 'Include preparation watchlists')}</div><div class="work-actions"><button class="primary">Apply filters</button>${button('reset-search', 'Reset')}${button('save-search', 'Save this search')}</div></details></form><div class="work-actions discovery-saved-searches">${state.saved_searches.map((s) => `<span>${button('load-search', s.name, s.id)}${button('delete-search', 'Remove ' + s.name, s.id, 'text-button')}</span>`).join('')}</div><div class="discovery-chips" role="group" aria-label="Active filters">${discoveryChips(
      search,
    )
      .map(
        (chip) =>
          `<button class="active-chip" type="button" data-work="clear-search-chip" data-id="${E(chip.key)}" aria-label="Remove filter ${E(chip.label)}">${E(chip.label)} <span aria-hidden="true">×</span></button>`,
      )
      .join(
        '',
      )}</div><div class="results-toolbar"><p><strong>${items.length} ${items.length === 1 ? 'record' : 'records'}</strong></p><label class="sort-label">Sort<select id="discovery-sort"><option value="relevance"${search.sort === 'name' || search.sort === 'deadline' ? '' : ' selected'}>Best fit</option><option value="deadline"${search.sort === 'deadline' ? ' selected' : ''}>Soonest deadline</option><option value="name"${search.sort === 'name' ? ' selected' : ''}>Name A–Z</option></select></label></div><p class="discovery-context">A directory is not an individual vacancy; unknown cycles are never labelled open.</p><div class="opportunity-browser"><div class="resource-grid opportunity-results">${
      items
        .map((o) => {
          const fit = fitReasons(o, state.preferences);
          return `<article class="work-card discovery-card" data-opportunity-card><div class="card-classification">${statusBadge(o)}${tag(o.type)}</div><h2><button class="title-button" data-work="opportunity-detail" data-id="${E(o.id)}">${E(o.name)}</button></h2><p class="discovery-provider">${E(o.org)} · ${E(o.country || o.region)}</p><a class="discovery-source" href="${E(o.url)}" data-view-source="${E(o.id)}" target="_blank" rel="noopener noreferrer">${E(sourceLinkLabel(o))}</a><p class="discovery-summary">${E(o.eligibility)}</p><dl class="discovery-facts"><div><dt>Funding / cost</dt><dd>${E(o.funding || 'Not verified')}</dd></div><div><dt>Application deadline</dt><dd>${deadlineLabel(o)}</dd></div></dl><p class="resource-note">Reviewed ${E(o.checkedOn)} · ${E(verificationStatus(o).description)}</p><div class="work-actions">${button('opportunity-detail', 'View details', o.id)}${o.recordId ? `<button class="text-button" data-intel="save" data-id="${E(o.recordId)}">Save</button>` : ''}${button('quick-plan', 'Add to plan', o.name, 'text-button')}</div></article>`;
        })
        .join('') || empty('No matches. Broaden a filter or reset the search.')
    }</div><aside class="work-card opportunity-preview" id="opportunity-preview" aria-labelledby="opportunity-preview-title" hidden></aside></div>`
  );
}
function universities() {
  const chosen = compareUniversities(comparison, R.universities);
  return (
    heading(
      'Search for universities.',
      'Compare laboratories, research, student projects and degree partnerships. Availability of a facility does not guarantee individual access.',
    ) +
    `<label>Search university, research or region<input id="work-university-search" type="search" maxlength="120" placeholder="e.g. materials, makerspace, Hong Kong"></label><p>Compare up to four universities. Programmes and partnerships can change; use the official sources linked on each profile.</p><div id="work-uni-compare">${
      chosen.length
        ? `<div class="work-table-wrap" role="region" aria-label="University comparison; scroll horizontally for more columns" tabindex="0"><table><caption>University capabilities comparison</caption><thead><tr><th>Capability</th>${chosen.map((x) => `<th>${E(x.name)} ${button('compare-uni', 'Remove', x.id, 'text-button')}</th>`).join('')}</tr></thead><tbody>${[
            ['Research & laboratories', 'research'],
            ['Student experience', 'experience'],
            ['Degree partnerships', 'partnership'],
            ['Access caveats', 'note'],
          ]
            .map(
              ([label, key]) =>
                `<tr><th>${label}</th>${chosen.map((x) => `<td>${E(x[key])}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody></table></div>`
        : ''
    }</div><div class="resource-grid" id="work-uni-list">${R.universities.map((o) => `<article class="work-card" data-university-text="${E(JSON.stringify(o).toLowerCase())}">${tag(o.region)}<h2>${E(o.name)}</h2><p>${E(o.fields.join(' · '))}</p><h3>Labs & research</h3><p>${E(o.research)}</p><h3>Student experiences</h3><p>${E(o.experience)}</p><h3>Degree partnerships</h3><p>${E(o.partnership)}</p><p class="resource-note">${E(o.note)} Checked ${o.checkedOn}.</p><div class="resource-links">${o.sources.map(([l, u]) => link(u, l)).join('')}</div><div class="work-actions">${button('compare-uni', comparison.includes(o.id) ? 'Remove from comparison' : 'Compare capabilities', o.id)}${button('quick-plan', 'Add exploration task', o.name)}</div></article>`).join('')}</div>`
  );
}
function pathways() {
  const shared = sharedPathId(window.location.href);
  const highlighted = shared ? D.pathways.find((p) => p.id === shared) : null;
  const banner = highlighted
    ? `<section class="work-card shared-path glass-panel"><span class="work-tag">Shared path</span><h2>${E(highlighted.name)}</h2><p>${E(highlighted.education)}</p><p class="resource-note">Shared from the public catalog. No personal data was included; verify the source before acting.</p></section>`
    : '';
  return (
    heading(
      'Career pathways to explore.',
      'Illustrative routes assembled from occupational sources. These are not biographies, employer endorsements or guaranteed careers.',
    ) +
    banner +
    `<div class="resource-grid">${D.pathways.map((p) => `<article class="work-card${p.id === shared ? ' is-shared' : ''}"><span class="work-tag">Illustrative learning archetype</span><h2>${E(p.name)}</h2><h3>Education & foundations</h3><p>${E(p.education)}</p><p>${E(p.foundations.join(' · '))}</p><h3>Tools & projects</h3><p>${E(p.tools.join(' · '))}</p><p>${E(p.projects.join(' '))}</p><details><summary>Experience, progression & sample plan</summary><h3>Internships</h3><p>${E(p.internships)}</p><h3>Research & teamwork</h3><p>${E(p.research)} ${E(p.teamwork)}</p><h3>Early roles</h3><p>${E(p.earlyRoles)}</p><h3>Progression & alternatives</h3><p>${E(p.progression)} ${E(p.alternatives)}</p><ol>${p.samplePlan.map((x) => `<li><strong>${E(x.phase)}</strong>: ${E(x.task)}</li>`).join('')}</ol></details><p class="resource-note">${E(p.note)} Checked ${p.checkedOn}.</p><div class="resource-links">${p.sources.map(([l, u]) => link(u, l)).join('')}</div><div class="work-actions">${button('quick-plan', 'Start a preparation task', p.name)}${shareLinkHTML(window.location.origin, p.id)}</div></article>`).join('')}</div>`
  );
}
function privacy() {
  const p = state.preferences;
  return (
    heading(
      'Privacy & account controls.',
      'Review, export and delete your information. Only you can read your private workspace through the app.',
    ) +
    `<section class="work-card"><h2>AI profile sharing</h2><form id="work-privacy" class="work-form"><label class="work-check"><input name="allow_profile_ai" type="checkbox" ${p.allow_profile_ai ? 'checked' : ''}>Allow saved preferences, skills, course progress, activities and plans in AI requests. Individually permitted profile records are included; other records, raw document text, files and signed URLs are excluded.</label><p>Your chat message and filters you type into the assistant are sent when you ask it a question. Chats are kept in this tab only. Your text may be processed under the AI provider’s terms; Methodos does not use it to train a model. No document contents are sent to analytics.</p><h3>In-app reminders</h3><label class="work-check"><input name="in_app_reminders" type="checkbox" ${p.in_app_reminders ? 'checked' : ''}>Show dated tasks in my dashboard</label>${choose(
      'Reminder window',
      'reminder_days',
      [
        ['3', '3 days'],
        ['7', '7 days'],
        ['14', '14 days'],
        ['30', '30 days'],
      ],
      String(p.reminder_days),
    )}<button class="primary">Save preferences</button></form></section><section class="work-card"><h2>Your data</h2><p>Export includes your profile, records, document text and metadata, skills, courses, plans, searches, recent views, activities and tracker. It excludes login tokens and temporary file URLs. Download original documents separately.</p><p><strong>Anonymous usage counts.</strong> Methodos records which views, searches, saves and next steps are used, with a random per-tab ID that is not linked to your account, email or notes. Search text, filters you type, notes, document names or contents, file URLs and email addresses are never included. Do Not Track and Global Privacy Control disable these counts. Daily counters are deleted after 30 days.</p><div class="work-actions">${button('export', 'Export my data (.json)')}${go('documents', 'Manage / delete documents')}${go('profile', 'Edit / delete profile records')}${button('clear-recent', 'Clear recent sources')}${go('assistant', 'Clear chat in assistant')}</div></section><section class="work-card"><h2>Delete account</h2><p>Deletion permanently removes your login, documents and private workspace. You must sign in again within five minutes and type the confirmation phrase. This cannot be undone.</p><div id="work-delete-capability">Checking deletion availability…</div></section>`
  );
}
async function render(next) {
  view = next;
  if (next !== 'finder') focusFinderQuery = false;
  const panel = document.querySelector('#platform-panel');
  if (
    !uid &&
    !['finder', 'courses', 'skills', 'pathways', 'universities'].includes(next)
  ) {
    panel.innerHTML = gateHTML(
      next === 'documents'
        ? 'private documents and uploads'
        : 'your personal plans and saved work',
    );
    return;
  }
  panel.innerHTML =
    '<div class="loading-skeleton" role="status" aria-label="Loading view"><span></span><span></span><span></span></div>';
  try {
    await load();
    const history = next === 'my-learning' ? await fetchLearning() : null;
    if (view !== next) return;
    if (next === 'my-learning') learningRows = history || [];
    const renderers = {
      dashboard,
      'my-learning': () => myLearning(history),
      onboarding,
      profile,
      documents,
      courses,
      skills: skillMap,
      plan: plans,
      pathways,
      finder,
      privacy,
      universities,
    };
    panel.innerHTML =
      `<p id="work-status" class="work-status" role="status"></p>` +
      renderers[next]();
    if (next === 'finder' && focusFinderQuery) {
      focusFinderQuery = false;
      panel.querySelector('#work-search-q')?.focus();
    }
    const calendarScroll = panel.querySelector('.learning-scroll');
    if (calendarScroll) {
      const selected = calendarScroll.querySelector('[aria-pressed="true"]');
      calendarScroll.scrollLeft = selected
        ? selected.offsetLeft - calendarScroll.clientWidth / 2
        : calendarScroll.scrollWidth;
    }
    if (next === 'privacy') {
      const response = await A.fetch('/api/account');
      const data = await response.json();
      const target = document.querySelector('#work-delete-capability');
      if (target)
        target.innerHTML =
          response.ok && data.deletionConfigured
            ? button('delete-account', 'Delete my account')
            : '<p>Account deletion is not yet enabled. The site owner must add the server-only Supabase secret in Vercel. You can delete individual records and files now.</p>';
    }
  } catch (err) {
    if (view !== next) return;
    panel.innerHTML = `<div role="alert" class="work-card"><p>${E(err.message)}</p>${button('retry', 'Retry loading')}</div>`;
  }
}
window.ProspectoWorkspace = {
  views,
  render,
  getState: async () => {
    await load();
    return state;
  },
  modal,
  openOpportunitySearch: (query) => {
    search = { q: query.trim().slice(0, 150) };
    window.ProspectoNavigation?.navigate('finder');
  },
  focusOpportunitySearch: () => {
    const input = document.querySelector('#work-search-q');
    if (document.body.dataset.currentView === 'finder' && input) {
      input.focus();
      return;
    }
    focusFinderQuery = true;
    window.ProspectoNavigation?.navigate('finder');
  },
  openTask: (title) =>
    uid ? itemForm('', title) : A.promptSignIn?.('create a personal plan'),
};
async function action(name, id, element) {
  if (
    !uid &&
    ![
      'go',
      'retry',
      'compare-uni',
      'reset-search',
      'reset-courses',
      'course-page',
      'opportunity-detail',
      'close-opportunity-detail',
    ].includes(name)
  ) {
    A.promptSignIn?.('save and personalize your learning');
    return;
  }
  if (name === 'log-learning') return learningForm(id);
  if (name === 'edit-learning') {
    const entry = learningRows.find((row) => row.id === id);
    if (entry) return learningForm(entry.course_id, entry);
  }
  if (name === 'delete-learning') {
    if (
      !learningRows.some((row) => row.id === id) ||
      !confirm('Remove this learning activity from your calendar?')
    )
      return;
    await unwrap(
      db.from('learning_activity').delete().eq('user_id', uid).eq('id', id),
    );
    document.getElementById('work-dialog')?.close();
    return render('my-learning');
  }
  if (name === 'reset-courses') {
    coursePage = 1;
    courseSearch = '';
    selectedProvider = '';
    selectedFormat = '';
    return render('courses');
  }
  if (name === 'course-page') {
    coursePage = Number(id);
    await render('courses');
    document
      .querySelector('.course-pagination button:not([disabled])')
      ?.focus();
    document
      .querySelector('.course-pagination')
      ?.scrollIntoView({ block: 'start' });
    return;
  }
  if (name === 'go') {
    if (window.ProspectoNavigation) window.ProspectoNavigation.navigate(id);
    else {
      window.ProspectoTracker.setView(id);
      history.pushState({ view: id }, '', '#' + id);
    }
    return;
  }
  if (name === 'opportunity-detail') {
    const o = opportunities().find((r) => r.id === id);
    if (!o) throw Error('This record is unavailable.');
    const preview = document.getElementById('opportunity-preview');
    if (preview && window.matchMedia('(min-width: 1280px)').matches) {
      originOpportunityButton = element;
      document
        .querySelector('.opportunity-results [data-selected]')
        ?.removeAttribute('data-selected');
      element
        .closest('[data-opportunity-card]')
        ?.setAttribute('data-selected', 'true');
      preview.innerHTML = `<header class="opportunity-preview-header"><h2 id="opportunity-preview-title" tabindex="-1">${E(o.name)}</h2>${button('close-opportunity-detail', 'Close details', '', 'text-button')}</header>${opportunityDetails(o)}`;
      preview.hidden = false;
      preview.parentElement.classList.add('has-preview');
      preview.querySelector('h2').focus();
      return;
    }
    return modal(o.name, opportunityDetails(o), '', null);
  }
  if (name === 'close-opportunity-detail') {
    const preview = document.getElementById('opportunity-preview');
    if (!preview) return;
    preview.hidden = true;
    preview.parentElement.classList.remove('has-preview');
    originOpportunityButton
      ?.closest('[data-opportunity-card]')
      ?.removeAttribute('data-selected');
    originOpportunityButton?.focus();
    originOpportunityButton = null;
    return;
  }
  if (name === 'retry') {
    ready = false;
    return render(view);
  }
  if (name === 'onboard-back') {
    await save('preferences', {
      ...state.preferences,
      onboarding_step: Math.max(0, state.preferences.onboarding_step - 1),
    });
    return refresh();
  }
  if (name === 'onboard-skip') {
    await save('preferences', {
      ...state.preferences,
      onboarding_complete: true,
    });
    await load(true);
    if (window.ProspectoNavigation)
      window.ProspectoNavigation.navigate('dashboard');
    else window.ProspectoTracker.setView('dashboard');
    return;
  }
  if (name === 'record') return recordForm(id);
  if (name === 'delete-record') {
    if (confirm('Delete this profile record?')) {
      await remove('profile_records', id);
      await refresh();
    }
    return;
  }
  if (name === 'delete-skill' || name === 'delete-course') {
    if (confirm('Delete this saved learning record?')) {
      await unwrap(
        db
          .from(name === 'delete-skill' ? 'user_skills' : 'course_progress')
          .delete()
          .eq('user_id', uid)
          .eq(name === 'delete-skill' ? 'skill_id' : 'course_id', id),
      );
      document.querySelector('#work-dialog')?.close();
      await refresh();
    }
    return;
  }
  if (name === 'skill') return skillForm(id);
  if (name === 'course') return courseForm(id);
  if (name === 'upload') return uploadForm(id);
  if (name === 'delete-doc') {
    if (
      confirm(
        'Delete this private file and its extracted text? Reviewed profile records will remain editable.',
      )
    ) {
      await deleteDoc(id);
      await refresh();
    }
    return;
  }
  if (name === 'download-doc') {
    const d = state.documents.find((x) => x.id === id);
    const signed = await unwrap(
      db.storage
        .from('profile-documents')
        .createSignedUrl(d.path, 60, { download: d.name }),
    );
    const a = document.createElement('a');
    a.href = signed.signedUrl;
    a.rel = 'noopener noreferrer';
    a.click();
    notify('Private download created; its link expires in 60 seconds.');
    return;
  }
  if (name === 'process-doc') {
    const response = await A.fetch('/api/document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(25000),
    });
    const result = await response.json();
    await load(true);
    if (!response.ok) {
      render(view);
      throw Error(result.error);
    }
    return render(view);
  }
  if (name === 'review-doc') return reviewDoc(id);
  if (name === 'new-plan') {
    track('next_step', { action: 'plan' });
    return planForm();
  }
  if (name === 'edit-plan') return planForm(id);
  if (name === 'delete-plan') {
    if (confirm('Delete this plan and all its tasks?')) {
      await remove('plans', id);
      await refresh();
    }
    return;
  }
  if (name === 'new-item') {
    track('next_step', { action: 'task' });
    return itemForm('', '', id);
  }
  if (name === 'quick-plan') {
    track('next_step', { action: 'quick_plan' });
    return itemForm('', id);
  }
  if (name === 'edit-item') return itemForm(id);
  if (name === 'delete-item') {
    if (confirm('Delete this task?')) {
      await remove('plan_items', id);
      await refresh();
    }
    return;
  }
  if (name === 'undo-order') {
    if (orderUndo) {
      await unwrap(db.from('plan_items').upsert(orderUndo));
      orderUndo = null;
      await refresh();
      notify('Previous task order restored.');
    }
    return;
  }
  if (name === 'item-up' || name === 'item-down') {
    const item = state.plan_items.find((x) => x.id === id),
      rows = state.plan_items
        .filter(
          (x) => x.plan_id === item.plan_id && x.week_start === item.week_start,
        )
        .sort(
          (a, b) =>
            a.position - b.position || a.created_at.localeCompare(b.created_at),
        );
    const index = rows.findIndex((x) => x.id === id),
      other = rows[index + (name === 'item-up' ? -1 : 1)];
    if (!other) {
      notify(
        'This task is already at the edge of its week. Edit its week to move it further.',
      );
      return;
    }
    orderUndo = rows.map((x) => ({ ...x }));
    [rows[index], rows[index + (name === 'item-up' ? -1 : 1)]] = [other, item];
    await unwrap(
      db
        .from('plan_items')
        .upsert(rows.map((x, i) => ({ ...x, position: i * 10 }))),
    );
    return refresh();
  }
  if (name === 'ai-plan') return aiPlan();
  if (name === 'calendar') {
    const item = state.plan_items.find((x) => x.id === id);
    if (!item) return;
    const ics = buildCalendar({
      prodId: '-//Methodos//Personal plan//EN',
      events: [
        {
          uid: 'task-' + item.id,
          date: item.due_date,
          title: item.title,
          description:
            'Personal preparation task. Verify official application deadlines and timezone separately.',
        },
      ],
    });
    download(ics, 'prospectoai-task.ics', 'text/calendar');
    return;
  }
  if (name === 'export-deadlines') {
    const ranked = triageDeadlines({
      opportunities: D.opportunities,
      tasks: state.plan_items,
      windowDays: state.preferences?.reminder_days || 30,
    });
    if (!ranked.length) {
      notify('No dated deadlines in this window to export.');
      return;
    }
    const ics = buildCalendar({
      events: deadlineEvents(ranked, { source: 'deadline' }),
    });
    download(ics, 'prospectoai-deadlines.ics', 'text/calendar');
    notify(
      `${ranked.length} date${ranked.length === 1 ? '' : 's'} exported. Calendar apps may take a minute to import the file.`,
    );
    return;
  }
  if (name === 'compare-uni') {
    if (comparison.includes(id))
      comparison = comparison.filter((x) => x !== id);
    else {
      compareUniversities([...comparison, id], R.universities);
      comparison.push(id);
    }
    return render(view);
  }
  if (name === 'clear-search-chip') {
    search = clearDiscoveryChip(search, id);
    return render(view);
  }
  if (name === 'reset-search') {
    search = {
      q: '',
      field: '',
      region: '',
      stage: '',
      type: '',
      format: '',
      funding: '',
      availability: '',
    };
    return render(view);
  }
  if (name === 'save-search')
    return modal(
      'Save this search',
      input('Search name', 'name', '', 'text', 'required maxlength="80"'),
      'Save search',
      async (fd) =>
        save('saved_searches', {
          name: fd.get('name').trim(),
          criteria: search,
        }),
    );
  if (name === 'load-search') {
    search = { ...state.saved_searches.find((x) => x.id === id).criteria };
    return render(view);
  }
  if (name === 'delete-search') {
    await remove('saved_searches', id);
    return refresh();
  }
  if (name === 'clear-recent') {
    if (confirm('Clear your recent source history?')) {
      await unwrap(db.from('recent_views').delete().eq('user_id', uid));
      await refresh();
    }
    return;
  }
  if (name === 'export') {
    const learningActivity = await fetchLearning();
    await load(true);
    const other = await Promise.all(
      [
        'profiles',
        'activities',
        'trackers',
        'admissions_folders',
        'admissions_items',
        'folder_documents',
        'saved_resources',
        'evidence_links',
        'notification_states',
      ].map((t) => db.from(t).select('*').eq('user_id', uid)),
    );
    if (other.some((x) => x.error))
      throw Error('Export could not include all records. Please retry.');
    download(
      JSON.stringify(
        {
          product: 'Methodos',
          exportedAt: new Date().toISOString(),
          ...state,
          ...(learningActivity === null
            ? {}
            : { learning_activity: learningActivity }),
          profile: other[0].data,
          activities: other[1].data,
          tracker: other[2].data,
          ...Object.fromEntries(
            [
              'admissions_folders',
              'admissions_items',
              'folder_documents',
              'saved_resources',
              'evidence_links',
              'notification_states',
            ].map((name, i) => [name, other[i + 3].data]),
          ),
        },
        null,
        2,
      ),
      'prospectoai-private-export.json',
      'application/json',
    );
    notify(
      'Export downloaded. It contains private information; store it carefully.',
    );
    return;
  }
  if (name === 'delete-account')
    return modal(
      'Permanently delete account',
      `<p>Sign in again first if your last login was more than five minutes ago. All private records and files will be removed.</p>${input('Type DELETE MY ACCOUNT', 'confirmation', '', 'text', 'required')}`,
      'Delete permanently',
      async (fd) => {
        const response = await A.fetch('/api/account', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: fd.get('confirmation') }),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        await db.auth.signOut();
        location.replace('/login');
      },
    );
}
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.addEventListener('click', async (e) => {
  const studyDay = e.target.closest('[data-study-day]');
  if (studyDay) return selectLearningDay(studyDay.dataset.studyDay);
  const filterButton = e.target.closest('#discovery-filter-toggle');
  if (filterButton) {
    const panel = document.getElementById('discovery-filters');
    if (!panel) return;
    const open = !panel.open;
    panel.open = open;
    filterButton.setAttribute('aria-expanded', String(open));
    return;
  }
  const source = e.target.closest('[data-view-source]');
  if (source && uid && ready) {
    const o = opportunities().find((x) => x.id === source.dataset.viewSource);
    if (o)
      save('recent_views', {
        resource_id: o.id,
        title: o.name,
        kind: o.type || 'Opportunity',
        viewed_at: new Date().toISOString(),
      })
        .then(() => load(true))
        .catch(() =>
          notify('Source opened; recent history could not be saved.'),
        );
  }
  const target = e.target.closest('[data-work]');
  if (!target) return;
  target.disabled = true;
  try {
    await action(target.dataset.work, target.dataset.id, target);
  } catch (err) {
    notify(err.message);
  } finally {
    if (target.isConnected) target.disabled = false;
  }
});
document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (!['work-onboarding', 'work-privacy', 'work-search'].includes(f.id))
    return;
  e.preventDefault();
  if (!uid && f.id !== 'work-search') {
    A.promptSignIn?.('change your private settings');
    return;
  }
  const b = f.querySelector('[type=submit],button.primary');
  b.disabled = true;
  try {
    const fd = new FormData(f);
    if (f.id === 'work-search') {
      search = Object.fromEntries(fd.entries());
      return render(view).then(() =>
        document.querySelector('.results-toolbar')?.scrollIntoView({
          block: 'start',
        }),
      );
    }
    if (f.id === 'work-privacy') {
      await save('preferences', {
        ...state.preferences,
        allow_profile_ai: fd.has('allow_profile_ai'),
        in_app_reminders: fd.has('in_app_reminders'),
        reminder_days: Number(fd.get('reminder_days')),
      });
      await load(true);
      notify('Privacy and reminder preferences saved.');
      return;
    }
    const step = Number(f.dataset.step),
      p = {
        ...state.preferences,
        basic: { ...state.preferences.basic },
        updated_at: new Date().toISOString(),
      };
    if (step === 0 || step === 3)
      for (const [k, v] of fd.entries())
        if (k !== 'allow_profile_ai') p.basic[k] = v;
    if (step === 1) {
      p.field_ids = fd.getAll('fields');
      p.goals = fd.getAll('goals');
      if (p.field_ids.length > 8 || p.goals.length > 8)
        throw Error('Choose up to eight fields and eight goals.');
    }
    if (step === 3) p.allow_profile_ai = fd.has('allow_profile_ai');
    p.onboarding_step = Math.min(4, step + 1);
    p.onboarding_complete = step === 3;
    await save('preferences', p);
    await load(true);
    if (step === 3) {
      window.ProspectoTracker.setView('dashboard');
      window.ProspectoNavigation?.navigate('dashboard');
    } else render(view);
  } catch (err) {
    notify(err.message);
  } finally {
    if (b.isConnected) b.disabled = false;
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'learning-date') return selectLearningDay(e.target.value);
  if (['work-course-provider', 'work-course-format'].includes(e.target.id)) {
    const id = e.target.id;
    if (id === 'work-course-provider') selectedProvider = e.target.value;
    else selectedFormat = e.target.value;
    coursePage = 1;
    render('courses').then(() => document.getElementById(id)?.focus());
  }
  if (e.target.id === 'work-field') {
    field = e.target.value || D.majors[0].id;
    render(view);
  }
  if (e.target.id === 'discovery-sort') {
    search.sort = e.target.value;
    return render(view);
  }
  if (e.target.id === 'work-plan') {
    selectedPlan = e.target.value;
    render(view);
  }
  if (e.target.id === 'work-plan-filter') {
    planFilter = e.target.value || 'All';
    render(view);
  }
});
let searchTimer;
document.addEventListener('input', (e) => {
  if (e.target.id === 'work-course-search') {
    const pos = e.target.selectionStart;
    courseSearch = e.target.value;
    coursePage = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      await render(view);
      const input = document.querySelector('#work-course-search');
      input?.focus();
      input?.setSelectionRange(pos, pos);
    }, 200);
  }
  if (e.target.id === 'work-university-search') {
    const q = e.target.value.toLowerCase();
    document
      .querySelectorAll('[data-university-text]')
      .forEach((x) => (x.hidden = !x.dataset.universityText.includes(q)));
  }
});

// Pointer ordering complements the visible keyboard buttons; it never changes a task's week.
document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('[data-plan-item]');
  if (card && e.dataTransfer) {
    e.dataTransfer.setData('text/plain', card.dataset.planItem);
    e.dataTransfer.effectAllowed = 'move';
  }
});
document.addEventListener('dragover', (e) => {
  if (e.target.closest('[data-plan-item]')) e.preventDefault();
});
document.addEventListener('drop', async (e) => {
  const card = e.target.closest('[data-plan-item]');
  if (!card || !e.dataTransfer) return;
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain'),
    a = state.plan_items.find((x) => x.id === id),
    b = state.plan_items.find((x) => x.id === card.dataset.planItem);
  if (!a || !b || a.id === b.id) return;
  if (a.plan_id !== b.plan_id || a.week_start !== b.week_start) {
    notify('Reorder within a week. Edit the task to change its week.');
    return;
  }
  const rows = state.plan_items
    .filter((x) => x.plan_id === a.plan_id && x.week_start === a.week_start)
    .sort((x, y) => x.position - y.position);
  orderUndo = rows.map((x) => ({ ...x }));
  rows.splice(
    rows.findIndex((x) => x.id === id),
    1,
  );
  rows.splice(
    rows.findIndex((x) => x.id === b.id),
    0,
    a,
  );
  try {
    await unwrap(
      db
        .from('plan_items')
        .upsert(rows.map((x, i) => ({ ...x, position: i * 10 }))),
    );
    await refresh();
    notify('Task order updated. Undo is available above the plan.');
  } catch (error) {
    notify(error.message);
  }
});
