// Signup state helpers.
//
// Three things used to be invisible to a new student:
//   1. which address the confirmation went to (so a typo looked like a broken email),
//   2. whether they had already registered (Supabase returns a user with no
//      identities and sends nothing, which looked identical to "check your inbox"),
//   3. that the resend button was rate limited, so repeated clicks produced a
//      provider error instead of a countdown.
//
// These helpers keep that logic testable without a browser or a network call.

export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Mask an address for display. Returns '' when the value is not an address, so
 * callers can fall back to a message without an address instead of printing a
 * half-typed string back to the user.
 */
export function maskEmail(email) {
  const value = String(email ?? '').trim();
  const at = value.lastIndexOf('@');
  if (at < 1 || at === value.length - 1) return '';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!domain.includes('.') || /\s/.test(value)) return '';
  const head = local[0];
  const tail = local.length >= 3 ? local[local.length - 1] : '';
  return `${head}***${tail}@${domain}`;
}

/**
 * Supabase returns `identities: []` for an address that already has a confirmed
 * account, and no email is sent. Anything else means a confirmation is pending.
 */
export function signupOutcome(data = {}) {
  if (data.session) return 'signed-in';
  if (Array.isArray(data.user?.identities) && data.user.identities.length === 0)
    return 'possible-existing';
  return 'confirm';
}

export function confirmationMessage(email) {
  const masked = maskEmail(email);
  return masked
    ? `Confirmation email sent to ${masked}. Open the newest message, then sign in here. Check spam if it is missing.`
    : 'Confirmation email sent. Open the newest message, then sign in here. Check spam if it is missing.';
}

export function existingAccountMessage() {
  return 'That email may already be registered. Sign in, or reset your password. If you are new, check the address for a typo.';
}

export function cooldownLabel(seconds) {
  const remaining = Math.max(0, Math.ceil(Number(seconds) || 0));
  return remaining > 0
    ? `Resend available in ${remaining}s`
    : 'Resend confirmation email';
}

export function outcomeMessage(outcome, email) {
  if (outcome === 'possible-existing') return existingAccountMessage();
  return confirmationMessage(email);
}
