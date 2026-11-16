import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCourses } from '../src/course-discovery.js';
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
