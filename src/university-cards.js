export const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export function officialLink(url, label) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return '';
    return `<a href="${escape(u.href)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
  } catch {
    return '';
  }
}
export function filterUniversities(
  records,
  { query = '', country = '', field = '', sort = 'name' } = {},
) {
  const q = query.trim().toLocaleLowerCase();
  return records
    .filter(
      (r) =>
        r.kind === 'university' &&
        r.status !== 'Archived' &&
        (!country || r.country === country) &&
        (!field || r.fieldIds?.includes(field)) &&
        (!q ||
          [
            r.name,
            r.country,
            r.city,
            r.research,
            r.experience,
            ...(r.fields || []),
          ]
            .join(' ')
            .toLocaleLowerCase()
            .includes(q)),
    )
    .sort(
      (a, b) =>
        (sort === 'country'
          ? (a.country || '').localeCompare(b.country || '')
          : 0) || a.name.localeCompare(b.name),
    );
}
export function universityCard(record, actions = '') {
  const r = record;
  const initials = r.name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('');
  return `<article class="intel-university university-card"><header><span class="university-monogram" aria-hidden="true">${escape(initials)}</span><div class="university-heading"><h2>${escape(r.name)}</h2><p class="university-place"><span>Location</span> ${escape(
    [r.country, r.city]
      .filter(Boolean)
      .filter((x, i, a) => a.indexOf(x) === i)
      .join(' · ') ||
      r.region ||
      'Not stated in this profile',
  )}</p><p class="university-review">${escape(r.institutionType || 'University research profile')} · Reviewed ${escape(r.checkedOn || 'date unavailable')}</p></div></header><div class="university-context"><span class="verification-badge status-directory">Research directory profile</span><p class="resource-note">Not an open vacancy or an admissions offer. Confirm access and dates with the institution.</p></div><div class="resource-tags">${(
    r.fields || []
  )
    .slice(0, 4)
    .map((f) => `<span>${escape(f)}</span>`)
    .join(
      '',
    )}</div><h3 class="research-label">Research context</h3><p class="university-summary">${escape(r.research || 'Research strengths are not established in this profile. Use official sources below.')}</p><div class="university-actions">${actions}</div><details class="university-details"><summary>Research, admissions & campus details</summary><section><h3>For enrolled students</h3><p>${escape(r.experience || 'Explore the university’s official student resources.')}</p><h3>Partnerships & flexibility</h3><p>${escape(r.partnership || 'Check the university’s current programme information.')}</p>${r.interdisciplinary ? `<p>${escape(r.interdisciplinary)}</p>` : ''}<h3>Admissions sources</h3><p>Requirements vary by programme and applicant background. No admission chance or eligibility guarantee is assigned.</p><div class="resource-links">${
    Object.entries(r.admissions || {})
      .map(([label, url]) => officialLink(url, label))
      .join('') ||
    '<span>Use the official university sources below for current admissions routes.</span>'
  }</div>${r.locationSummary ? `<h3>Campus & support</h3><p>${escape(r.locationSummary)}</p>` : ''}${r.careerServices ? `<p>${escape(r.careerServices)}</p>` : ''}<p class="resource-note">${escape(r.note || r.limitations || 'Institutional capabilities do not guarantee access to a laboratory, project or place.')}</p><h3>Official sources</h3><div class="resource-links">${(r.sources || []).map(([label, url]) => officialLink(url, label)).join('')}</div><p class="resource-note">A university profile is not an open vacancy. Confirm access, eligibility and current dates with the institution.</p></section></details></article>`;
}
