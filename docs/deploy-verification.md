# Deployment handoff · 17 November 2026

## Tested commit and current state

- **Latest tested implementation:** `53ef553b8993d538ff8f92be4331d29516bddd18` on
  `codex/release-hardening` (auth-order fix + live-checker review).
  `npm run check`, `npm run format:check` and `git diff --check` were run on this
  tree. Merge base: `2aff9a1a6297b39bc590a28430a0356f57bcfb11`.
- The only later commit in this PR is documentation. **The commit to deploy is
  `git rev-parse origin/main` at deploy time**, not a SHA copied from an older
  handoff. Record that SHA as the deployment source.
- GitHub Actions `check`: **success** on `2aff9a1` and on this PR.
- **Production is still stale. Nothing in this PR is live until a deployment
  happens.** `npm run check:live` currently reports **3/6**.

## The three stale-production markers

These are the three checks that fail on
`https://opportunity-explorer-ruddy.vercel.app/` and prove the deployed build is
older than the merged code:

1. `GET /glass.css` → `404` (CSS added in PR #18).
2. `GET /404.html` → `404` with the platform default page (added in PR #23).
3. `GET /bootstrap.js` → `200`, but no “Tell BARYS what you need” marker (added in
   PR #15).

Passing now, on the stale build: `/login` (200), `/api/config` (200), and an
anonymous `POST /api/chat` with a valid body (401). The live build still answers
`400` for an anonymous malformed body because it predates this PR's auth-order
fix; that is expected until the new commit is deployed.

## What the deployment evidence establishes — and what it does not

Measured from GitHub and the local checkout:

| Check                                                            | Result                                          |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| GitHub Deployments API for this repo                             | **0 deployments, ever**                         |
| Commit statuses on `09bf33b`, `2a4cdde`, `2aff9a1`               | none                                            |
| Commit statuses on `5c0e185` (the build that appears live)       | **0**                                           |
| `.github/workflows/`                                             | only `ci.yml`; no deploy job                    |
| Actions secrets / variables, deploy-hook references              | none                                            |
| Installed connectors                                             | GitHub only; no Vercel connector in the catalog |
| Vercel CLI, `~/.vercel` auth, `VERCEL_*`, `.vercel/project.json` | absent                                          |

**Established:** GitHub CI has not deployed any of the 17 November commits, and no
GitHub-side deployment was recorded even for the build that is live.

**Hypothesis, not proven:** that the Vercel project's Git repository is
disconnected. GitHub's lack of deployment records is also consistent with a
project connected to a different repository or branch, a paused deployment, an
ignored build step, a build failing before it reports back, or deploys made from
the Vercel CLI/dashboard with status reporting turned off. Only the Vercel project
settings can distinguish these cases.

To confirm: Vercel → project → **Settings → Git** (connected repository and
Production Branch), **Deployments** (a build for the latest SHA and its log),
**Settings → Git → Ignored Build Step**, and **Settings → Environment Variables**
(names only — never copy values into this document).

No build log was available from this environment because no Vercel API path or
credential exists here.

## Smallest owner action

**A. Connect Git (permanent).** Vercel → project → Settings → Git → Connect Git
Repository → `yermukhamed0777/opportunity-explorer` → Production Branch `main` →
Deploy. Later merges then deploy automatically and write a GitHub commit status.

**B. Deploy the tested commit once.** From a clean checkout:

```
git pull --ff-only
git rev-parse HEAD     # deployment source SHA, must equal origin/main
npm ci --ignore-scripts
npx vercel link        # choose the EXISTING opportunity-explorer project
npx vercel --prod
```

Do not create a new Vercel project: it would have a different alias and no
environment variables. Record the deployment ID, source SHA, production alias and
READY state here.

## Exact post-deployment checks

1. Compare the deployment's **source SHA** with `git rev-parse origin/main`. They
   must be identical; do not accept an older preview that merely looks current.
2. `npm run check:live` → **6/6**. All six probes are read-only and
   credential-free: five public GETs plus one anonymous POST that must be
   rejected with 401/403. The script is deliberately outside `npm run check`
   because production is known to be stale.
3. Desktop and **375 px** viewport: `/`, `/login`, `/#finder`, `/404.html` load
   with no browser-console errors.
4. The BARYS dialog contains “Tell BARYS what you need”.
5. `POST /api/chat` signed out returns `401` for **both** invalid and valid
   bodies (the ordering fix), while signed-in invalid bodies still return `400`.
6. Record the deployment ID, source SHA, alias and READY status, then repeat
   `npm run check:live`.

## Not done / not claimed

- No new Vercel project, no credentials changed, no production data written.
- Production is **not** updated and signup email delivery is **not** verified
  (see [auth-verification.md](auth-verification.md)).
- No feature milestone was started while production is stale.
