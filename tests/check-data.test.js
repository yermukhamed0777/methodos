import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateData } from '../scripts/check-data.js';

const TODAY = '2026-11-17';

const base = () => ({
  catalog: {
    opportunities: [
      {
        id: 'alpha',
        name: 'Alpha programme',
        description: 'A programme.',
        fields: ['All subjects'],
        sources: [['Official', 'https://example.org/alpha']],
        checkedOn: '2026-11-01',
        finalDeadline: '2026-12-01',
        deadlineConfirmed: true,
        archived: false,
      },
    ],
  },
  resources: {
    courses: [
      {
        id: 'course-one',
        name: 'Course one',
        provider: 'Example',
        url: 'https://example.org/course',
        skills: ['analysis'],
        checkedOn: '2026-11-01',
      },
    ],
    skills: [
      {
        id: 'skill-one',
        name: 'Skill one',
        fields: ['Engineering'],
        project: 'Build something.',
        courses: ['course-one'],
        checkedOn: '2026-11-01',
      },
    ],
    universities: [
      {
        id: 'uni-one',
        name: 'University one',
        sources: [['Official', 'https://example.edu']],
        checkedOn: '2026-11-01',
      },
    ],
    careers: [
      {
        id: 'career-one',
        name: 'Career one',
        summary: 'A role.',
        url: 'https://example.org/role',
      },
    ],
  },
  development: {
    stages: ['High school junior'],
    majors: [{ id: 'eng', name: 'Engineering', checkedOn: '2026-11-01' }],
    opportunities: [
      {
        id: 'beta',
        name: 'Beta programme',
        url: 'https://example.org/beta',
        fieldIds: ['eng'],
        educationLevels: ['High school junior'],
        checkedOn: '2026-11-01',
        finalDeadline: '2027-01-10',
      },
    ],
    skillMaps: [
      {
        id: 'map-eng',
        name: 'Engineering map',
        fieldId: 'eng',
        courses: ['course-one'],
        sources: [['Official', 'https://example.org/map']],
        checkedOn: '2026-11-01',
      },
    ],
    pathways: [
      {
        id: 'path-eng',
        name: 'Engineering pathway',
        fieldId: 'eng',
        sources: [['Official', 'https://example.org/path']],
        checkedOn: '2026-11-01',
        samplePlan: [{ phase: 'Year 1', task: 'Foundations' }],
      },
    ],
  },
});

const run = (data) => validateData(data, { today: TODAY });
const errors = (data) => run(data).filter((p) => p.severity === 'error');
const warnings = (data) => run(data).filter((p) => p.severity === 'warn');

test('a clean dataset has no problems', () => {
  assert.deepEqual(run(base()), []);
});

test('duplicate ids are rejected', () => {
  const data = base();
  data.catalog.opportunities.push({ ...data.catalog.opportunities[0] });
  assert.match(errors(data)[0].message, /duplicate id/);
});

test('non-HTTPS sources are rejected', () => {
  const data = base();
  data.catalog.opportunities[0].sources = [['Official', 'http://example.org']];
  assert.match(errors(data)[0].message, /https URL/);
});

test('a missing source is rejected for catalog records', () => {
  const data = base();
  data.catalog.opportunities[0].sources = [];
  assert.match(errors(data)[0].message, /at least one source/);
});

test('a future checkedOn date is rejected', () => {
  const data = base();
  data.catalog.opportunities[0].checkedOn = '2027-01-01';
  assert.match(errors(data)[0].message, /in the future/);
});

test('an impossible calendar date is rejected', () => {
  const data = base();
  data.catalog.opportunities[0].checkedOn = '2026-02-31';
  assert.match(errors(data)[0].message, /ISO date/);
});

test('a passed deadline without archiving is a warning, not an error', () => {
  const data = base();
  data.catalog.opportunities[0].finalDeadline = '2026-01-01';
  assert.equal(errors(data).length, 0);
  assert.match(warnings(data)[0].message, /not archived/);
});

test('a confirmed deadline must declare confirmation as a boolean', () => {
  const data = base();
  delete data.catalog.opportunities[0].deadlineConfirmed;
  assert.match(errors(data)[0].message, /deadlineConfirmed/);
});

test('unknown field references are rejected', () => {
  const data = base();
  data.development.skillMaps[0].fieldId = 'nope';
  assert.match(errors(data)[0].message, /unknown fieldId/);
});

test('unknown course references are rejected', () => {
  const data = base();
  data.development.skillMaps[0].courses = ['missing-course'];
  assert.match(errors(data)[0].message, /unknown course reference/);
});

test('unknown education stages are rejected', () => {
  const data = base();
  data.development.opportunities[0].educationLevels = ['Nursery'];
  assert.match(errors(data)[0].message, /unknown stage/);
});

test('pathway steps need a phase and a task', () => {
  const data = base();
  data.development.pathways[0].samplePlan = [{ phase: 'Year 1' }];
  assert.match(errors(data)[0].message, /phase and a task/);
});

test('ids shared between the two opportunity files are rejected', () => {
  const data = base();
  data.development.opportunities[0].id = 'alpha';
  assert.match(errors(data)[0].message, /also exists/);
});

test('the shipped data files pass with no errors', () => {
  const read = (path) =>
    JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
  const problems = validateData(
    {
      catalog: read('data/opportunities.json'),
      resources: read('data/resources.json'),
      development: read('data/development.json'),
    },
    { today: TODAY },
  );
  assert.deepEqual(
    problems.filter((p) => p.severity === 'error'),
    [],
  );
});
