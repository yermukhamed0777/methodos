# Seven-day student pilot — handoff

**Status: not started.** This document is the exact boundary of agent work. It
requires real participants, consent and the owner's judgement; no agent has run
it and no result below is a measured outcome.

## 1. Goal

Answer one question: can a student who has never seen Methodos reach a credible,
verifiable next step from the public experience, without guidance? The pilot is
a usability check, not a usage, growth or revenue study. It does not ask anyone
to apply, submit documents, share private files or disclose account details.

## 2. Cohort and consent

- **Cohort:** 3–5 students who are not involved in building the product. Use the
  owner's own judgement for recruitment; do not recruit through an external
  service or paid advertising as part of this handoff.
- **Setting:** one device per participant, signed out first. Offer saving only
  after the owner has personally verified signup email and recovery
  (`docs/auth-verification.md`).
- **Consent wording — read exactly, then ask for a yes/no:**
  > "I'd like you to try a small education-planning website for about five
  > minutes. I'll ask you to think aloud; I'll record only whether you got
  > stuck and what the blocker was. I won't record your name, email, account,
  > notes or documents. You can stop at any time and you don't have to answer
  > anything. The site keeps anonymous, content-free counters of which screens
  > are used; it never records what you type. Saying yes now is only for this
  > session."
- Record consent as `yes` / `no` plus date. A `no` ends the session immediately.
  Do not record identity to "link" answers.

## 3. Schedule (seven days)

| Day | Owner action                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------ |
| 0   | Confirm the live SHA matches the reviewed merge; run `npm run check:live`; complete `docs/student-pilot.md`. |
| 1–2 | Run 2 sessions, signed out. Record observations only.                                                        |
| 3   | Fix the single most frequent blocker as a new backlog ID (§5) before continuing.                             |
| 4–5 | Run 2–3 more sessions, signed out; offer saving only if signup is verified.                                  |
| 6   | Decide go/no-go (§6). Run `npm run report:events -- --days=7` for anonymous counts, if configured.           |
| 7   | Write the outcome into `docs/plan/progress.md` as a new dated entry. No PR is required for a private note.   |

Stop early if the same blocker prevents more than half of sessions; do not keep
collecting data you cannot act on.

## 4. What to collect

One row per session, with **no names, emails, account IDs, notes or document
content**:

| Field                  | Allowed values                                 |
| ---------------------- | ---------------------------------------------- |
| `session_id`           | new random label, e.g. `s1`, `s2`              |
| `date`                 | ISO date                                       |
| `consent`              | `yes` (otherwise no session)                   |
| `started_signed_out`   | `yes` / `no`                                   |
| `reached_next_step`    | `yes` / `no` — a named, verifiable action      |
| `minutes_to_next_step` | number                                         |
| `first_blocker`        | short category, not a quote or personal detail |
| `needed_help`          | `yes` / `no`                                   |

Anonymous product counters are available separately with
`npm run report:events -- --days=7` (needs `BLOB_READ_WRITE_TOKEN` from
`vercel env pull .env.local`). They contain event names and coarse buckets
only — never search text, notes, filenames, URLs or account IDs. DNT/GPC users
are not counted.

## 5. Filing a failure as a new backlog ID

1. Append the next `MTH-###` ID to `docs/plan/backlog.md` (never renumber).
2. Include the observation row from §4 with personal content removed, the
   `file:line` reference if known, and a **Done when** criterion that is a
   runnable command plus an observable result.
3. Add the regression test first; make it fail before the fix, pass after.
4. Update `docs/plan/decisions.md` if the fix requires a product choice, and
   append the exact command output to `docs/plan/progress.md` in the same
   commit.
5. Pilot observations are private notes; do not paste participant text into a
   public issue, commit message or changelog.

## 6. Go / no-go criteria

**Proposed target (not measured):** at least **4 of 5** participants reach a
credible, verifiable next step within five minutes without help.

- **Go** — target met, no repeated blocker, and signed-out public discovery
  worked on desktop and at 375 px. Record the evidence; then decide about
  wider release as a separate owner decision.
- **Conditional go** — target met but one repeated blocker exists: fix that
  blocker as a new ID and re-run only the affected step with one new
  participant.
- **No-go** — target missed or a privacy/data-loss failure occurred: stop
  inviting participants, file each failure as a new ID, and re-run the full
  seven-day pilot only after the fixes pass `npm run check`.

These are decision rules, not results. No participant has been observed.

## 7. Explicitly human only

The following cannot be completed by an agent and remain with the owner:

1. Recruiting participants and obtaining consent.
2. Verifying a new inbox's signup email, confirmation, recovery and SMTP
   delivery (`docs/auth-verification.md`).
3. Signed-in AI generation, private Storage upload/review/download/delete and
   account deletion with the server secret.
4. Manual keyboard, zoom, screen-reader and high-contrast checks
   (`docs/accessibility.md`).
5. Confirming Vercel blocks deployment on a red GitHub check (MTH-010).
6. Choosing a licence if desired (MTH-011).
7. Restarting the pilot after a fix, and making the go/no-go call.

The agent-doable work ends here. `npm run walkthrough` produces a deterministic
fixture for a later video; it is not a substitute for a participant session.
