# Methodos plan index

This directory is the auditable plan layer for the handoff-ready release. It is
append-only in substance: **never rewrite old entries, never renumber a stable
ID**. Corrections are new entries that point at the earlier one.

| Document                             | Purpose                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| [strategy.md](strategy.md)           | Thesis, users, positioning, measured vs claimed metrics, risks, open questions |
| [roadmap.md](roadmap.md)             | Short / mid / long horizons, split into Intelligence vs Human work             |
| [backlog.md](backlog.md)             | Stable IDs, file:line references, "Done when" per item                         |
| [decisions.md](decisions.md)         | Append-only product/engineering decisions with rationale                       |
| [progress.md](progress.md)           | Append-only log of commands actually run and their exact results               |
| [pilot-handoff.md](pilot-handoff.md) | The human-only seven-day pilot: consent, schedule, collection, go/no-go        |

## Update convention

1. A backlog item moves to `Done` only when its "Done when" command was run and
   its **exact output** was appended to `progress.md` in the same commit.
2. A claimed number without a recorded command is not a claim. Measured numbers
   and proposed targets are kept in separate sections everywhere.
3. Product choices made without the owner are appended to `decisions.md` and
   flagged in the final report. They are reversible in code; expensive or
   irreversible choices are not made here.
4. Each work commit updates the backlog status, the decisions/progress log and
   the user-facing docs it changes, in the same commit.
5. `Intelligence` work is anything an agent can finish without people, accounts,
   money or public commitments. `Human` work is everything else, and is never
   marked `Done` by an agent.
6. The stopping point is the first activity that needs real users. That is the
   seven-day pilot in `pilot-handoff.md`. Work stops there; no owner test, no
   recruited participant and no external account is part of this plan.

Baseline for this plan: working tree at `75cbdef` plus the pre-existing
uncommitted anonymous-event-counter files, inspected 26 November 2026.

**Current snapshot (final reliability sprint):** reviewed baseline `32ef0ba`;
agent-doable work through MTH-045 complete with `npm run check` green at **263
tests** and `npm run perf:mobile` measured. MTH-046 (final CI/deployment IDs),
MTH-010, MTH-011, MTH-012 and MTH-013 are explicitly pending: deployment
verification and all participant/owner-controlled steps. No usage, user or
revenue result has been measured. The audit evidence is in
[`../final-reliability-audit.md`](../final-reliability-audit.md).
