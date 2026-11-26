import {
  MAX_BATCH,
  normalizeEvent,
  resultsBucket,
} from '../lib/product-events.js';

const ENDPOINT = '/api/events';
const SESSION_KEY = 'methodos-events-session-v1';
const FLUSH_DELAY = 5000;
const MAX_QUEUE = 100;

export function privacyBlocked(nav = globalThis.navigator) {
  const dnt = nav?.doNotTrack ?? globalThis.doNotTrack;
  return dnt === '1' || dnt === 'yes' || nav?.globalPrivacyControl === true;
}

export function installProductEvents(w = globalThis, { send } = {}) {
  if (w.ProspectoEvents) return w.ProspectoEvents;
  const nav = w.navigator || {};
  const blocked = privacyBlocked(nav);
  const storage = (() => {
    try {
      return w.sessionStorage;
    } catch {
      return null;
    }
  })();
  let session = '';
  let queue = [];
  let timer = 0;

  function sessionId() {
    if (session) return session;
    try {
      const saved = storage?.getItem(SESSION_KEY);
      if (saved && /^[a-f0-9]{16,64}$/i.test(saved)) {
        session = saved.slice(0, 16).toLowerCase();
        return session;
      }
    } catch {
      // Session storage can be blocked; a fresh in-memory ID still works.
    }
    const bytes = new Uint8Array(8);
    try {
      if (typeof w.crypto?.getRandomValues !== 'function')
        throw new Error('No cryptographic random source.');
      w.crypto.getRandomValues(bytes);
    } catch {
      for (let i = 0; i < bytes.length; i++)
        bytes[i] = Math.floor(Math.random() * 256);
    }
    session = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    try {
      storage?.setItem(SESSION_KEY, session);
    } catch {
      // Ignore storage failures; the ID is optional.
    }
    return session;
  }

  function payload(events) {
    return JSON.stringify({ session: sessionId(), events });
  }

  function beacon(events) {
    const data = payload(events);
    try {
      if (typeof nav.sendBeacon === 'function') {
        const blob = new w.Blob([data], { type: 'application/json' });
        if (nav.sendBeacon(ENDPOINT, blob)) return;
      }
      w.fetch?.(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    } catch {
      // A failed counter must never affect the page.
    }
  }

  function deliver(events) {
    if (send) {
      send(events);
      return;
    }
    try {
      w.fetch?.(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload(events),
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    } catch {
      // Ignore network failures.
    }
  }

  function flush(useBeacon = false) {
    if (timer) {
      w.clearTimeout(timer);
      timer = 0;
    }
    if (blocked) {
      queue = [];
      return;
    }
    if (!queue.length) return;
    const batch = queue.splice(0, MAX_BATCH);
    if (useBeacon) beacon(batch);
    else deliver(batch);
    if (queue.length && !timer) timer = w.setTimeout(flush, FLUSH_DELAY);
  }

  function track(name, props) {
    if (blocked) return false;
    const event = normalizeEvent({ name, props });
    if (!event) return false;
    queue.push(event);
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    if (queue.length >= 10) flush();
    else if (!timer) timer = w.setTimeout(flush, FLUSH_DELAY);
    return true;
  }

  if (!blocked && typeof w.addEventListener === 'function') {
    w.addEventListener('pagehide', () => flush(true));
    w.addEventListener('visibilitychange', () => {
      if (w.document?.visibilityState === 'hidden') flush(true);
    });
  }

  const api = { track, flush, resultsBucket, enabled: !blocked };
  w.ProspectoEvents = api;
  return api;
}
