import { timingSafeEqual } from 'node:crypto';
import { eventStore } from '../lib/event-store.js';
import {
  MAX_BATCH,
  SESSION_PATTERN,
  normalizeEvent,
} from '../lib/product-events.js';

const MAX_BODY = 8192;
const RETENTION_DAYS = 30;

function authorized(header, secret) {
  if (!secret || typeof header !== 'string') return false;
  const a = Buffer.from(header),
    b = Buffer.from('Bearer ' + secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function bodySize(body) {
  if (typeof body === 'string') return body.length;
  try {
    return JSON.stringify(body).length;
  } catch {
    return Infinity;
  }
}

export function createEventsHandler({
  append = eventStore.append,
  prune = eventStore.pruneBefore,
  cronSecret,
  now = () => new Date(),
  maxBody = MAX_BODY,
} = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') {
      // Vercel Cron calls this endpoint daily to enforce the retention
      // promise. It is never a public read of the counters.
      if (!cronSecret) {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
      }
      if (!authorized(req.headers?.authorization, cronSecret))
        return res.status(401).json({ error: 'Unauthorized' });
      try {
        const cutoff = new Date(now().getTime() - RETENTION_DAYS * 86400000)
          .toISOString()
          .slice(0, 10);
        const removed = await prune(cutoff);
        return res.status(200).json({ ok: true, removed, cutoff });
      } catch {
        return res.status(503).json({
          error: 'Anonymous usage storage is temporarily unavailable.',
        });
      }
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    let body = req.body;
    if (typeof body === 'string') {
      if (body.length > maxBody)
        return res.status(413).json({ error: 'Event batch is too large.' });
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Send a valid JSON batch.' });
      }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return res.status(400).json({ error: 'Send an event batch.' });
    if (bodySize(body) > maxBody)
      return res.status(413).json({ error: 'Event batch is too large.' });
    const events = (Array.isArray(body.events) ? body.events : [])
      .slice(0, MAX_BATCH)
      .map(normalizeEvent)
      .filter(Boolean);
    // Invalid or empty batches are acknowledged without writing. This keeps
    // the endpoint quiet for scanners and avoids storing partial events.
    if (!events.length) return res.status(204).end();
    const session =
      typeof body.session === 'string' && SESSION_PATTERN.test(body.session)
        ? body.session.slice(0, 16).toLowerCase()
        : '_other';
    const at = now();
    try {
      await append(at.toISOString().slice(0, 10), events, { session, now: at });
      return res.status(204).end();
    } catch {
      return res.status(503).json({
        error: 'Anonymous usage storage is temporarily unavailable.',
      });
    }
  };
}

export default createEventsHandler({
  cronSecret: process.env.CRON_SECRET,
});
