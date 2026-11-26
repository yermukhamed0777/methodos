# Roadmap

Horizons are relative to this handoff, not promises with dates. Every item is
split into **Intelligence** (agent-doable now) and **Human** (owner/participants).

## Short — finish the release (this handoff)

- **Intelligence**
  - MTH-001…MTH-009: clear every agent-doable defect, finish the anonymous
    counter, add the deterministic walkthrough, reconcile docs, make CI run
    the same suite with warnings denied.
  - Run the full verification matrix and record exact output.
  - Commit in small logical commits with plan docs in the same commit.
- **Human**
  - MTH-010: confirm Vercel requires green GitHub checks before deployment.
  - MTH-011: choose and add a licence if desired.
  - MTH-012: owner-controlled signup/recovery/AI/Storage checks.
  - MTH-013: the seven-day pilot itself (see `pilot-handoff.md`).

## Mid — after the pilot

- **Intelligence**
  - Convert every pilot failure filed as a new backlog ID into a regression
    test before any new feature.
  - Add counted funnel evidence to `report:events` only after the pilot window
    has real data; never backfill invented numbers.
- **Human**
  - Recruit 3–5 participants and obtain consent in the agreed wording.
  - Decide go/no-go from the recorded pilot data.
  - Purchase/verify a custom domain only if still wanted; do not attach an
    unowned domain.

## Long — conditional

- **Intelligence**
  - Expand verified university and opportunity coverage only through the
    reviewed source workflow (`docs/maintenance.md`); no numeric filler.
  - Improve editorial review tooling when the review queue grows.
- **Human**
  - Decide whether to fund SMTP/AI quotas based on measured pilot demand.
  - Decide public positioning, repository visibility and release cadence.

**Status of the short horizon:** MTH-001…MTH-009 are Done with recorded
commands and results; the seven-day pilot (MTH-013) has not started. Nothing in
this roadmap authorizes a push, publication, account creation or spend. Those
are separate, explicitly confirmed actions.
