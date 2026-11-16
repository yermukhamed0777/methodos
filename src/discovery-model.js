import { verificationStatus } from '../lib/intelligence-core.js';
import { isCalendarDate } from '../lib/dates.js';
export function deadlineRadar(records, now = new Date()) {
  const end = new Date(+now + 30 * 86400000).toISOString().slice(0, 10);
  const seen = new Set();
  return records
    .filter((r) => {
      if (
        !r.id ||
        seen.has(r.id) ||
        !isCalendarDate(r.finalDeadline) ||
        r.finalDeadline > end ||
        verificationStatus(r, now).label !== 'Verified Open'
      )
        return false;
      seen.add(r.id);
      return true;
    })
    .sort((a, b) => a.finalDeadline.localeCompare(b.finalDeadline))
    .slice(0, 3);
}
export function greeting(name = '', now = new Date()) {
  const hour = now.getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const display = typeof name === 'string' ? name.trim().slice(0, 80) : '';
  return `Good ${period}${display ? ', ' + display : ''}.`;
}

export function nextSteps(state) {
  return (state.plan_items || [])
    .filter((item) => ['Planned', 'In progress'].includes(item.state))
    .slice()
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
    .slice(0, 3);
}
