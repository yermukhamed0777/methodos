# Backlog

Stable IDs are never renumbered. Status values: `Open`, `In progress`, `Done`,
`Human only`. `Done` requires a recorded command + exact result in
[progress.md](progress.md).

## Defects — correctness, privacy, data loss

### MTH-001 — Discovery filters default to a real value and silently show zero results

- **Status:** Done
- **Refs:** `dist/app.js:324-329` (dynamic options), `dist/app.js:587-589` and
  `dist/app.js:691-698` (filter/default use), `tests/discovery-controls.test.js:37-67`
  and `tests/discovery-controls.test.js:99-133` (failing assertions).
- **Evidence:** baseline `npm test` → 225 pass / 2 fail; both failures show
  `'0 opportunities'` and a missing first result card. Re-running the two tests
  against `HEAD:dist/app.js` reproduced the failure, so it pre-dates the
  uncommitted event work. Root cause: after `<option>` elements are added to
  `#field`/`#location`, the DOM harness reports the first _added_ option as the
  selected value (`"All subjects"`, `"Canada"`), which filters out every record.
- **Fix:** explicitly set both selects to their `value=""` default after
  populating options; do not rely on implicit browser selection semantics.
- **Done when:** a regression test asserts both defaults are empty and that
  results are non-empty without a user action; `npm test` reports 0 failures.

### MTH-002 — Past-deadline opportunity is not archived

- **Status:** Done
- **Refs:** `data/opportunities.json` (`ubc-international-scholars-2027`),
  `scripts/check-data.js` warning path, `tests/check-data.test.js:137-142`.
- **Evidence:** `npm run check:data` → "1 editorial warning(s)":
  `ubc-international-scholars-2027 · deadline has passed but the record is not
archived`. The record itself states `25 Nov 2026 · 12:00 PST = 26 Nov 04:00
Hong Kong`; verified at `2026-11-26T12:14+08:00` (04:14 UTC), i.e. after the
  stated cut-off.
- **Fix:** set `archived: true` on that record only. No deadline, source or
  factual text is invented or changed.
- **Done when:** `npm run check:data` reports 0 warnings and 0 errors, and a
  test asserts the shipped catalog produces no warnings.

### MTH-003 — `/api/events` has no local dev route

- **Status:** Done
- **Refs:** `scripts/dev-server.js:37-51` (handlers map), `api/events.js:28-103`.
- **Evidence:** the browser tracker POSTs to `/api/events`, but the local preview
  server has no handler, so an unmatched POST returns 405. Vercel auto-discovers
  `api/events.js`, so production is unaffected; local verification is.
- **Fix:** register the events handler in the dev preview, with injected cron
  secret and storage dependencies so no network/blob access occurs in tests.
- **Done when:** a test drives `POST /api/events` through `createPreviewServer()`
  and asserts 204 for a valid batch and 204 for an invalid batch.

### MTH-004 — New event files fail the formatting gate

- **Status:** Done
- **Refs:** `api/events.js`, `npm run format:check`.
- **Evidence:** baseline `npm run format:check` → `[warn] api/events.js`, exit 1.
- **Fix:** apply the repository's Prettier config to the new files only; do not
  reformat unrelated existing files.
- **Done when:** `npm run format:check` exits 0.

## Verification and release path

### MTH-005 — Anonymous counter lacks an automated content-free assertion

- **Status:** Done
- **Refs:** `lib/product-events.js:22-52` (allowlist),
  `src/product-events.js:63-84` (payload), `tests/product-events.test.js`.
- **Gap:** the allowlist is tested property-by-property, but nothing asserts
  that the **exact JSON emitted by a full scripted session** is free of journal
  or account content, nor that storage/report output stays content-free.
- **Fix:** one content-free harness with a fixed allowlisted event set, no user
  text, no network transmission, and an assertion over emitted + aggregated +
  reported JSON for banned content (notes, query text, names, emails, file
  URLs, document names, IDs). Wire it into `npm run check`.
- **Done when:** `npm run verify:events` exits 0 and prints a deterministic
  content-free verdict; CI runs the same command.

