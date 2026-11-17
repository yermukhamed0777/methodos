# Public registration: verification status

Last updated 17 November 2026. This page records what has actually been checked
about new-user registration, and what still needs the owner.

## Verified

- **Production auth is configured.** `GET https://opportunity-explorer-ruddy.vercel.app/api/config`
  returns `200` with `supabaseUrl` (`https://skukccwpnlokigyujntb.supabase.co`), a
  browser-safe publishable key, and `aiConfigured: true`. A `503`
  `auth_not_configured` would mean the deployment was missing settings; it is not.
- **The signup code path exists and is reachable.** `src/auth-page.js` calls
  `supabase.auth.signUp({ email, password, options: { emailRedirectTo: origin + '/auth/callback' } })`
  from the “Create account” submitter. There is no client-side allowlist, invite
  code or hidden flag that would block a new address.
- **Confirmation is treated as required.** When `signUp` returns no session, the
  page shows a confirmation message instead of signing the visitor in. The page
  never disables or bypasses email confirmation.
- **The confirmation link is handled.** `/auth/callback` is rewritten to
  `dist/auth.html` in `vercel.json`; `consumeCallback()` exchanges the `code`
  (PKCE) or `access_token`/`refresh_token` fragment, clears it from the URL with
  `history.replaceState`, and only redirects after `getUser()` reports a
  confirmed, non-anonymous user.
- **Failure states are mapped, not guessed.** `authMessage()` handles
  `email_not_confirmed`, `invalid_credentials`, `over_email_send_rate_limit`,
  `otp_expired`, `flow_state_expired`, `flow_state_not_found` and
  `bad_code_verifier`.
- **Local tests cover the parts that do not need an inbox.** 206 tests pass,
  including `tests/auth-signup.test.js` for address masking, the
  already-registered signal, cooldown copy and message routing.

## Not verified

These require a real inbox and the Supabase dashboard, so they remain open:

1. A confirmation email is actually **delivered** to a new address.
2. The link in that email completes the round trip and lands on `/#home` with a
   signed-in header.
3. The sender domain passes **SPF/DKIM** and does not land in spam.
4. Custom **SMTP** is configured. Supabase’s built-in email service is intended
   for testing and restricts recipients; a production signup flow normally needs
   custom SMTP (for example Resend, Postmark or SES).
5. Signup rate limits are appropriate for public traffic.

**Why these are open:** the owner inbox is not available here, and no tool in
this environment can read the project’s auth configuration. Checked explicitly:
there is no Supabase connector installed (the connector catalog has none), no
Supabase CLI, no `~/.supabase` session, no `SUPABASE_*` environment variable and
no `.env.local`; outbound requests to `/auth/v1/settings` are blocked. None of
these is evidence of a defect — they are simply unobserved.

**Which build you would be testing:** production still serves the pre-#15 build
(see [production deployment check](deploy-verification.md)). Sign-in and signup
are present, but the newer masked-address message, already-registered guidance and
resend cooldown are not live yet. The Supabase project is the same, so an owner
test today would exercise the real email pipeline even though the UI is older.
The `/api/chat` auth-order hardening added in the release-hardening PR does not
change the signup path and does not make email delivery verifiable.

## Owner steps to close it

1. Open `https://opportunity-explorer-ruddy.vercel.app/login` in a **private
   window** and choose “Create account”.
2. Use an address you control that is **not** an existing ProspectoAI account,
   with a password of at least 10 characters.
3. Confirm the page names a masked address (`a***a@example.com`) matching what
   you typed. A mismatch means a typo was caught before you waited.
4. Check that the message arrives. If it does not:
   - Supabase Dashboard → **Authentication → Logs** for a send attempt or an SMTP error;
   - **Authentication → Emails / SMTP Settings** to confirm whether custom SMTP is on;
   - if only the built-in service is configured, expect delivery to be limited to
     project team addresses — configure custom SMTP before inviting students.
5. Open the link **in the same browser** that requested it. PKCE links are bound
   to that browser’s storage; opening on another device correctly reports
   “expired or opened in a different browser” with a fresh-link action.
6. Confirm you land on `/#home` signed in, then sign out and sign in again with
   the same credentials to prove the account is durable.
7. Record the outcome in this file and in `docs/release-status.md`.

If step 3 shows “That email may already be registered”, the address already has
a confirmed account. That message comes from Supabase returning an empty
`identities` array, which is the documented signal that no email was sent.

## What this change added

- The confirmation status now names the **masked** address, so a typo is visible.
- A signup for an already-registered address no longer looks identical to a
  successful one; it offers sign-in and password reset instead of “check your
  inbox” for a message that will never arrive.
- “Resend confirmation email” now counts down for 60 seconds, matching
  Supabase’s per-address send interval, so a second click cannot produce a
  provider rate-limit error.

## What was deliberately not done

- No test users were created in the production database.
- Email confirmation was not disabled or relaxed.
- No Supabase authentication policy, schema or provider setting was changed.
- No credentials, tokens or personal addresses are recorded in this file.
