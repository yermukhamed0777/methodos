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

## Defect found during delivery

### MTH-014 — Vercel production deployment failed at the ignored build step

- **Status:** Done
- **Refs:** `vercel.json` (`ignoreCommand`, now removed), `docs/plan/decisions.md`
  D-04/D-05, deployment `dpl_63NAKEZmBpjcMUTxhNMB8Th2bSiv` at `1d75c48`.
- **Evidence:** GitHub Vercel status `failure`: `Command failed with exit code
129 … warning: Not a git repository. Use --no-index to compare two paths
outside a working tree`, `errorStep: "ignoreStep"`. Production
  `GET /api/events` returned 404, proving the new code was not deployed.
- **Fix:** remove `ignoreCommand` so every push builds; record the reversal in
  D-05. No source, data or CI behaviour changes.
- **Done when:** a new production deployment succeeds, `GET /api/events` is no
  longer 404, `npm run check:live` reports 8/8, and the exact deployment ID and
  commit SHA are appended to `progress.md`. Verified at commit `959b75c`,
  deployment `dpl_AxQMA7QyNZQ3XMcTTEWUS4gaMCMn` (Ready, Production, Current),
  `GET /api/events` → 401 and `check:live` → 8/8.

## Final reliability sprint — 26 November 2026

### MTH-015 — Regenerated derived catalog from reviewed sources

- **Status:** Done
- **Refs:** `scripts/compile-intelligence.mjs`, `data/intelligence.json`,
  `data/learning-resources.json`.
- **Evidence:** shipped `opportunity-rsi` had `status: "Deadline not announced"`
  while `deadlineVerified: true`; the compile mapping already emitted `Upcoming`.
  Regeneration exposed one source record with trailing whitespace in `name`.
- **Fix:** removed the whitespace in `data/learning-resources.json` and reran
  `node scripts/compile-intelligence.mjs`; the archived UBC cycle and all
  confirmed-deadline statuses now match their sources.
- **Done when:** `npm run check` passes on the regenerated projection. Verified.

### MTH-016 — Confirmed future deadlines mislabelled as unannounced

- **Status:** Done
- **Refs:** `lib/intelligence-core.js`, `tests/deadline-labels.test.js`,
  `tests/public-discovery.test.js`.
- **Fix:** `cycleStatus` treats a confirmed future deadline as `Upcoming`, never
  as an open application; `deadlineInfo` accepts `deadlineConfirmed` as well as
  `deadlineVerified`. Badge is `Expected Cycle`, not `Awaiting Review` or
  `Verified Open`.
- **Done when:** 3 new tests pass and the full suite is green. Verified.

### MTH-017 — Data gate did not cover the expanded catalog

- **Status:** Done
- **Refs:** `scripts/check-data.js`, `tests/check-data.test.js`.
- **Fix:** `validateData` now checks `data/intelligence.json` ids, names, sources,
  dates, open claims and review queue; `check:data` loads the file. Also warns on
  confirmed-verification records with tentative notes.
- **Done when:** `npm run check:data` passes with the expanded catalog included.
  Verified.

### MTH-021 — Generated answers were not checked against their evidence

- **Status:** Done
- **Refs:** `lib/grounding.js`, `api/chat.js`, `tests/ai-grounding.test.js`,
  `tests/chat-grounding.test.js`.
- **Fix:** answers with no reviewed match never reach a model; completions that
  are empty, oversized, contain invented links/guarantees, or name no reviewed
  record are replaced by a labelled catalog fallback (HTTP 503) and the request
  ID is retained. Contradicting source dates are surfaced as notes.
- **Done when:** stub-generation tests pass; no live claim is made. Verified.

### MTH-023 — Coach/plan provider failure left an unusable error

- **Status:** Done
- **Refs:** `api/coach.js`, `tests/coach.test.js`.
- **Fix:** provider failure returns a labelled, skeletons-first response instead
  of a bare error, with private provider text withheld.
- **Done when:** coach failure test passes. Verified.

### MTH-032 — Static ownership-policy audit

- **Status:** Done (static). Live cross-account attempt remains MTH-012/MTH-013.
- **Refs:** `scripts/audit-ownership.js`, `tests/ownership-audit.test.js`,
  `package.json` (`audit:ownership` in `check`).
- **Fix:** automated review of all migrations: 18 private tables have owner
  policies and no anon grants; private Storage folder predicate, four private
  document policies and admin gates are present. No live identity was created.
- **Done when:** `npm run audit:ownership` prints PASS and the test is green.
  Verified.

### MTH-034 — Auth flow type contradicted PKCE confirmation links

- **Status:** Done
- **Refs:** `src/auth-client.js`, `src/auth-flow.js`, `tests/public-config.test.js`,
  `tests/auth-flow.test.js`.
- **Fix:** client uses `flowType: 'pkce'`; callbacks exchange `?code=` only and
  reject implicit bearer-token fragments with `flow_state_not_found`.
