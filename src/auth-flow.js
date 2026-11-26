import { PATH_VIEWS, SAFE_HASH_VIEWS } from './view-registry.js';
export const RECOVERY_PATH = '/reset-password';
export const CALLBACK_PATH = '/auth/callback';
export function safeNext(value, origin) {
  try {
    const url = new URL(value || '/', origin);
    const view = PATH_VIEWS[url.pathname];
    if (url.origin !== origin || (!view && url.pathname !== '/')) return '/';
    if (view && !url.hash) url.hash = '#' + view;
    const safe = new URL('/', origin);
    const opportunity = url.searchParams.get('opportunity');
    if (opportunity && /^[a-z0-9-]{1,120}$/.test(opportunity))
      safe.searchParams.set('opportunity', opportunity);
    const hashView = /^#([a-z-]+)$/.exec(url.hash)?.[1];
    if (hashView && SAFE_HASH_VIEWS.has(hashView)) safe.hash = url.hash;
    return safe.pathname + safe.search + safe.hash;
  } catch {
    return '/';
  }
}
export function callbackKind(url) {
  // Only the two dedicated auth routes are callbacks. A fragment carrying
  // tokens on any other URL is attacker-controlled input, not a session.
  if (
    url.pathname === RECOVERY_PATH ||
    url.pathname === '/auth/update-password'
  )
    return 'recovery';
  if (url.pathname === CALLBACK_PATH) return 'confirmation';
  return null;
}
export function authMessage(error) {
  switch (error?.code) {
    case 'email_not_confirmed':
      return 'Please check your inbox to confirm your account. You can resend the confirmation email below.';
    case 'invalid_credentials':
      return 'The email or password is incorrect. Use your Methodos account, or reset your password. If you just registered, confirm your email first.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many email requests. Wait before trying again. If this continues, email delivery needs to be configured by the site owner.';
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'bad_code_verifier':
      return 'This link has expired, was already used, or was opened in a different browser. Request a fresh link below.';
    default:
      return (
        error?.message || 'The request could not be completed. Please retry.'
      );
  }
}
// PKCE only: a code is exchanged with the verifier stored in this browser.
// URL fragments containing bearer tokens are rejected, never installed as a
// session (a login-CSRF vector). Never log token values.
export async function consumeCallback(client, url) {
  const hash = new URLSearchParams(url.hash.slice(1));
  if (hash.has('access_token') || hash.has('refresh_token'))
    throw { code: 'flow_state_not_found' };
  if (hash.has('error') || url.searchParams.has('error'))
    throw {
      code:
        hash.get('error_code') ||
        url.searchParams.get('error_code') ||
        'otp_expired',
    };
  const code = url.searchParams.get('code');
  if (!code) throw { code: 'flow_state_not_found' };
  const result = await client.auth.exchangeCodeForSession(code);
  if (result.error) throw result.error;
  return result.data.session;
}
