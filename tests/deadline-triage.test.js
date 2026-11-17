import test from 'node:test';
import assert from 'node:assert/strict';
import { triageDeadlines } from '../lib/deadline-triage.js';

const today = '2026-11-17';
const opportunities = [
  {
    id: 'confirmed',
    name: 'Confirmed programme',
    finalDeadline: '2026-11-20',
    verification: 'Confirmed future deadline',
    url: 'https://example.edu/confirmed',
  },
  {
    id: 'tentative',
    name: 'Tentative programme',
    deadline: '2026-11-19',
    verification: 'Expected cycle',
  },
  { id: 'closed', name: 'Closed', finalDeadline: '2026-11-18', closed: true },
  {
    id: 'unknown',
    name: 'No date',
    deadline: 'Not confirmed',
    verification: 'Confirmed future deadline',
  },
  {
    id: 'far',
    name: 'Too far',
    finalDeadline: '2027-03-01',
    verification: 'Confirmed future deadline',
  },
];
const tasks = [
  {
    id: 'task',
    title: 'My application notes',
    due_date: '2026-11-21',
    state: 'Preparing',
  },
  { id: 'done', title: 'Done', due_date: '2026-11-18', state: 'Completed' },
];

test('triage ranks by date, separates own tasks and keeps uncertainty explicit', () => {
  const result = triageDeadlines({
    opportunities,
    tasks,
    today,
    windowDays: 30,
  });
  assert.deepEqual(
    result.map((x) => x.id),
    ['tentative', 'confirmed', 'task'],
  );
  assert.equal(result[0].confirmed, false);
  assert.match(result[0].reason, /verify at the provider/);
  assert.equal(result[1].confirmed, true);
  assert.equal(result[2].source, 'plan');
  assert(
    !result.some((x) => ['closed', 'unknown', 'far', 'done'].includes(x.id)),
  );
});

test('triage rejects malformed dates and bounds the requested window', () => {
  assert.deepEqual(
    triageDeadlines({
      opportunities: [
        { id: 'bad', name: 'Bad', finalDeadline: '17/11/2026' },
        {
          id: 'injection',
          name: 'Injection',
          finalDeadline: '2026-11-20<script>',
        },
      ],
      today,
    }),
    [],
  );
  assert.equal(
    triageDeadlines({ opportunities, today, windowDays: 1 }).length,
    0,
  );
  assert.equal(
    triageDeadlines({ opportunities, tasks, today, limit: 1 }).length,
    1,
  );
});
