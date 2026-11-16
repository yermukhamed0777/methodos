import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCourses, paginateCourses } from '../src/course-discovery.js';
test('course search combines platform, subject and unknown-format filtering honestly', () => {
  const courses = [
    {
      name: 'Python',
      provider: 'Coursera · Michigan',
      skills: ['Data'],
      format: 'Self-paced online',
    },
    { name: 'Python lab', provider: 'MIT OpenCourseWare', skills: ['Data'] },
    { name: 'Writing', provider: 'Coursera · A' },
  ];
  assert.equal(
    filterCourses(courses, { query: ' data ', provider: 'Coursera' }).length,
    1,
  );
  assert.deepEqual(
    filterCourses(courses, { query: 'python', format: 'unknown' }).map(
      (c) => c.name,
    ),
    ['Python lab'],
  );
  assert.deepEqual(filterCourses(courses, { provider: 'missing' }), []);
  assert.equal(filterCourses(courses).length, 3);
});
test('course paging has no missing or duplicated entries and clamps stale pages after filtering', () => {
  const items = Array.from({ length: 281 }, (_, id) => ({ id }));
  const pages = Array.from({ length: 24 }, (_, i) =>
    paginateCourses(items, i + 1),
  );
  assert.deepEqual(
    pages.flatMap((p) => p.rows),
    items,
  );
  assert.equal(pages.at(-1).rows.length, 5);
  assert.equal(paginateCourses(items.slice(0, 2), 24).number, 1);
  assert.equal(paginateCourses([], 3).start, 0);
  assert.equal(paginateCourses(items, -1).number, 1);
});
