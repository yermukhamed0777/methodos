import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting, nextSteps, deadlineRadar } from '../src/discovery-model.js';
test('greetings use local hours and never invent a profile name', () => {
  assert.equal(greeting('', new Date(2026, 10, 16, 9)), 'Good morning.');
  assert.equal(
    greeting(' Yermukhamed ', new Date(2026, 10, 16, 14)),
    'Good afternoon, Yermukhamed.',
  );
  assert.equal(greeting(null, new Date(2026, 10, 16, 19)), 'Good evening.');
});
test('deadline radar excludes directories, stale reviews, previous cycles and distant dates', () => {
  const now = new Date('2026-11-16T12:00:00Z');
  const open = {
    id: 'open',
    status: 'Open',
    openVerified: true,
    checkedOn: '2026-11-15',
    applicationUrl: 'https://example.edu/apply',
    finalDeadline: '2026-11-20',
  };
  const rows = [
    open,
    { ...open },
    { ...open, id: 'old', checkedOn: '2026-09-01' },
    { ...open, id: 'closed', finalDeadline: '2026-11-01' },
    { ...open, id: 'later', finalDeadline: '2027-01-01' },
    { ...open, id: 'directory', isDirectory: true },
    { ...open, id: 'invalid', finalDeadline: '2026-11-99' },
  ];
  assert.deepEqual(deadlineRadar(rows, now), [open]);
});
test('home continuation only includes real active tasks in due-date order', () => {
  const tasks = [
    { title: 'No date', state: 'Planned' },
    { title: 'Done', state: 'Completed', due_date: '2026-01-01' },
    { title: 'Next', state: 'In progress', due_date: '2026-11-17' },
  ];
  assert.deepEqual(
    nextSteps({ plan_items: tasks }).map((x) => x.title),
    ['Next', 'No date'],
  );
  assert.equal(tasks[0].title, 'No date');
  assert.deepEqual(nextSteps({}), []);
});
