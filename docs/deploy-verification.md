# Production deployment check · 17 November 2026

`main` is at `c3cf6cc` (merge of PR #26). GitHub Actions passed for `c3cf6cc` and
`035b2f1`. **Production does not serve that build.** The checks below were made
against `https://opportunity-explorer-ruddy.vercel.app/` after the merges.

## Evidence

| Request                | Expected on `main`                                           | Observed                                                            |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `GET /glass.css`       | `200`, CSS                                                   | `404` platform error page                                           |
| `GET /404.html`        | branded page, title “Page not found — ProspectoAI”           | `404`, title “404: NOT_FOUND” (platform default)                    |
| `GET /` → BARYS dialog | contains “Tell BARYS what you need” (`src/barys.js` line 63) | dialog still shows “Know what has been checked.”                    |
| `GET /api/config`      | `200` with Supabase URL and key                              | `200` (also true before the merges, so it does not prove freshness) |

`dist/glass.css` and `dist/404.html` are tracked on `main`, survive `npm run build`
locally, and are not excluded by `.vercelignore` (which lists only `.git`,
`.github`, `tests`, `node_modules`, `coverage` and archives). The deployed site
therefore predates the first merged change of the day (PR #15), not a build-output
problem in the repository.

## What this means

- The merged work is **not live**. It is merged, CI-green and reproducible
  locally, but students still see the earlier Phase 3 build.
- No conclusion can be drawn about the live registration flow from this
  deployment: it is running the pre-#15 auth page.
- This is not evidence of a repository defect. It points at the deployment
  pipeline: production branch, paused deployments, a failed build, an ignored
  build step, or a project that is no longer connected to this GitHub repository.

## Owner actions

1. Vercel → the `opportunity-explorer` project → **Settings → Git**: confirm the
   repository and the **Production Branch** is `main`.
2. **Deployments**: look for a deployment created after `c3cf6cc`. If one exists
   and failed, read the build log; if none exists, the Git integration is not
   firing.
3. **Settings → Git → Ignored Build Step** (and any “Ignored Build Step” command):
   make sure it does not skip builds for `main`.
4. If builds are paused or the repository is disconnected, reconnect and redeploy
   the latest `main` commit.
5. After the redeploy, re-check the four rows above: `/glass.css` and `/404.html`
   must return `200`, and the BARYS dialog must contain the “Tell BARYS what you
   need” field.

## Deliberately not done

- No `vercel` CLI or token is available in this environment, so no deploy was
  attempted and no project setting was changed.
- Nothing was force-pushed or reverted to make the live site match; `main` is
  intact.
- The live registration round trip remains untested, for the reasons in
  [public registration: verification status](auth-verification.md).
