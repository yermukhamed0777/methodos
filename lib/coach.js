export const COACH_SECTIONS = new Set(['motivation', 'experience', 'plan']);
export function validateCoachInput(body) {
  if (!body || typeof body !== 'object')
    return { error: 'Send a JSON object.' };
  const target = typeof body.target === 'string' ? body.target.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const recordId =
    typeof body.recordId === 'string' ? body.recordId.slice(0, 120) : '';
  const section = COACH_SECTIONS.has(body.section)
    ? body.section
    : 'motivation';
  if (!target || target.length > 160)
    return { error: 'Add the opportunity or goal in 1–160 characters.' };
  if (notes.length > 3000)
    return { error: 'Keep your notes under 3,000 characters.' };
  return { value: { target, notes, recordId, section } };
}
export function cleanDraft(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
    .slice(0, 6000);
}
export function templateDraft({ target, notes, section, references = [] }) {
  const intro = {
    motivation: `Why ${target} matters to you`,
    experience: `What you have actually done for ${target}`,
    plan: `How you would approach ${target}`,
  }[section];
  const lines = [intro + ' — draft skeleton (not AI generated).', ''];
  if (notes)
    lines.push(
      'Your notes:',
      notes.slice(0, 1800),
      '',
      'Turn one note into a specific example. Keep only claims you can support.',
      '',
    );
  else
    lines.push(
      'Add a short, truthful note about your own experience before writing this section.',
      '',
    );
  if (references.length) {
    lines.push('Sources to check before writing:');
    for (const ref of references.slice(0, 4))
      lines.push(`- ${ref.name} (reviewed ${ref.checkedOn || 'date unknown'})`);
    lines.push('', 'Confirm current requirements at each provider source.');
  }
  lines.push(
    '',
    'Do not paste this skeleton as a final answer. Replace prompts with your own verified facts.',
  );
  return lines.join('\n');
}
