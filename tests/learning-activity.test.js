import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activityCalendar,
  activityLevel,
  validStudyDate,
} from '../src/learning-activity.js';

test('the calendar uses the chosen study days and reports distinct completed courses', () => {
  const entries = [
    {
      course_id: 'a',
      study_date: '2024-02-29',
      kind: 'study',
      minutes: 45,
      created_at: '2024-03-01T02:00:00Z',
    },
    { course_id: 'a', study_date: '2024-03-02', kind: 'completed' },
    { course_id: 'a', study_date: '2024-03-05', kind: 'completed' },
    {
      course_id: 'b',
      study_date: '2024-03-05',
      kind: 'completed',
      minutes: 20,
    },
    { course_id: 'b', study_date: '2024-03-06', kind: 'study', minutes: 9 },
    { course_id: 'b', study_date: '2024-02-30', kind: 'study', minutes: 9 },
    { course_id: 'b', study_date: '2023-01-01', kind: 'study', minutes: 9 },
  ];
  const calendar = activityCalendar(entries, '2024-03-05');
  assert.equal(calendar.days.filter(Boolean).length, 365);
  assert.equal(calendar.days.at(-1).date, '2024-03-05');
  assert.equal(calendar.daily.get('2024-02-29').length, 1);
  assert.equal(calendar.daily.size, 3);
  assert.equal(calendar.count, 4);
  assert.equal(calendar.completed, 2);
  assert.equal(calendar.minutes, 65);
  assert.equal(validStudyDate('2023-02-29'), false);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 20].map(activityLevel),
    [0, 1, 2, 3, 3, 4, 4],
  );
});
