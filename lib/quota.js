// Shared quota messaging.
//
// The daily AI allowance resets at 00:00 UTC (see the Supabase
// `reserve_ai_request` function). Telling a student "temporarily unavailable"
// when the real answer is "come back after midnight" is a support ticket, so the
// server returns the reset window and the client repeats it verbatim.

export function secondsUntilUtcMidnight(now = new Date()) {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

export function quotaNotice(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : null;
  const hours = safe == null ? null : Math.max(1, Math.round(safe / 3600));
  const window =
    hours == null
      ? 'at 00:00 UTC'
      : `at 00:00 UTC (about ${hours} hour${hours === 1 ? '' : 's'})`;
  return `You have used today’s AI requests. The catalog results below are still real, reviewed entries. AI planning returns ${window}.`;
}
