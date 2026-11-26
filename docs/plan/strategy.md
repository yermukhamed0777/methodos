# Strategy

## Thesis

Methodos gives a student one honest place to go from "what could I do?" to a
verified next step: discover sourced opportunities and universities, build a
field-specific skill map, and keep a private, owner-controlled workspace. The
product deliberately refuses to invent eligibility, scores, deadlines or
admission predictions.

The release thesis for this handoff is narrower: the product is complete to the
point where a seven-day student pilot can be run by the owner. No new feature
is added after the event/counter finish; remaining effort is verification,
documentation and a clean release path.

## Users

- **Guest student** — arrives signed out, browses the reviewed public catalog,
  uses BARYS for navigation, and opens official sources. No account required.
- **Signed-in student** — saves opportunities, keeps a private tracker and
  documents, records course progress and plans, uses ProspectoAI with consent.
- **Owner / maintainer** — prepares the deployment, reviews editorial changes,
  monitors counters and runs the pilot. This is the only role present today.

## Positioning

Sourced, verification-labelled exploration plus a private planning workspace —
not an admissions predictor, not an application submitter, and not a social
network. Every editorial example is labelled. Uncertain external records are
staged, not published as fact.

## Measured vs claimed

**Measured** (commands and exact results are in
[progress.md](progress.md); the section below is only a summary):

- Baseline `npm run check` on 26 November 2026: **225 passed / 2 failed** of 227
  node tests, with `check:data`, build, lint, typecheck and `tests/check.cjs`
  passing. The 2 failures are MTH-001.
- `npm run format:check`: failed on `api/events.js` (MTH-004).
- `npm audit --audit-level=low`: **0 vulnerabilities**.
- `git diff --check`: clean.
- No live user, usage, retention, revenue or conversion number was measured.

**Claimed / not measured** — none. The student-pilot success target
("at least 4 of 5 students find a credible next step in five minutes") is a
**proposed target**, not an outcome, and is labelled as such in the pilot doc.

**Not claimed**: successful new-user email delivery, live AI generation,
account deletion in production, a WCAG audit, any production usage count, or
that a deployment gate is enforced by Vercel project settings.

**Final measured state (appended after the fixes):** `npm run check` exit 0 with
**232 tests, 232 pass, 0 fail**; `npm run check:live` **8/8**; `npm audit
--audit-level=low` **0 vulnerabilities**; `npm ci` **186 packages in 7s**;
content-free and walkthrough checks both PASS with recorded SHA-256 hashes. The
full matrix is in [docs/verification.md](../verification.md). No usage or user
number was measured.

## Risks

1. **Release risk** — red CI may not stop a Vercel Git deployment; that switch
   lives in Vercel project settings (human-only, MTH-010).
2. **Privacy risk** — the anonymous counter must never carry free text. The
   allowlist is enforced in one shared module and covered by a content-free
   assertion (MTH-005).
3. **Data freshness** — provider deadlines move; one record had already passed
   (MTH-002). Editorial review, not scraping, keeps facts honest.
4. **Unverified external flows** — signup email, SMTP, recovery, AI and Storage
   cannot be established from this environment (MTH-012).
5. **Licence** — no `LICENSE` file exists. Adding one is a public licensing
   commitment and is deliberately left to the owner (MTH-011).

## Open questions (resolved where an agent could resolve them)

- Which licence? **Owner-only**, recorded in MTH-011. No file was added.
- Should docs-only commits skip Vercel builds? Kept the existing
  `ignoreCommand` because it never excludes source, API, `vercel.json` or
  generated assets; recorded in decisions D-04.
- What counts as "content-free"? Resolved in MTH-005 as an automated assertion
  over the exact emitted JSON payload, not a documentation promise.

## Correction — 2026-11-26 (supersedes the `ignoreCommand` answer above)

The older open-question answer above says the `ignoreCommand` was kept (D-04).
That is no longer true. D-05 reversed D-04 after production deployment
`dpl_63NAKEZmBpjcMUTxhNMB8Th2bSiv` failed at `errorStep: ignoreStep` with exit
129 (`warning: Not a git repository`). `ignoreCommand` was removed in `959b75c`.
Verified again on 2026-11-26: `git grep -n -i ignoreCommand -- vercel.json`
returns no match, and `vercel.json` contains only `buildCommand`,
`installCommand`, `outputDirectory`, functions, crons, rewrites and headers.
Do not reintroduce a Git-dependent ignore step.

## Final reliability state — 2026-11-26

Measured on the integrated tree: `npm run check` exit 0 with 263/263 tests,
data check, static ownership audit (18 private tables), build, lint, strict
typecheck, content-free assertion and deterministic walkthrough; `npm run
check:live` 8/8. Constrained-mobile measurement is report-only: 375 px slow 4G
and 4× CPU gave FCP 1,324 ms, load 2,709 ms, 489 KiB JS and 144 KiB CSS, with
81 KiB `workspace.js` and 54 KiB `intelligence.js` still loaded for guests.
Catalog status defects, PKCE alignment, grounded-answer fallbacks, public
credentials disclaimer and keyboard hub coverage were fixed (MTH-015…MTH-039).
Live cross-account access, real email/SMTP, live AI generation, private Storage
and manual assistive-technology checks remain human-only. No usage, user or
revenue outcome was measured. The seven-day pilot is still the boundary.