- **Done when:** both tests pass. Verified. Note: the real email link form
  remains an owner observation (MTH-012).

### MTH-036 — Public projection removed a legitimate disclaimer

- **Status:** Done
- **Refs:** `lib/public-catalog.js`, `tests/public-discovery.test.js`.
- **Fix:** the sensitive-key filter keeps `credentials`, which on reviewed skill
  records is a published certificate/access disclaimer, not a secret value.
- **Done when:** a test asserts the disclaimer is present in anonymous catalog
  output. Verified.

### MTH-037 — Coursera records carried a LinkedIn Learning cost claim

- **Status:** Done
- **Refs:** `data/resources.json`, `data/intelligence.json`.
- **Fix:** the seven Coursera course cost notes now describe provider/institutional
  access generically; no free certificate is promised. LinkedIn Learning records
  keep their own provider-specific wording.
- **Done when:** regenerated data and `npm run check` pass. Verified.

### MTH-038 — Keyboard reachability across all hubs was untested

- **Status:** Done (automated portion)
- **Refs:** `tests/workspace-keyboard.test.js`, `src/view-registry.js`,
  `src/navigation.js`.
- **Fix:** regression tests enumerate every hub item, assert labels/safe hashes,
  private-gate registration, and announcer/focus/title updates on every public
  workspace.
- **Done when:** tests pass. Verified. Manual screen-reader/zoom remains MTH-012.

### MTH-039 — Constrained-mobile loading was unmeasured

- **Status:** Done (measurement only, not a performance gate)
- **Refs:** `scripts/perf-check.js`, `package.json` (`perf:mobile`).
- **Fix:** deterministic CDP-throttled 375 px slow-4G/4x-CPU probe of the local
  preview or public origin; reports FCP, load, resource counts, blocking head
  assets and per-bundle bytes.
- **Done when:** `npm run perf:mobile` reports measured values. Verified.
  Measured guest payload still includes 81 KiB `workspace.js` and 54 KiB
  `intelligence.js`; deferral is proposed, not implemented.

### MTH-040 — Derived opportunity statuses disagreed with their reviewed sources

- **Status:** Done
- **Refs:** `scripts/normalize-derived-status.js`, `scripts/compile-intelligence.mjs`,
  `data/intelligence.json`, `tests/catalog-consistency.test.js`.
- **Evidence:** 10 confirmed future deadlines were published as
  `Deadline not announced` in the expanded catalog while their source records
  had `deadlineConfirmed: true`; the UBC 2027 cycle was archived in
  `data/opportunities.json` but not in the derived mirror. A confirmed deadline
  was not an open application — the bug was the label, not the cycle rule.
- **Fix:** map confirmed future deadlines to `Upcoming` in the compiler, add a
  reusable normalizer, and assert mirror agreement in tests. No catalog record
  was added and no deadline was invented.
- **Done when:** `node scripts/normalize-derived-status.js`, `npm run check:data`
  and `node --test tests/catalog-consistency.test.js` pass. Verified.

### MTH-041 — Programme dates and verification claims contradicted their notes

- **Status:** Done
- **Refs:** `data/development.json`, `data/intelligence.json`,
  `supabase/seed.sql`, `scripts/check-data.js`.
- **Evidence:** IMPA summer 2027 listed a registration date (18 Jan 2027) after
  its programme start (4 Jan 2027) while its note says it is not a confirmed
  scholarship deadline; OIST Fall 2027 said "Confirmed future deadline" while
  its note calls the schedule tentative.
- **Fix:** clear IMPA's unconfirmed deadline fields, relabel OIST's verification,
  regenerate the seed, and make `check-data` reject deadline-after-start and
  confirmed/tentative contradictions.
- **Done when:** `npm run check:data`, `npm run seed:export` and the consistency
  tests pass. Verified.

### MTH-042 — Render-blocking stylesheets on a constrained mobile connection

- **Status:** Done
- **Refs:** `scripts/build-platform.js`, `dist/index.html`, `dist/auth.html`,
  `.gitignore`, `tests/design-system.test.js`.
- **Evidence:** the home shell linked ten synchronous stylesheets; local
  measurement before the change showed 10 CSS requests. `npm run perf:mobile`
  now reports 1 CSS request / 144 KiB and FCP 1908 ms at 375 px, slow 4G, 4x CPU.
- **Fix:** the build emits one `dist/bundle.css` in cascade order and both shells
  link it; individual CSS files remain for review, tests and live markers.
- **Done when:** `npm run build`, `npm run check` and `npm run perf:mobile` pass.
  Verified. The 2.36 MB catalog payload reduction remains a proposal.

### MTH-043 — Keyboard and dialog focus gaps

- **Status:** Done (automated portion)
- **Refs:** `src/access.js`, `dist/index.html`, `dist/auth.html`,
  `tests/workspace-keyboard.test.js`.
- **Fix:** sign-in dialog focus restoration falls back to `#main-content` when
  the opener is detached; the account menu is a labelled `group` instead of a
  `menu` without arrow-key behaviour; the sign-in shell has a skip link and a
  focusable `main`.
