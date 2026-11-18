export const activityLabels = {
  started: 'Started course',
  study: 'Study session',
  progress: 'Progress update',
  completed: 'Completed course',
};

export function localStudyDate(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function validStudyDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

export function activityLevel(count) {
  if (count < 3) return count;
  return count < 5 ? 3 : 4;
}

export function activityCalendar(rows, today = localStudyDate()) {
  const end = new Date(today + 'T00:00:00Z');
  const first = new Date(end);
  first.setUTCDate(first.getUTCDate() - 364);
  const start = first.toISOString().slice(0, 10);
  const daily = new Map();
  const completions = new Set();
  let minutes = 0;
  let count = 0;
  for (const row of rows) {
    if (
      !validStudyDate(row.study_date) ||
      row.study_date < start ||
      row.study_date > today
    )
      continue;
    const entries = daily.get(row.study_date) || [];
    entries.push(row);
    daily.set(row.study_date, entries);
    minutes += row.minutes || 0;
    count++;
    if (row.kind === 'completed') completions.add(row.course_id);
  }
  const days = Array.from({ length: first.getUTCDay() }, () => null);
  while (first <= end) {
    const date = first.toISOString().slice(0, 10);
    days.push({ date, entries: daily.get(date) || [] });
    first.setUTCDate(first.getUTCDate() + 1);
  }
  return { start, days, daily, minutes, count, completed: completions.size };
}
