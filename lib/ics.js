// RFC 5545 calendar output for the workspace.
//
// Calendar clients are strict: text must escape `\`, `;`, `,` and newlines,
// content lines must be folded at 75 octets without splitting a UTF-8
// character, and all-day events use an exclusive DTEND. HTML escaping or
// unfolded lines make events silently disappear, so this lives in one place
// with tests instead of being rebuilt inline per button.

const encoder = new TextEncoder();
const MAX_OCTETS = 75;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function escapeText(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}

// Fold a content line at 75 octets. Continuation lines begin with one space,
// which counts toward their own limit.
export function foldLine(line) {
  const text = String(line ?? '');
  if (encoder.encode(text).length <= MAX_OCTETS) return text;
  const chunks = [];
  let current = '';
  let octets = 0;
  let limit = MAX_OCTETS;
  for (const char of text) {
    const size = encoder.encode(char).length;
    if (octets + size > limit) {
      chunks.push(current);
      current = '';
      octets = 0;
      limit = MAX_OCTETS - 1;
    }
    current += char;
    octets += size;
  }
  if (current) chunks.push(current);
  return chunks.join('\r\n ');
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !ISO.test(value)) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
}

function stamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function nextDay(iso) {
  const date = new Date(iso + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

export function allDayEvent({
  uid,
  date,
  title,
  description = '',
  url = '',
  alarm = true,
  now = new Date(),
}) {
  if (!isValidDate(date)) return null;
  const lines = [
    'BEGIN:VEVENT',
    'UID:' + escapeText(uid || `${date}-${title}`) + '@prospectoai',
    'DTSTAMP:' + stamp(now),
    'DTSTART;VALUE=DATE:' + date.replaceAll('-', ''),
    // All-day DTEND is exclusive, so it must be the following day.
    'DTEND;VALUE=DATE:' + nextDay(date),
    'SUMMARY:' + escapeText(title || 'Deadline'),
  ];
  if (description) lines.push('DESCRIPTION:' + escapeText(description));
  if (/^https:\/\//.test(url)) lines.push('URL:' + url);
  if (alarm) {
    lines.push(
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + escapeText(title || 'ProspectoAI reminder'),
      'END:VALARM',
    );
  }
  lines.push('END:VEVENT');
  return lines;
}

export function buildCalendar({
  events = [],
  prodId = '-//ProspectoAI//Deadlines//EN',
  now = new Date(),
} = {}) {
  const body = events.flatMap((event) =>
    allDayEvent({ ...event, now: event.now || now }),
  );
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:' + prodId,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...body,
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

// Triage items carry {id, title, date, url, reason}. Events are keyed by source
// so re-exporting updates the same calendar entry instead of duplicating it.
export function deadlineEvents(items = [], { source = 'deadline' } = {}) {
  return items
    .filter((item) => isValidDate(item?.date))
    .map((item) => ({
      uid: `${source}-${item.id || item.title}`,
      date: item.date,
      title: item.title,
      description: [item.reason, item.url ? 'Source: ' + item.url : '']
        .filter(Boolean)
        .join(' '),
      url: item.url || '',
    }));
}
