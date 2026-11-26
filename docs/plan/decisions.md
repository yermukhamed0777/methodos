# Decisions log

Append-only. A decision is implemented consistently, then recorded here. It is
never silently reversed; a reversal is a new entry that names the old one.

## D-01 — Stop at the pilot, not at "it works" (2026-11-26)

The handoff boundary is the first activity needing real users. Everything that
can be built or verified without people, accounts, money or public commitments
is finished first. No owner test and no recruited participant is requested by
an agent. Rationale: the owner asked for the last agent-doable step, not a
known-defect list.

## D-02 — Event schema is allowlist-only and carries no free text (2026-11-26)

Events are `view`, `search`, `detail_open`, `save`, `next_step`, `source_open`.
Properties are enums or coarse buckets; the session ID is a random per-tab
value. Search text, filters typed by a person, notes, document names, file
URLs, email addresses and account IDs are not representable in the schema, so
they cannot be stored even if a caller sends them. DNT/GPC disable collection.
Rationale: counts are useful for a pilot without creating a second private
data set. This is a reversible code decision; privacy behaviour is covered by
an automated content-free assertion (MTH-005).

## D-03 — Archive the passed UBC deadline rather than editing facts (2026-11-26)

`ubc-international-scholars-2027` stated a cut-off of 25 Nov 12:00 PST
(26 Nov 04:00 Hong Kong). At the verified time of 26 Nov 12:14 +08:00 that cut-off
had passed. The record is archived; its deadline text and sources are unchanged.
Rationale: archiving is the honest representation of a closed cycle and avoids
inventing a new date or source. Reversible by editing `data/opportunities.json`.

## D-04 — Keep the Vercel `ignoreCommand` (2026-11-26)

The uncommitted `vercel.json` addition skips builds for commits touching only
`docs/**`, `tests/**`, `.github/**` or `*.md`. It does **not** exclude source,
API, `vercel.json`, `data/**`, `dist/**` or generated assets, so a code change
still builds. Rationale: it reduces noise without weakening the release path.
The separate question of whether Vercel blocks deployment on red CI is a
project setting (MTH-010), not something this command can enforce.

## D-05 — Remove the `ignoreCommand` (reverses D-04, 2026-11-26)

The first production deployment after push failed at the `ignoreStep` with exit
code 129: `warning: Not a git repository. Use --no-index to compare two paths
outside a working tree` (deployment `dpl_63NAKEZmBpjcMUTxhNMB8Th2bSiv`, commit
`1d75c48`). Vercel executes the command where `.git` is unavailable, so a
`git diff --quiet HEAD^ HEAD …` optimization cannot work there. Rationale: the
optimization is not worth a broken release path; every push should build.
D-04 is reversed, not silently rewritten.

## D-06 — Final reliability sprint before the pilot (2026-11-26)

The owner requested a last reliability and release-engineering pass on v5:
catalog provenance and classification, independent BARYS / ProspectoAI failure
testing, grounded-answer checks, account/RLS/private-document testing, Vercel and
auth configuration reconciliation, constrained-mobile payload and accessibility
review, then the full suite and `check:live` against the final deployment. This
expands D-01's stopping point before the seven-day pilot; D-01 is not erased,
the pilot remains the human boundary. Recruitment, consent, real accounts,
SMTP, live AI generation and manual assistive-technology checks stay Human
only. No catalog expansion or redesign is authorized unless a verified defect
requires a minimal fix.

## D-07 — Keep confirmation links PKCE-only (2026-11-26)

The browser client uses `flowType: 'pkce'` and the callback accepts `?code=`
exchanges only; implicit bearer-token fragments are rejected with
`flow_state_not_found`. Rationale: fragments are attacker-controlled login-CSRF
input and the documented email links are PKCE. The real link form still needs an
owner observation; no email delivery is claimed.

## D-08 — A confirmed future deadline is an expected cycle, never open (2026-11-26)

`cycleStatus` maps `deadlineConfirmed`/`deadlineVerified` with a future
`finalDeadline` to `Upcoming` and the badge to `Expected Cycle`; only
`openVerified` plus a checked application URL can produce `Verified Open`.
Rationale: a confirmed cut-off is evidence about a date, not about availability.
This preserves the distinction between directories, archived cycles,
illustrative pathways and confirmed open applications.

## D-09 — Generated answers with no traceable reviewed record are rejected (2026-11-26)

A completion that is empty, oversized, includes links/guarantees, or names no
retrieved record is replaced by a labelled catalog fallback (503) with the
request ID. Rationale: prompt instructions are not validation; a reference strip
beside unsupported prose is not source grounding. Structural checks are not a
semantic truth proof and no live model evaluation is claimed.

## D-10 — Static policy audit is a gate; live cross-account access is human-only (2026-11-26)

`npm run audit:ownership` inspects all reviewed migrations and is part of
`npm run check`. Rationale: it catches missing owner predicates and anon grants
without creating accounts. Actual cross-account attempts with isolated
identities still require owner Supabase credentials and remain MTH-012/013.

## D-11 — Constrained-mobile measurement is report-only (2026-11-26)

`npm run perf:mobile` records FCP/load/resources/bundle bytes under CDP
throttling; it has no pass/fail budget. Rationale: measured values must not be
invented, and a timing threshold would be flaky in CI. The measured guest payload
still carries private bundles; deferring them is proposed, not implemented.
