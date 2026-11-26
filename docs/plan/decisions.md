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
