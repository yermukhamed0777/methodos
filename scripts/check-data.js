#!/usr/bin/env node
// Validates the reviewed data files before a build or release.
//
// The catalogue is the product: a wrong date, a non-HTTPS source or a duplicate
// id becomes a wrong answer for a student. This script fails loudly instead of
// letting bad records reach `dist/`.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ID = /^[a-z0-9][a-z0-9-]{1,80}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isDate = (value) =>
  typeof value === 'string' &&
  ISO_DATE.test(value) &&
  !Number.isNaN(Date.parse(value + 'T00:00:00Z')) &&
  new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;

const isHttps = (value) => {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

export function validateData(
  { catalog, resources, development },
  { today = new Date().toISOString().slice(0, 10) } = {},
) {
  const problems = [];
  const fail = (file, id, message) =>
    problems.push({ file, id: id || '(root)', message, severity: 'error' });
  const warn = (file, id, message) =>
    problems.push({ file, id: id || '(root)', message, severity: 'warn' });

  function checkId(file, record, seen) {
    if (!record || typeof record !== 'object') {
      fail(file, null, 'record is not an object');
      return false;
    }
    if (!ID.test(String(record.id || ''))) {
      fail(file, record.id, 'id must be lowercase letters, digits or hyphens');
      return false;
    }
    if (seen.has(record.id)) fail(file, record.id, 'duplicate id');
    seen.add(record.id);
    return true;
  }

  function checkName(file, record) {
    const name = record.name;
    if (typeof name !== 'string' || name.trim().length < 2)
      fail(file, record.id, 'name is required');
    else if (name !== name.trim())
      fail(file, record.id, 'name has leading or trailing whitespace');
  }

  function checkDate(file, record, field, { required = false } = {}) {
    const value = record[field];
    if (value == null) {
      if (required) fail(file, record.id, field + ' is required');
      return;
    }
    if (!isDate(value)) {
      fail(file, record.id, field + ' must be an ISO date (YYYY-MM-DD)');
      return;
    }
    if (value > today)
      fail(file, record.id, field + ' is in the future (' + value + ')');
  }

  function checkSources(file, record, { required = true } = {}) {
    const sources = record.sources;
    if (!Array.isArray(sources) || !sources.length) {
      if (required) fail(file, record.id, 'at least one source is required');
      return;
    }
    sources.forEach((source, i) => {
      if (!Array.isArray(source) || source.length !== 2) {
        fail(file, record.id, `sources[${i}] must be [label, url]`);
        return;
      }
      const [label, url] = source;
      if (typeof label !== 'string' || !label.trim())
        fail(file, record.id, `sources[${i}] needs a label`);
      if (!isHttps(url))
        fail(file, record.id, `sources[${i}] must be an https URL`);
    });
  }

  // ---- Public catalogue -------------------------------------------------
  const catalogSeen = new Set();
  for (const record of catalog?.opportunities || []) {
    if (!checkId('data/opportunities.json', record, catalogSeen)) continue;
    checkName('data/opportunities.json', record);
    checkSources('data/opportunities.json', record);
    checkDate('data/opportunities.json', record, 'checkedOn', {
      required: true,
    });
    if (!Array.isArray(record.fields) || !record.fields.length)
      fail('data/opportunities.json', record.id, 'fields must not be empty');
    if (!record.description)
      fail('data/opportunities.json', record.id, 'description is required');
    if (record.finalDeadline) {
      if (!isDate(record.finalDeadline))
        fail(
          'data/opportunities.json',
          record.id,
          'finalDeadline must be an ISO date',
        );
      if (typeof record.deadlineConfirmed !== 'boolean')
        fail(
          'data/opportunities.json',
          record.id,
          'deadlineConfirmed must be a boolean when a final deadline exists',
        );
      if (
        isDate(record.finalDeadline) &&
        record.finalDeadline < today &&
        !record.archived
      )
        warn(
          'data/opportunities.json',
          record.id,
          'deadline has passed but the record is not archived',
        );
    }
    if (record.deadlineStart && record.deadlineEnd) {
      if (!isDate(record.deadlineStart) || !isDate(record.deadlineEnd))
        fail(
          'data/opportunities.json',
          record.id,
          'deadlineStart and deadlineEnd must be ISO dates',
        );
      else if (record.deadlineStart > record.deadlineEnd)
        fail(
          'data/opportunities.json',
          record.id,
          'deadlineStart is after deadlineEnd',
        );
    }
  }

  // ---- Resources --------------------------------------------------------
  const courseIds = new Set();
  for (const record of resources?.courses || []) {
    if (!checkId('data/resources.json', record, courseIds)) continue;
    checkName('data/resources.json', record);
    if (!record.provider)
      fail('data/resources.json', record.id, 'provider is required');
    if (!isHttps(record.url))
      fail('data/resources.json', record.id, 'url must be an https URL');
    if (!Array.isArray(record.skills) || !record.skills.length)
      fail('data/resources.json', record.id, 'skills must not be empty');
    checkDate('data/resources.json', record, 'checkedOn', { required: true });
  }

  const skillIds = new Set();
  for (const record of resources?.skills || []) {
    if (!checkId('data/resources.json', record, skillIds)) continue;
    checkName('data/resources.json', record);
    if (!Array.isArray(record.fields) || !record.fields.length)
      fail('data/resources.json', record.id, 'fields must not be empty');
    if (!record.project)
      fail('data/resources.json', record.id, 'project is required');
    for (const course of record.courses || [])
      if (!courseIds.has(course))
        fail(
          'data/resources.json',
          record.id,
          'unknown course reference: ' + course,
        );
  }

  const universityIds = new Set();
  for (const record of resources?.universities || []) {
    if (!checkId('data/resources.json', record, universityIds)) continue;
    checkName('data/resources.json', record);
    checkSources('data/resources.json', record);
    checkDate('data/resources.json', record, 'checkedOn', { required: true });
  }

  const careerIds = new Set();
  for (const record of resources?.careers || []) {
    if (!checkId('data/resources.json', record, careerIds)) continue;
    checkName('data/resources.json', record);
    if (!isHttps(record.url))
      fail('data/resources.json', record.id, 'url must be an https URL');
    if (!record.summary)
      fail('data/resources.json', record.id, 'summary is required');
  }

  // ---- Development workspace -------------------------------------------
  const majorIds = new Set();
  for (const record of development?.majors || []) {
    if (!checkId('data/development.json', record, majorIds)) continue;
    checkName('data/development.json', record);
    checkDate('data/development.json', record, 'checkedOn', { required: true });
  }

  const stages = new Set(development?.stages || []);
  const devOpportunityIds = new Set();
  for (const record of development?.opportunities || []) {
    if (!checkId('data/development.json', record, devOpportunityIds)) continue;
    checkName('data/development.json', record);
    if (!isHttps(record.url))
      fail('data/development.json', record.id, 'url must be an https URL');
    checkSources('data/development.json', record, { required: false });
    checkDate('data/development.json', record, 'checkedOn', {
      required: true,
    });
    if (record.finalDeadline != null && !isDate(record.finalDeadline))
      fail(
        'data/development.json',
        record.id,
        'finalDeadline must be an ISO date',
      );
    for (const field of record.fieldIds || [])
      if (!majorIds.has(field))
        fail(
          'data/development.json',
          record.id,
          'unknown field reference: ' + field,
        );
    for (const stage of record.educationLevels || [])
      if (stages.size && !stages.has(stage))
        fail('data/development.json', record.id, 'unknown stage: ' + stage);
    if (catalogSeen.has(record.id))
      fail(
        'data/development.json',
        record.id,
        'id also exists in data/opportunities.json',
      );
  }

  const mapIds = new Set();
  for (const record of development?.skillMaps || []) {
    if (!checkId('data/development.json', record, mapIds)) continue;
    checkName('data/development.json', record);
    if (!majorIds.has(record.fieldId))
      fail(
        'data/development.json',
        record.id,
        'unknown fieldId: ' + record.fieldId,
      );
    checkSources('data/development.json', record);
    checkDate('data/development.json', record, 'checkedOn', { required: true });
    for (const course of record.courses || [])
      if (!courseIds.has(course))
        fail(
          'data/development.json',
          record.id,
          'unknown course reference: ' + course,
        );
  }

  for (const record of development?.pathways || []) {
    if (!checkId('data/development.json', record, mapIds)) continue;
    checkName('data/development.json', record);
    if (!majorIds.has(record.fieldId))
      fail(
        'data/development.json',
        record.id,
        'unknown fieldId: ' + record.fieldId,
      );
    checkSources('data/development.json', record);
    checkDate('data/development.json', record, 'checkedOn', { required: true });
    if (!Array.isArray(record.samplePlan) || !record.samplePlan.length)
      fail('data/development.json', record.id, 'samplePlan must not be empty');
    else
      record.samplePlan.forEach((step, i) => {
        if (!step?.phase || !step?.task)
          fail(
            'data/development.json',
            record.id,
            `samplePlan[${i}] needs a phase and a task`,
          );
      });
  }

  return problems;
}

function load() {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  return {
    catalog: read('data/opportunities.json'),
    resources: read('data/resources.json'),
    development: read('data/development.json'),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const problems = validateData(load());
  const errors = problems.filter((p) => p.severity === 'error');
  for (const problem of problems)
    console.error(
      `${problem.severity === 'warn' ? 'warning' : 'error'} · ${problem.file} · ${problem.id} · ${problem.message}`,
    );
  if (errors.length) {
    console.error(`\n${errors.length} data error(s) found.`);
    process.exit(1);
  }
  if (problems.length)
    console.log(
      `Data check passed with ${problems.length} editorial warning(s).`,
    );
  else console.log('Data check passed.');
  process.exit(0);
}