### MTH-006 — No deterministic scripted walkthrough capture

- **Status:** Done
- **Refs:** new `scripts/walkthrough.js` and `docs/walkthrough/`.
- **Gap:** a video cannot be made later without re-running the whole app,
  because there is no fixture transcript of the scripted user journey.
- **Fix:** a deterministic command that emits a fixed transcript (view → search
  → detail → save → next step) plus a SHA-256 of the fixture, with no live
  network or user text. A test asserts byte-for-byte determinism.
- **Done when:** `npm run walkthrough` exits 0 and repeated runs produce an
  identical fixture hash; docs link the command.

### MTH-007 — CI lint does not deny warnings; suite is not one command

- **Status:** Done
- **Refs:** `.github/workflows/ci.yml:10-24`, `package.json:9-22`,
  `eslint.config.js`.
- **Gap:** `npm run lint` is bare `eslint .`; CI runs `check`, `format:check`,
  audit and a stale-asset check separately. Nothing fails on warnings or
  includes the new verification in the single gate.
- **Fix:** `lint` → `eslint --max-warnings 0 .`; add `verify:events` and
  `walkthrough` to `check`; keep `format:check`, `git diff --exit-code --
dist/data.js` and `npm audit --audit-level=low` in CI so CI and local run the
  same suite.
- **Done when:** `npm run check` exits 0 and covers data, build, lint,
  typecheck, unit tests, content-free verification and walkthrough.

## CV-ready documentation

### MTH-008 — README and release docs do not describe the finished event harness

- **Status:** Done
- **Refs:** `README.md`, `CHANGELOG.md`, new `CONTRIBUTING.md` and
  `THIRD_PARTY_NOTICES.md`.
- **Fix:** add accurate install/run/deploy/backup/restore/verify sections,
  `/api/events`, `report:events`, `verify:events`, `walkthrough`, privacy copy,
  and a contributor/notice file. No contradiction with code.
- **Done when:** every documented command exists in `package.json` and was run
  successfully; `npm run format:check` stays clean.

### MTH-009 — Pilot handoff lacks consent, schedule, intake and go/no-go

- **Status:** Done
- **Refs:** new `docs/pilot-handoff.md`, linked from `docs/student-pilot.md`.
- **Fix:** goal, cohort, exact consent wording, schedule, what to collect,
  failure-as-new-backlog-ID procedure, go/no-go criteria, explicit human-only
  list. Proposed targets labelled, never as outcomes.
- **Done when:** the doc contains all required sections and no measured usage
  claim; `npm run format:check` clean.

## Human only (never marked Done by an agent)

### MTH-010 — Vercel must require green GitHub checks before deployment

- **Status:** Human only
- **Refs:** `.github/workflows/ci.yml`, `vercel.json`, Vercel project settings
  (external). No deploy workflow or hook exists in the repository.
- **Why human:** the gate is a Vercel project setting; no repository edit can
  force it. Until set, a red run may still deploy.
- **Done when:** owner confirms the setting and records the evidence.

### MTH-011 — Licence choice

- **Status:** Human only
- **Refs:** repository root (no `LICENSE` file).
- **Why human:** committing a licence is a public licensing commitment.
- **Done when:** owner chooses and adds a licence, or explicitly keeps the
  repository unlicensed.

### MTH-012 — Live owner-only verification

- **Status:** Human only
- **Refs:** `docs/auth-verification.md:46-64`, `docs/accessibility.md:43-61`,
  `docs/release-status.md:119-125`.
- **Scope:** new-inbox signup email + confirmation + recovery, SMTP delivery,
  signed-in AI generation, Storage upload/review/download/delete, account
  deletion with server secret, manual keyboard/zoom/screen-reader/high-contrast
  pass, production `check:live` after deployment.
- **Why human:** needs external accounts, a real inbox and participants.

### MTH-013 — The seven-day student pilot

- **Status:** Human only
- **Refs:** `docs/pilot-handoff.md`.
- **Why human:** requires recruiting and consenting real participants. This is
  the boundary; work stops here.
- **Done when:** owner records real outcomes and files failures as new IDs.
