#!/usr/bin/env node
// Correct derived statuses in the published intelligence catalog without
// rewriting source catalogs or inventing facts. Mirrors of data/opportunities.json
// must agree with their source: archived cycles are Previous cycle, and a
// confirmed future deadline is Upcoming (never "Deadline not announced").
import { readFileSync, writeFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync('data/opportunities.json', 'utf8'));
const intelligence = JSON.parse(readFileSync('data/intelligence.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);
let changed = 0;

for (const source of catalog.opportunities) {
  const mirror = intelligence.records.find(
    (r) => r.id === `opportunity-${source.id}`,
  );
  if (!mirror) continue;
  const expected = source.archived
    ? 'Previous cycle'
    : source.openVerified && source.applicationUrl
      ? 'Open'
      : !source.archived &&
          source.finalDeadline &&
          source.deadlineConfirmed &&
          source.finalDeadline >= today
        ? 'Upcoming'
        : 'Deadline not announced';
  if (mirror.status !== expected || mirror.archived !== !!source.archived) {
    mirror.status = expected;
    mirror.archived = !!source.archived;
    changed++;
  }
}

writeFileSync(
  'data/intelligence.json',
  JSON.stringify(intelligence, null, 2) + '\n',
);
console.log(
  `Normalized ${changed} derived opportunity status(es) from the reviewed catalog.`,
);
