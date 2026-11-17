import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeText,
  foldLine,
  isValidDate,
  allDayEvent,
  buildCalendar,
  deadlineEvents,
} from '../lib/ics.js';

const octets = (value) => new TextEncoder().encode(value).length;
const unfold = (value) => value.replace(/\r\n[ \t]/g, '');

test('text escaping follows RFC 5545', () => {
  assert.equal(escapeText('a,b;c\\d'), 'a\\,b\\;c\\\\d');
  assert.equal(escapeText('line one\nline two'), 'line one\\nline two');
  assert.equal(escapeText('windows\r\nbreak'), 'windows\\nbreak');
  assert.equal(escapeText(null), '');
});

test('long lines fold at 75 octets and unfold losslessly', () => {
  const line = 'SUMMARY:' + 'A'.repeat(200);
  const folded = foldLine(line);
  for (const part of folded.split('\r\n')) assert.ok(octets(part) <= 75);
  assert.ok(folded.includes('\r\n '));
  assert.equal(unfold(folded), line);
});

test('folding never splits a multi-byte character', () => {
  const line = 'SUMMARY:' + 'é'.repeat(120);
  const folded = foldLine(line);
  for (const part of folded.split('\r\n')) assert.ok(octets(part) <= 75);
  assert.equal(unfold(folded), line);
  assert(!folded.includes('\uFFFD'));
});

test('impossible dates are rejected', () => {
  assert.equal(isValidDate('2026-02-31'), false);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('11/12/2026'), false);
  assert.equal(isValidDate('2028-02-29'), true);
  assert.equal(isValidDate('2026-12-11'), true);
});

test('all-day events use an exclusive end date', () => {
  const lines = allDayEvent({
    uid: 'alpha',
    date: '2026-12-31',
    title: 'Apply',
    now: new Date('2026-11-17T10:00:00Z'),
  });
  assert.ok(lines.includes('DTSTART;VALUE=DATE:20261231'));
  assert.ok(lines.includes('DTEND;VALUE=DATE:20270101'));
  assert.ok(lines.includes('UID:alpha@prospectoai'));
  assert.ok(lines.includes('DTSTAMP:20261117T100000Z'));
});

test('an invalid date produces no event', () => {
  assert.equal(allDayEvent({ date: '2026-02-31', title: 'x' }), null);
});

test('only https sources become calendar URLs', () => {
  const safe = allDayEvent({
    date: '2026-12-01',
    title: 'x',
    url: 'https://a.example',
  });
  const unsafe = allDayEvent({
    date: '2026-12-01',
    title: 'x',
    url: 'http://a.example',
  });
  assert.ok(safe.some((line) => line === 'URL:https://a.example'));
  assert.ok(!unsafe.some((line) => line.startsWith('URL:')));
});

test('a calendar wraps events with CRLF and required headers', () => {
  const ics = buildCalendar({
    events: [{ uid: 'a', date: '2026-12-01', title: 'Alpha' }],
    now: new Date('2026-11-17T10:00:00Z'),
  });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.includes('CALSCALE:GREGORIAN'));
  assert.ok(ics.includes('METHOD:PUBLISH'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal(ics.split('BEGIN:VEVENT').length, 2);
  assert.equal(
    (ics.match(/\n/g) || []).every(() => true),
    true,
  );
  assert.ok(!/[^\r]\n/.test(ics), 'every newline is CRLF');
});

test('long summaries are folded inside the calendar', () => {
  const ics = buildCalendar({
    events: [
      {
        uid: 'long',
        date: '2026-12-01',
        title: 'A'.repeat(120),
        now: new Date('2026-11-17T10:00:00Z'),
      },
    ],
  });
  for (const line of ics.split('\r\n')) assert.ok(octets(line) <= 75);
  assert.equal(unfold(ics).match(/SUMMARY:A{120}/)?.[0].length, 128);
});

test('triage items become stable events and skip invalid dates', () => {
  const events = deadlineEvents(
    [
      {
        id: 'rsi',
        title: 'RSI',
        date: '2026-12-11',
        url: 'https://example.org/rsi',
        reason: 'Verified deadline',
      },
      { id: 'broken', title: 'Broken', date: 'not-a-date' },
    ],
    { source: 'deadline' },
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].uid, 'deadline-rsi');
  assert.match(events[0].description, /Verified deadline/);
  assert.match(events[0].description, /Source: https:\/\/example.org\/rsi/);
});

test('the same source produces the same UID across exports', () => {
  const item = { id: 'rsi', title: 'RSI', date: '2026-12-11' };
  assert.equal(
    deadlineEvents([item])[0].uid,
    deadlineEvents([{ ...item }])[0].uid,
  );
});
