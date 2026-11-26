// Pure helpers for the signed-in opportunity finder. Kept separate from the
// DOM so filter labels and removal rules can be tested without a browser.
import { verificationStatus } from './intelligence-core.js';

const LABELS = {
  q: (value) => `Search: ${value}`,
  field: (value) => `Field: ${value}`,
  region: (value) => `Region: ${value}`,
  stage: (value) => `Stage: ${value}`,
  type: (value) => `Type: ${value}`,
  format: (value) => `Format: ${value}`,
  funding: () => 'Mentions funding',
  availability: () => 'Current only',
};

export function discoveryChips(search = {}) {
  return Object.entries(LABELS)
    .filter(([key]) => String(search[key] || '').trim())
    .map(([key, label]) => ({
      key,
      label: label(String(search[key]).trim()),
    }));
}

export function clearDiscoveryChip(search = {}, key) {
  if (!(key in LABELS)) return search;
  const next = { ...search };
  next[key] = '';
  return next;
}

export function sourceLinkLabel(record) {
  if (
    record?.isDirectory ||
    record?.status === 'Directory / Evergreen' ||
    verificationStatus(record)?.label === 'Directory / Evergreen'
  )
    return 'View directory ↗';
  if (/admission/i.test(record?.sourceLabel || '')) return 'View admissions ↗';
  return 'View official source ↗';
}
