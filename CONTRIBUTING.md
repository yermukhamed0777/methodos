# Contributing to Methodos

Thanks for helping. This repository is the source of truth; deployment follows
a merged, green revision.

## Set up

Requires Node.js 24 and npm.

```bash
npm ci --ignore-scripts
cp .env.example .env.local   # optional for public discovery; fill for account work
npm run dev                  # http://127.0.0.1:4173
```

`.env.local` is ignored by Git and outside `dist/`. Never commit credentials,
and never put a service-role or secret key in a browser-exposed variable.

## Before opening a pull request

```bash
npm run check
npm run check:live            # after a deployment, against the live origin
```

`npm run check` is the complete local gate: data validation, build, ESLint with
warnings denied, strict type checking of the shared calendar module, all Node
tests, the content-free event assertion, the walkthrough fixture check and
Prettier. CI runs the same command plus `git diff --exit-code -- dist/data.js`
and `npm audit --audit-level=low`. A red check must not be merged.

## Working on a defect

1. Add or update a stable `MTH-###` ID in
   [docs/plan/backlog.md](docs/plan/backlog.md), with file:line references and
   a **Done when** criterion that names a runnable command.
2. Write the regression test first and confirm it fails before the fix.
3. Make the smallest coherent fix; update user-facing docs in the same commit.
4. Append the exact command output to
   [docs/plan/progress.md](docs/plan/progress.md). A claim without a recorded
   command is not a claim.
5. If a product choice is needed, append it to
   [docs/plan/decisions.md](docs/plan/decisions.md) with the reasoning.

Never renumber an ID, rewrite an old log entry or add an invented metric.

## Content and privacy rules

- No fabricated eligibility, scores, deadlines, prices or admission predictions.
  Uncertain records stay staged for review.
- Editorial catalog edits follow [docs/maintenance.md](docs/maintenance.md):
  edit `data/*.json`, regenerate with `node scripts/compile-intelligence.mjs`,
  then run `npm run check`, `npm run format:check` and `npm run seed:export`.
- The anonymous counter schema is allowlist-only. Do not add free-text fields,
  account identifiers, URLs or document names to an event. Any new event must
  keep `npm run verify:events` green.

## Scope boundary

This handoff stops at the seven-day student pilot. Contributors must not
recruit participants, create external accounts, spend money, push a release or
change repository visibility/licence without the owner's explicit confirmation.
See [docs/pilot-handoff.md](docs/pilot-handoff.md) for the human-only steps.
