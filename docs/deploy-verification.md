# Production deployment check · 17 November 2026 (second pass)

`main` was `2a4cdde08f2917c9754b1b470aae09ebc1083a20` (merge of PR #28) when this
pass was recorded. The investigation below was run at `09bf33b`; PR #28 added only
`npm run check:live` and documentation, and the probe still reports **3/6** at
`2a4cdde`. Re-run `npm run check:live` for the current figure rather than trusting
this paragraph.
GitHub Actions: `check` **success** for `2a4cdde`, `09bf33b` and `c3cf6cc`.
Production: **still the pre-#15 build.**

## 1. What the live site serves

`node scripts/check-live.js` (added in this change) probes markers that only
exist at or after a known commit:

```
FAIL  glass.css is served — HTTP 404                        (merged in PR #18)
FAIL  branded 404 page is served — HTTP 404                 (merged in PR #23)
FAIL  BARYS asks for a request — HTTP 200, marker missing   (merged in PR #15)
PASS  sign-in page offers account creation — HTTP 200
PASS  public config answers — HTTP 200
PASS  anonymous chat is rejected — HTTP 401
3/6 live checks passed
```

`/bootstrap.js` returns 200 but does not contain “Tell BARYS what you need”,
which was introduced in `edc2447` (PR #15). The live build therefore predates the
first merge of 17 November and matches the Phase 3 release documented for
`5c0e185`.

Anonymous `/api/chat` is correctly rejected (`401 login_required`) when the body
is valid. A malformed body returns `400` **before** the auth gate runs; that is an
ordering observation, not an access bypass, and no catalog data is returned.

## 2. Why automatic deployment did not happen

Checked, with results:

| Check                                             | Result                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| GitHub Deployments API for this repo              | **0 deployments, ever** (`?per_page=100`)                            |
| Commit statuses on `09bf33b`                      | none; combined state `pending`                                       |
| Commit statuses on `5c0e185` (last known release) | **0**                                                                |
| `.github/workflows/`                              | only `ci.yml` (build, lint, typecheck, tests, audit) — no deploy job |
| Repository Actions secrets / variables            | none                                                                 |
| Deploy-hook references in the repo                | none                                                                 |
| Installed connectors                              | GitHub only; no Vercel connector exists in the catalog               |
| Vercel CLI                                        | not installed                                                        |
| `~/.vercel` auth, `VERCEL_*` env, `.env.local`    | absent                                                               |
| `.vercel/` project link in the checkout           | absent                                                               |

Vercel’s GitHub integration writes both a Deployment and a commit status for every
build. Neither exists for any commit, including the releases that are live. **The
Vercel project is not connected to this GitHub repository**; the live site was
produced by a manual deploy from the owner’s machine or dashboard. Pushing to
`main` therefore cannot update production, no matter how green CI is.

No build log exists to inspect, because no build was ever requested for these
commits.

## 3. Smallest owner action

Two options. The first fixes it permanently.

**A. Connect the repository (recommended).** Vercel → project → **Settings → Git →
Connect Git Repository** → select `yermukhamed0777/opportunity-explorer` → set
**Production Branch** to `main` → **Deploy**. Every later merge to `main` then
deploys automatically, and a Vercel commit status will appear on GitHub, which
makes staleness detectable next time.

**B. Deploy the exact commit once.** On the owner’s machine, from a clean checkout
of the latest `main`:

```
git pull --ff-only
git rev-parse HEAD     # record this SHA as the deployment source
npm ci --ignore-scripts
npx vercel link        # choose the existing opportunity-explorer project
npx vercel --prod
```

Do not create a new project: that would produce a different alias and a new
environment with no variables. Either way, record the deployment ID, the source
SHA and the READY state, then run `npm run check:live` — it must print **6/6**.

## 4. What could not be done here

- No Vercel connector is installed, and the connector catalog contains no Vercel
  entry, so there is no dashboard or API path from this environment.
- No token, CLI session, project link, Actions secret or deploy hook exists, so a
  deployment cannot be created or promoted.
- Nothing was force-pushed, reverted or re-tagged; `main` is intact and matches
  the commits listed above.

## 5. Verification to repeat once deployed

1. `npm run check:live` → 6/6.
2. Desktop and 375 px: `/`, `/login`, `/#finder`, `/404.html` load without console
   errors.
3. The BARYS dialog contains “Tell BARYS what you need”.
4. `/api/chat` with a valid body still returns `401` signed out.
5. Record the deployment ID, source SHA, alias and READY state here.
