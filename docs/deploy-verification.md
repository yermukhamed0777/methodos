# Deployment handoff · 19 November 2026

## Final source and deployment state (19 November 2026)

- **Final tested `main`:** `dde9f074dbd62f8ce71fa458f8c6c6928e21215e` (merge of PR #34), clean checkout, no open PRs. GitHub Actions `check` **success** on `dde9f07`. `npm run check` → **206/206**, `npm run format:check` clean, `git diff --check` clean.
- **Production:** the owner independently checked on 19 November that the alias `opportunity-explorer-ruddy.vercel.app` still resolves to deployment `dpl_2vNHzHmPHmANQmrFg5oAea4Z1h8w` at source `5c0e185`. I could not inspect Vercel directly to confirm that ID or its READY state. `npm run check:live` again reported **3/6** on this pass: `/glass.css` and `/404.html` are 404 and `/bootstrap.js` lacks the BARYS marker.
- **Automatic deployment status: UNKNOWN.** No Vercel connector is installed, the catalog has no Vercel connector, and there is no Vercel CLI, `~/.vercel` auth, `VERCEL_*` variable, `.vercel/` project link, Actions secret or deploy hook. GitHub shows no deployment records, which establishes only that GitHub CI did not deploy these commits. Whether the Vercel project's Git integration is connected, paused, filtered or pointed elsewhere remains a hypothesis that only project settings can confirm.
- **Smallest owner action:** in the **existing** `opportunity-explorer` Vercel project, confirm Settings → Git (repository, Production Branch, Ignored Build Step), then deploy `dde9f07` through that project or connect the repository and redeploy `main`. Do not create a new project or change environment variables/database. Record the deployment ID, source SHA, alias and READY state, then require `npm run check:live` **6/6** and source SHA equality with `git rev-parse origin/main`.

## Tested commit and earlier state

- **Current `main` at the previous update:** `9f37d7ad17b4b3e9808696f262b2ce56201db3d9` (merge of PR #33). GitHub Actions `check` **success** on `9f37d7a`, `156cb68` and `af16793`. PRs #31–#33 are merged and CI-green.
- **Latest locally tested implementation:** `53ef553b8993d538ff8f92be4331d29516bddd18` (release-hardening tree), where `npm run check`, `npm run format:check` and `git diff --check` were first run. Each later PR repeated the same checks on its own tree and merged green.
- **The commit to deploy is `git rev-parse origin/main` at deploy time**, not a SHA copied from an older handoff. Record that SHA as the deployment source.
- **Production is still stale. Nothing from PRs #28–#33 is live.** `npm run check:live` reports **3/6** against `9f37d7a`.

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
