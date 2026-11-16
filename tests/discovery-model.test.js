import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting, nextSteps } from '../src/discovery-model.js';
test('greetings use local hours and never invent a profile name', () => {
  assert.equal(greeting('', new Date(2026, 10, 16, 9)), 'Good morning.');
  assert.equal(
    greeting(' Yermukhamed ', new Date(2026, 10, 16, 14)),
    'Good afternoon, Yermukhamed.',
  );
  assert.equal(greeting(null, new Date(2026, 10, 16, 19)), 'Good evening.');
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
