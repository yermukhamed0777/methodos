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
  {
    catalog,
    resources,
    development,
    intelligence,
    curated,
    learning,
    feed,
    blueprints,
  },
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
    if (
      isDate(record.deadline) &&
      isDate(record.startDate) &&
      record.deadline > record.startDate
    )
      fail(
        'data/development.json',
        record.id,
        'deadline is after the programme start date',
      );
    if (
      /confirmed/i.test(record.verification || '') &&
      /tentative|to verify|under construction/i.test(record.note || '')
    )
      warn(
        'data/development.json',
        record.id,
        'verification says confirmed while the note is uncertain',
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

  // ---- Expanded intelligence catalogue ----------------------------------
  // This is the largest published collection. It was previously invisible to
  // the gate, so a duplicate id, non-HTTPS source or false open claim could be
  // served to students while `check:data` still said "passed".
  if (intelligence) {
    const file = 'data/intelligence.json';
    checkDate(file, intelligence, 'checkedOn', { required: true });
    const seen = new Set();
    for (const record of intelligence.records || []) {
      if (!checkId(file, record, seen)) continue;
      checkName(file, record);
      checkSources(file, record);
      checkDate(file, record, 'checkedOn', { required: true });
      if (
        isDate(intelligence.checkedOn) &&
        isDate(record.checkedOn) &&
        record.checkedOn > intelligence.checkedOn
      )
        fail(
          file,
          record.id,
          'record reviewed after the collection header date',
        );
      for (const field of ['deadlineStart', 'deadlineEnd', 'finalDeadline']) {
        if (record[field] && !isDate(record[field]))
          fail(file, record.id, field + ' must be an ISO date');
      }
      if (record.openVerified === true) {
        if (!isHttps(record.applicationUrl))
          fail(
            file,
            record.id,
            'openVerified requires an HTTPS applicationUrl',
          );
        if (typeof record.deadlineVerified !== 'boolean')
          fail(
            file,
            record.id,
            'openVerified requires a boolean deadlineVerified',
          );
      }
      if (record.archived === true && record.status === 'Open')
        fail(file, record.id, 'an archived record cannot be Open');
    }
    const queued = new Set();
    for (const id of intelligence.reviewQueue || []) {
      const value = typeof id === 'string' ? id : id?.id;
      if (!ID.test(String(value || '')))
        fail(file, value, 'reviewQueue entry needs a valid id');
      if (queued.has(value)) fail(file, value, 'duplicate reviewQueue id');
      queued.add(value);
    }
  }

  // ---- Remaining reviewed seed files ------------------------------------
  // Every published data file must at least parse and obey the same source
  // and date rules. This closes the "3 of 8 files are gated" coverage gap.
  const generic = (file, value) => {
    if (value == null) return;
    const walk = (node, path) => {
      if (Array.isArray(node)) {
        node.forEach((item, i) => walk(item, `${path}[${i}]`));
        return;
      }
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node.sources))
        node.sources.forEach((source, i) => {
          const url = Array.isArray(source) ? source[1] : source?.url;
          if (!isHttps(url))
            fail(
              file,
              `${path}.sources[${i}]`,
              'source must have an https URL',
            );
        });
      for (const field of ['checkedOn', 'addedOn']) {
        if (node[field] == null) continue;
        if (!isDate(node[field]))
          fail(file, `${path}.${field}`, field + ' must be an ISO date');
        else if (node[field] > today)
          fail(file, `${path}.${field}`, field + ' is in the future');
      }
      for (const [key, item] of Object.entries(node))
        if (key !== 'sources') walk(item, `${path}.${key}`);
    };
    walk(value, file);
  };
  generic('data/curated-intelligence.json', curated);
  generic('data/learning-resources.json', learning);
  generic('data/feed-snapshot.json', feed);
  generic('data/project-blueprints.json', blueprints);

  return problems;
}

function load() {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  return {
    catalog: read('data/opportunities.json'),
    resources: read('data/resources.json'),
    development: read('data/development.json'),
    intelligence: read('data/intelligence.json'),
    curated: read('data/curated-intelligence.json'),
    learning: read('data/learning-resources.json'),
    feed: read('data/feed-snapshot.json'),
    blueprints: read('data/project-blueprints.json'),
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
