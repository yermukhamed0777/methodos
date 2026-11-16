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
