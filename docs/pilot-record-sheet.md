# Student pilot — record sheet (prepared, not started)

**Status: PREPARED ONLY.** No participant has been recruited, contacted or observed. No consent, feedback, name, email, account ID, note or document has been collected. Every value below is a blank field or a command to run; none is an outcome. The authoritative protocol is [pilot-handoff.md](pilot-handoff.md); the pre-flight checklist is [student-pilot.md](student-pilot.md).

## 1. Pre-flight — owner runs these, then records the exact output

| Step              | Command                                                        | Expected evidence                                                                           | Result (fill after running) |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| Reviewed source   | `git rev-parse HEAD`                                           | Local commit that was reviewed                                                              |                             |
| CI                | `gh run list --limit 1`                                        | `completed success` for the reviewed SHA                                                    |                             |
| Production status | `gh api repos/yermukhamed0777/methodos/commits/<SHA>/statuses` | Vercel `success` for the reviewed SHA                                                       |                             |
| Live markers      | `npm run check:live`                                           | `8/8 live checks passed`                                                                    |                             |
| Offline suite     | `npm run check`                                                | exit 0; data, build, lint, typecheck, 264 tests, content-free, walkthrough, format all pass |                             |

Replace `<SHA>` with the actual value from `git rev-parse HEAD`; do not paste a token or credential. If any row fails, stop and file a new `MTH-###` ID before inviting anyone. Do not treat a green automated check as a substitute for the signed-out desktop/375 px walkthrough in `student-pilot.md:10`.

**Do not run `npm run report:events` without an owner-provided credential.** It requires `BLOB_READ_WRITE_TOKEN` from `vercel env pull .env.local`; `.env.local` stays local and untracked.

## 2. Consent — record only yes/no and date

Read the wording in [pilot-handoff.md](pilot-handoff.md) §2 exactly, then ask for a yes/no. Record `yes` or `no` plus ISO date. A `no` ends the session immediately. Do not record identity "to link" answers.

| Field     | Allowed values | Session value |
| --------- | -------------- | ------------- |
| `consent` | `yes` / `no`   |               |
| `date`    | ISO date       |               |

## 3. Session row — one per participant, no personal content

| Field                  | Allowed values                                    | s1  | s2  | s3  | s4  | s5  |
| ---------------------- | ------------------------------------------------- | --- | --- | --- | --- | --- |
| `session_id`           | random label such as `s1`                         |     |     |     |     |     |
| `started_signed_out`   | `yes` / `no`                                      |     |     |     |     |     |
| `reached_next_step`    | `yes` / `no` (named, verifiable action)           |     |     |     |     |     |
| `minutes_to_next_step` | number                                            |     |     |     |     |     |
| `first_blocker`        | short category only — no quote or personal detail |     |     |     |     |     |
| `needed_help`          | `yes` / `no`                                      |     |     |     |     |     |

Proposed blocker categories (not results): `navigation`, `eligibility_unclear`, `deadline_unclear`, `source_link`, `save_requires_account`, `other`. A category is not a quotation and must not contain a name, email, note or document name.

Do not ask participants to apply, submit documents, upload private files or disclose account details. Offer saving only after the owner has personally verified signup email and recovery (`docs/auth-verification.md`).

## 4. After each session

1. If a blocker repeats, file it as a new stable `MTH-###` ID in `docs/plan/backlog.md` (never renumber), with a regression test that fails before the fix and passes after.
2. Append the exact command output to `docs/plan/progress.md` in the same commit.
3. Keep observations in private notes. Never paste participant text into a public issue, commit message or changelog.

## 5. Day 6/7 — owner only

- Decide go / conditional-go / no-go using the rules in [pilot-handoff.md](pilot-handoff.md) §6. The `4 of 5 within five minutes` figure is a **proposed target**, not an outcome.
- If configured, run `npm run report:events -- --days=7` for anonymous, content-free counters only. Do not backfill or estimate counters.
- On day 7, append the outcome to `docs/plan/progress.md` as a new dated entry. No PR is required for a private note.

## 6. Still pending — explicitly human

Recruitment, consent collection, real feedback, signup email/SMTP/recovery, signed-in AI generation, private Storage upload/review/download/delete, account deletion with the server secret, manual keyboard/zoom/screen-reader/high-contrast passes, Vercel's red-CI gate (MTH-010), the licence choice (MTH-011) and the go/no-go call are **not** performed by an agent and remain pending.
