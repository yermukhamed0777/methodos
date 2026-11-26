import { del, get, list, put } from '@vercel/blob';
import { aggregate } from './product-events.js';

// One private blob per UTC day. Each write is a read-modify-write with an ETag
// precondition, so concurrent page flushes cannot silently overwrite each
// other's counters. The first write of a day uses allowOverwrite: false, which
// makes two simultaneous first writers retry instead of losing one batch.
export const EVENT_PREFIX = 'methodos/events/';

export function eventPath(date) {
  return EVENT_PREFIX + date + '.json';
}

export function createEventStore({
  getBlob = get,
  putBlob = put,
  attempts = 5,
} = {}) {
  async function read(date) {
    const result = await getBlob(eventPath(date), {
      access: 'private',
      useCache: false,
    });
    if (!result) return null;
    if (result.statusCode !== 200)
      throw new Error('Event storage could not be read.');
    let snapshot;
    try {
      snapshot = JSON.parse(await new Response(result.stream).text());
    } catch {
      throw new Error('Stored event counters are not valid JSON.');
    }
    return { snapshot, etag: result.blob.etag };
  }

  async function append(date, events, { session, now } = {}) {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const current = await read(date);
      const next = aggregate(current?.snapshot || null, events, {
        session,
        now,
        date,
      });
      try {
        await putBlob(eventPath(date), JSON.stringify(next), {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: !!current,
          contentType: 'application/json',
          cacheControlMaxAge: 60,
          ...(current?.etag ? { ifMatch: current.etag } : {}),
        });
        return next;
      } catch (error) {
        // A lost ETag race or a first-write collision is expected under
        // concurrent flushes; read the winner and merge again.
        lastError = error;
      }
    }
    throw lastError || new Error('Event storage could not be written.');
  }

  async function pruneBefore(cutoff) {
    let cursor,
      removed = 0;
    do {
      const page = await list({
        prefix: EVENT_PREFIX,
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      const old = page.blobs.filter((blob) => {
        const date = blob.pathname.slice(EVENT_PREFIX.length, -5);
        return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < cutoff;
      });
      if (old.length) {
        await del(old.map((blob) => blob.pathname));
        removed += old.length;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return removed;
  }

  return { append, read, pruneBefore };
}

export const eventStore = createEventStore();