- **Done when:** `npm run check` passes. Verified. Manual screen-reader and
  200% zoom checks remain human-only.

### MTH-044 — Release-path configuration checks were vacuous or unsafe

- **Status:** Done
- **Refs:** `.github/workflows/ci.yml`, `.vercelignore`, `CONTRIBUTING.md`,
  `docs/verification.md`.
- **Fix:** the CI step `git diff --exit-code -- dist/data.js` (an absent,
  untracked file, so always green) now asserts the generated catalog is not in
  `dist`; `.vercelignore` excludes `.env`, `.env.*` and `.vercel` so a CLI deploy
  cannot ship local credentials. The failed Git-dependent `ignoreCommand`
  remains absent (D-05).
- **Done when:** `npm run check` and `git grep -n -i ignoreCommand -- vercel.json`
  (no match) pass. Verified.

### MTH-045 — Account deletion and document errors were not failure-safe

- **Status:** Done
- **Refs:** `api/account.js`, `tests/account-deletion.test.js`,
  `api/document.js`, `lib/document-parser.js`, `lib/document-worker.js`.
- **Evidence:** private files were removed before the account was deleted, so a
  failed deletion could leave a live account without its documents; parser
  errors could echo library text containing file names or fragments.
- **Fix:** disable/delete the account first, then clean Storage with an honest
  `storageCleanup` result; allowlist every document message that may leave the
  parser. No user ID or path is accepted from the request.
- **Done when:** the new tests and `npm run check` pass. Verified. Production
  deletion with the server secret remains owner-only (MTH-012).

### MTH-046 — Final deployment verification after the reliability sprint

- **Status:** Pending owner confirmation of push/deploy.
- **Done when:** CI is green for the final commit, Vercel reports Ready for the
  same SHA, `npm run check:live` passes against that deployment, and the exact
  IDs are appended to `progress.md`.

### MTH-047 — Data gate covered only some reviewed seed files

- **Status:** Done
- **Refs:** `scripts/check-data.js`, `tests/check-data.test.js`,
  `data/intelligence.json`.
- **Fix:** all eight reviewed JSON seed files are loaded; the expanded
  intelligence catalogue is checked for ids, names, HTTPS sources, ISO dates,
  open claims, archived/open contradictions and review-queue ids; every record
  reviewed date must not postdate the collection header. Header date corrected
  from `2026-11-12` to the actual maximum `2026-11-24`; one trailing-space name
  fixed in source data. No record or fact was added.
- **Done when:** `npm.cmd run check:data` passes and
  `node --test tests/check-data.test.js` passes 18/18. Verified.

### MTH-048 — Admin health mislabelled a URL count as approval

- **Status:** Done
- **Refs:** `api/admin.js`, `lib/intelligence-core.js`.
- **Fix:** `approvedSources` renamed to `sourceUrls` in both the API response
  and the summary. No record carries an approver or rights field, so the old
  name claimed a review that does not exist.
- **Done when:** `git grep -n approvedSources -- api lib tests` returns no match
  and `npm run check` passes. Verified.

### MTH-049 — Feed cadence metadata disagreed with the cron

- **Status:** Done
- **Refs:** `lib/feeds.js`, `data/feed-snapshot.json`.
- **Fix:** the public schedule text now says daily at 01:00 UTC (09:00 Hong
  Kong), matching `/api/refresh` in `vercel.json`.
- **Done when:** `git grep -n 'Monday morning' -- lib data` returns no match.
  Verified.

### MTH-050 — Labelled workspace groups had no role

- **Status:** Done
- **Refs:** `src/workspace.js`.
- **Fix:** onboarding progress, activity legend and active-filter chips now
  have `role="group"` so their `aria-label` is exposed to assistive technology.
- **Done when:** `npm run check` passes with the updated DOM tests. Verified.
  Screen-reader confirmation remains MTH-012.

### MTH-051 — A final/late deadline could hide the earlier regular deadline

- **Status:** Done
- **Refs:** `src/workspace.js`, `tests/deadline-labels.test.js`.
- **Fix:** opportunity cards and detail views render both the regular deadline
  and the final/late cut-off with explicit labels instead of choosing only
  `finalDeadline`.
- **Done when:** `npm.cmd test` passes with the deadline-label tests. Verified.

### MTH-052 — Final live verification after the bundled stylesheet change

- **Status:** Pending deployment (same gate as MTH-046).
- **Refs:** `scripts/check-live.js`, `dist/index.html`.
- **Evidence:** the checker now expects `/bundle.css`; the still-deployed
  `32ef0ba` shell serves `/methodos-ui.css`, so the production probe is
  **7/8 (exit 1)** until the final commit is deployed. The local preview of the
  final build is 7/8 with only the expected `/api/config` 503 (no Supabase env).
- **Done when:** `npm run check:live` reports 8/8 against the deployed final
  SHA and the run/deployment IDs are appended to `progress.md`.
