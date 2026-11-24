const ISO = /^\d{4}-\d{2}-\d{2}$/;
function validDay(value) {
  if (typeof value !== 'string' || !ISO.test(value)) return null;
  const time = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(time)) return null;
  // Date.parse normalises impossible days (2026-02-31 becomes 3 March), so
  // round-trip the value and reject anything the calendar had to change.
  return new Date(time).toISOString().slice(0, 10) === value ? value : null;
}
function daysBetween(today, date) {
  return Math.round(
    (Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) /
      86400000,
  );
}
export function triageDeadlines({
  opportunities = [],
  tasks = [],
  today = new Date().toISOString().slice(0, 10),
  windowDays = 30,
  limit = 8,
} = {}) {
  const end = Math.min(Math.max(Number(windowDays) || 30, 1), 180);
  const items = [];
  for (const o of opportunities) {
    if (o.closed || o.archived || o.status === 'Archived') continue;
    const date = validDay(o.finalDeadline || o.deadline);
    if (!date) continue;
    const days = daysBetween(today, date);
    if (days < 0 || days > end) continue;
    const confirmed =
      o.deadlineConfirmed === true ||
      /confirmed/i.test(o.verification || '') ||
      /verified open/i.test(o.status || '');
    items.push({
      id: o.id || o.name,
      title: o.name,
      date,
      days,
      source: 'provider',
      confirmed,
      url: o.url || o.sources?.[0]?.[1],
      reason: confirmed
        ? `Published deadline in ${days} day${days === 1 ? '' : 's'}.`
        : `Unconfirmed date in ${days} day${days === 1 ? '' : 's'} — verify at the provider.`,
    });
  }
  for (const task of tasks) {
    if (task.state === 'Completed' || task.status === 'Completed') continue;
    const date = validDay(task.due_date);
    if (!date) continue;
    const days = daysBetween(today, date);
    if (days < 0 || days > end) continue;
    items.push({
      id: task.id || task.title,
      title: task.title,
      date,
      days,
      source: 'plan',
      confirmed: true,
      url: null,
      reason: `Your own task, due in ${days} day${days === 1 ? '' : 's'}.`,
    });
  }
  return items
    .sort(
      (a, b) =>
        a.days - b.days ||
        Number(b.confirmed) - Number(a.confirmed) ||
        (a.source === 'plan' ? -1 : 1) - (b.source === 'plan' ? -1 : 1) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, Math.min(Math.max(limit, 1), 20));
}
