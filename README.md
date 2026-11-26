# Methodos

Methodos connects opportunity discovery, career skills, public professional pathways, university research and private development planning. The current release is version 5. See [release evidence and limits](docs/release-status.md) and [authentication/domain configuration](docs/auth-routing-and-domains.md).

The expansion adds a white-lion assistant identity, grounded source retrieval, 281 official learning resources, 100 editorial projects, research ideas, evidence comparisons, private admissions folders, notifications, and administrator review/history. Content examples are labelled and uncertain external records remain staged.

A place to explore education and career possibilities, build useful skills and keep track of the next step.

[Open the website](https://opportunity-explorer-ruddy.vercel.app/)

![Methodos university discovery preview](docs/preview.png)

## Explore

- Research programmes, scholarships, hackathons and olympiads, with filters, comparisons and deadline reminders.
- **Search for Universities**: laboratories, undergraduate research, prototyping and distinctive degree partnerships. No score thresholds or admission predictions.
- **Skills for Your Major or Career**: 33 field maps with evidence-based progress, tools, projects and official course links.
- **Internships and Jobs**: official career sources and individual postings. A source directory is clearly distinguished from a vacancy; missing deadlines are not guessed.
- A private account workspace with a saved application tracker, profile and private activities. Activities support notes, dates, categories, priority, progress, filtering and sorting.
- Public catalog search and BARYS, the built-in navigation guide. ProspectoAI is the separate source-grounded AI assistant available after confirmed sign-in.

The initial expanded collection contains 33 programme records, 12 university profiles, 33 field maps, 28 courses, 10 illustrative career pathways and 9 career sources/postings. Some records are directories or closed-cycle preparation watchlists. Each retains its source and review date. Prices, openings, facilities access and programme conditions can change.

See [development workspace architecture and verification](docs/development-workspace.md) for onboarding, profiles, private CV/portfolio documents, reviewed extraction, learning progress, editable time-bounded plans, comparisons and privacy controls.

## Run locally

Requires Node.js 24 and npm.

```bash
npm ci --ignore-scripts
# Copy .env.example to .env.local and fill in the two Supabase settings.
npm run dev
```

Open `http://127.0.0.1:4173`. `npm run dev` automatically loads `.env.local` with Node’s native `--env-file-if-exists` option and builds current catalog and browser bundles before starting. Restart development after source edits to rebuild the bundles. Existing shell variables take precedence over the file. Public discovery works without signing in or configuring Supabase. If the file or either required setting is missing, the server still starts and the login page displays a setup diagnostic with sign-in and recovery forms disabled. Personal workspace features require configured Supabase settings and confirmed sign-in.

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the same Supabase project. Use a publishable key (or legacy anonymous key), never a secret/service-role key. Restart the server after editing `.env.local`. The file is ignored by Git, is outside the served `dist/` directory, and is never copied into browser bundles. `npm run build` remains available for an explicit rebuild.

```bash
npm run check          # data, build, lint (warnings denied), typecheck, tests,
                       # content-free event check, walkthrough fixture, formatting
npm run format:check   # included in check; kept separate for quick feedback
npm audit --audit-level=low
npm run seed:export
npm run verify:events  # content-free counter assertion, no network
npm run walkthrough    # verify the deterministic capture fixture
npm run check:live     # read-only probes against the deployed origin
npm run report:events -- --days=7 --json   # needs BLOB_READ_WRITE_TOKEN
```

Every command above was run for this handoff. Exact commands and results are
recorded in [progress.md](docs/plan/progress.md); the full verification matrix
is in [verification.md](docs/verification.md).

Set deployment environment variables in Vercel and local values in `.env.local`. The `dev` script loads this file; other plain Node commands need exported values or Node’s explicit `--env-file-if-exists=.env.local` option. Never commit credentials. The configuration endpoint exposes only validated public Supabase settings, a non-secret AI capability flag and, when running locally, setup diagnostics.

## Source and build

| Path                                                | Purpose                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `dist/index.html`, `dist/app.js`, `dist/styles.css` | Existing explorer and tracker                                        |
| `src/platform.js`, `dist/platform.css`              | Accounts, skills, universities, careers, activities and assistant UI |
| `data/opportunities.json`, `data/resources.json`    | Researched source catalogs                                           |
| `dist/assets/`                                      | Methodos SVG mark and dark/light wordmarks                           |
| `api/`                                              | Configuration, chat, feeds, review report and scheduled refresh      |
| `lib/`                                              | Retrieval, source auditing, feed parsing, storage and caching        |
| `supabase/migrations/`                              | Reproducible schema and ownership policies                           |
| `supabase/seed.sql`                                 | Generated, source-backed public content; no users or secrets         |
| `tests/`                                            | Validation, tracker, calendar, assistant, feeds and renewal checks   |
| `docs/`                                             | Skills guide, recovery notes and review workflow                     |

`npm run build` validates the catalogs and bundles the login, bootstrap and workspace scripts from pinned packages. Catalog JSON remains outside public output. Anonymous `GET /api/catalog` returns a read-only projection of reviewed repository content, excluding staged review items and private/audit fields. Signed-in catalog requests also retrieve published database revisions. Generated bundles are ignored in Git; the source and lockfile reproduce them.

## Supabase

Create a project, then apply the migrations in order. Run the idempotent `supabase/seed.sql` after reviewing it. Direct database access to resources requires login; public discovery uses the reviewed repository projection without anonymous owner-table queries. Profiles, trackers and activities are restricted to their owners using `auth.uid()` in every policy. Saving, private folders, documents, custom plans and AI require authentication. No server secret is used in the browser. A server-only `SUPABASE_SECRET_KEY` is required solely for the optional account-deletion capability.

The account client supports email/password registration, login, logout, session persistence and reset-password links. Before opening registration publicly, configure these owner settings:

1. **Authentication → URL Configuration**: set the Site URL to the production origin. Allow its root and password-recovery redirects.
2. **Authentication → Email / SMTP**: configure delivery for public users. Supabase's default sender is restricted and is not a production email service.
3. Confirm email signup is enabled; test confirmation and recovery using an account you own.

Do not disable email confirmation as a workaround for delivery failures. The UI surfaces delivery and session errors without pretending a registration succeeded.

## Environment variables

| Variable                   | Visibility           | Purpose                                                       |
| -------------------------- | -------------------- | ------------------------------------------------------------- |
| `SUPABASE_URL`             | Public configuration | Project API origin                                            |
| `SUPABASE_PUBLISHABLE_KEY` | Public configuration | Browser-safe key; RLS enforces ownership                      |
| `BLOB_READ_WRITE_TOKEN`    | Server secret        | Private feed and source-review snapshots                      |
| `CRON_SECRET`              | Server secret        | Scheduled refresh authorization                               |
| `SUPABASE_SECRET_KEY`      | Server secret        | Enables deletion of the signed-in account only                |
| `AI_GATEWAY_MODEL`         | Server configuration | Exact `provider/model` ID from the gateway catalog            |
| `AI_GATEWAY_API_KEY`       | Server secret        | Gateway authentication when deployment OIDC is not configured |
| `AI_DIRECT_MODEL`          | Server configuration | Model ID for an OpenAI-compatible provider                    |
| `AI_DIRECT_API_KEY`        | Server secret        | Enables generation without the Vercel gateway                 |
| `AI_DIRECT_BASE_URL`       | Server configuration | Optional HTTPS-compatible API origin                          |

The public config endpoint returns only the project URL, publishable key and capability flag. It never returns AI, cron, storage or service-role secrets.

## AI interface and limits

`POST /api/chat` validates input, retrieves matching researched records and returns attributed references with review dates. It uses the provider-independent Vercel AI SDK and the configured gateway model. Set `AI_GATEWAY_API_KEY` securely, or use deployment OIDC only after the project owner approves that authentication setup. A ChatGPT subscription is not used by the website.

The sign-in page includes contextual recovery help derived only from the visible status message. Signed-in students can also open the **Application coach**, which drafts one short section from their own notes and the reviewed catalog. It never submits or saves an application; without generation it returns a clearly labelled writing skeleton.

Set `AI_DIRECT_MODEL` and `AI_DIRECT_API_KEY` to use an OpenAI-compatible provider instead of the Vercel gateway. `AI_DIRECT_BASE_URL` is optional and must be HTTPS. The key stays server-only and the public configuration endpoint exposes only a capability flag.

AI calls require a verified Supabase session. The database enforces 10 requests per user per day and 200 requests site-wide per day. Inputs, history and output length are bounded. A failed provider, missing configuration or exhausted allowance returns clearly labelled catalog search. A personalized plan asks for missing stage, field, time and goals first.

The model has no tools to execute commands, modify the database, submit applications or send messages. Imported content is data, and model text is rendered as text rather than HTML. Chat history stays in the tab, is cleared on account changes, and is not stored by the app unless a user explicitly saves a recommendation as an activity. AI messages and selected context are transmitted to the model provider; provider retention policies still apply.

The quota RPC is an intentionally privileged, narrowly scoped function: it checks the current authenticated user, uses a fixed search path and serializes counter updates. Anonymous execution and direct counter-table access are denied. Security advisors may flag authenticated execution for review; granting arbitrary clients counter-table write access would defeat the limit.

## Weekly renewal

Vercel Cron triggers `/api/refresh` daily at 01:00 UTC / 09:00 China/Hong Kong time (`0 1 * * *` in `vercel.json`). Daily runs collect attributed Telegram/RSS leads and check expanded sources; Monday’s trigger also performs the full legacy source renewal with bounded HEAD requests. Failed checks retain previous records. Changed headers, stale provider facts and broken links enter a read-only review report. A separate Supabase pg_cron job marks known expired public opportunities without deleting saved user data.

The process does not automatically rewrite university facilities, course prices or job eligibility from scraped text. Those facts enter the repository review workflow before publication. See [maintenance workflow](docs/maintenance.md).

## Deployment

Import the repository root into Vercel with framework **Other**. Use `npm run build`, `npm ci --ignore-scripts --no-fund --no-audit`, output `dist` and Node.js 24. Include the entire repository source; publishing only the feed functions causes the missing-homepage failure described in [recovery notes](docs/recovery.md).

Configure the environment variables, apply the database migrations and seed, then deploy the tested GitHub revision. Verify the production origin, assets, `/api/config`, `/api/discover`, `/api/renewal`, anonymous API denial and signed-in user flows. Vercel READY is not sufficient proof.

GitHub is the source of truth. Keep provider fact changes, schema changes and configuration instructions in the repository. Use a PR and passing checks before merging a release.

## Privacy and costs

Legacy guest tracker data remains in the browser for explicit import after login. Signed-in trackers, profiles and activities are private to the user. Guest data is imported only on request. Shared links and calendar exports omit private notes. A tracker backup contains notes and should be kept private.

Supabase, Vercel functions, Blob storage, email delivery and AI have separate quotas and may incur charges. No paid tier or billing commitment is included in source configuration. AI request caps bound volume; monitor provider prices, account budgets and hosting usage before growing traffic. Expensive model changes require reviewing those limits.

## Backup and restore

- **Guest tracker:** in Application tracker, choose **Export backup** to download
  `prospectoai-backup.json`. It contains saved opportunity IDs and progress only;
  notes stay in the JSON and must be kept private. Choose **Import backup** with a
  file smaller than 1 MB to merge saved items and progress. Unknown IDs are
  rejected. If browser storage is unavailable, the import lasts for the current
  session only — export again before leaving.
- **Signed-in workspace:** in My Workspace → Privacy → **Export my data (.json)**
  downloads the profile, records, document text and metadata, skills, courses,
  plans, searches, recent views, activities and tracker. It excludes login
  tokens and temporary file URLs. Original documents are not included in that
  JSON: download them separately before deleting an account.
- **Restore:** import a guest backup into Application tracker; for an account,
  sign in first, then import a tracker backup and re-upload any original
  documents you need. No automatic remote backup exists.

## Anonymous usage counters

Methodos records six content-free event names — `view`, `search`, `detail_open`,
`save`, `next_step` and `source_open` — to understand which parts of the public
flow are used during a pilot. Properties are enums or coarse result buckets.
Search text, typed filters, notes, document names, file URLs, email addresses
and account IDs are not part of the schema and are never stored. A random
per-tab session ID links a search → detail → save → next-step funnel; it is not
derived from an account or device. Do Not Track and Global Privacy Control
disable collection. Daily private blobs under `methodos/events/` are deleted
after 30 days by the `/api/events` cron (`30 1 * * *`), which requires
`CRON_SECRET`.

`POST /api/events` accepts batches of at most 20 validated events; invalid
batches are acknowledged without a write. `GET /api/events` is cron-only and
returns 405 unless `CRON_SECRET` is configured. Run `npm run verify:events` to
assert that emitted, aggregated and reported JSON contain no journal or account
content; it uses no network and no real data. `npm run report:events` prints
totals and the funnel after `vercel env pull .env.local`.

Created by **Yermukhamed Tuktibay**.

## Authentication and custom domains

See [auth routing, exact redirects and DNS rollout](docs/auth-routing-and-domains.md). Unsigned visitors can browse public discovery immediately; personal actions show a sign-in prompt with a return link to the current view. Password recovery has a dedicated `/reset-password` route, and confirmation has `/auth/callback`. A custom domain must be purchased or owned and verified before auth configuration switches to it.
