export function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
}
export function glassBadge(text, extraClass = '') {
  return `<span class="glass-chip ${extraClass}">${escapeHTML(text)}</span>`;
}
export function glassCard({
  kicker = '',
  title = '',
  body = '',
  actions = '',
  extraClass = '',
} = {}) {
  return `<section class="glass-panel ${extraClass}">${
    kicker ? `<span class="eyebrow">${escapeHTML(kicker)}</span>` : ''
  }${title ? `<h2>${escapeHTML(title)}</h2>` : ''}${body}${
    actions ? `<div class="work-actions">${actions}</div>` : ''
  }</section>`;
}
export function glassStat(label, value, extraClass = '') {
  return `<div class="glass-card glass-stat ${extraClass}"><strong>${escapeHTML(value)}</strong><p>${escapeHTML(label)}</p></div>`;
}
