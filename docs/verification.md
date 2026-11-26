# Verification matrix

Commands were run in the project root on Windows with Node.js **v24.18.1** and
npm **11.16.0**. Measured results below are exact outputs; nothing is inferred.
`npm run check:live` is a read-only probe of the public origin. No participant,
account, email or paid resource was used.

| Command                                        | Exact result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts --no-fund --no-audit` | `added 186 packages in 7s`; exit **0**. One non-fatal deprecation notice on stderr (`whatwg-encoding@3.1.1`).                                                                                                                                                                                                                                                                                                                                                                                        |
| `npm run check`                                | exit **0**. `Data check passed.` · `Validated catalog: 23 opportunities.` · `Platform assets validated: skills, courses, universities, careers and account client.` · node tests **232 total, 232 pass, 0 fail** · `Content-free: PASS · events 6 · dimensions 6 · sha256 dc55917dd0e2f9aa4c0e5fc22733433cee74a365914c274046d3958e6ed3703c` · `Walkthrough: PASS · steps 6 · sha256 d6e3945e4fd7e21663decae090440ffef9c9586dc3b053bd908bf3dd8b12b58c` · `All matched files use Prettier code style!` |
| `npm run check:data`                           | `Data check passed.` (previously "1 editorial warning(s)"; MTH-002 fixed).                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `npm run build`                                | `Validated catalog: 23 opportunities.` · `Platform assets validated: …`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `npm run lint`                                 | exit 0 with `eslint --max-warnings 0 .`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `npm run typecheck`                            | exit 0 (`tsc -p tsconfig.json`, strict checking of the shared calendar module).                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `npm test`                                     | `tests/check.cjs` passed all three blocks; node tests **232 pass / 0 fail** (4650–6628 ms across runs).                                                                                                                                                                                                                                                                                                                                                                                              |
| `node --test tests/discovery-controls.test.js` | **4 tests, 4 pass, 0 fail** (was 3 tests, 2 fail at baseline).                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `npm run verify:events`                        | `Content-free: PASS · events 6 · dimensions 6 · sha256 dc55917dd0e2f9aa4c0e5fc22733433cee74a365914c274046d3958e6ed3703c`; exit 0. Offline, fake browser, no network.                                                                                                                                                                                                                                                                                                                                 |
| `npm run walkthrough`                          | `Walkthrough: PASS · steps 6 · sha256 d6e3945e4fd7e21663decae090440ffef9c9586dc3b053bd908bf3dd8b12b58c`; exit 0. Two consecutive runs produced the same hash.                                                                                                                                                                                                                                                                                                                                        |
| `npm run format:check`                         | `All matched files use Prettier code style!`; exit 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `npm audit --audit-level=low`                  | `found 0 vulnerabilities`; exit 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `git diff --check`                             | no output; exit 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `npm run check:live`                           | **8/8 live checks passed** for `https://opportunity-explorer-ruddy.vercel.app` (homepage, stylesheet, `glass.css`, 404 page, BARYS marker, sign-in page, `/api/config`, anonymous chat 401); exit 0.                                                                                                                                                                                                                                                                                                 |
| `npm run report:events` (no `.env.local`)      | exit **1** with `BLOB_READ_WRITE_TOKEN is not set. Run \`vercel env pull .env.local\` first.` Expected: the counter report needs an owner-provided credential.                                                                                                                                                                                                                                                                                                                                       |

## Browser smoke (local preview)

The in-app browser opened `http://127.0.0.1:4173/` with the local dev server
started by `npm run dev`. It is a scripted visual/DOM check, not a participant
session; there is no Playwright or Puppeteer harness in this repository.

- Page title: `Methodos — Your Development Workspace`. Skip link, Home search,
  primary navigation and sign-in control were present.
- The Home form submitted `zzzznotfound`; the finder showed `0 records` and
  `No matches. Broaden a filter or reset the search.` with the same query in
  `#work-search-q`. The public search flow reached a real result state.
- Three `POST /api/events` requests were observed and none returned 405,
  confirming the local route added for MTH-003.
- The only console errors were `503 /api/config` — expected locally because no
  Supabase environment is configured.
- A viewport capture is saved at
  [docs/walkthrough/finder.jpeg](walkthrough/finder.jpeg) (140111 bytes).

## Deployment variants

Only the **root-path** deployment is supported and configured: `vercel.json`
uses `framework: null`, `outputDirectory: dist` and twelve absolute rewrites.
There is no `basePath`, subpath environment variable or prefixed asset build in
the repository, so a subpath build variant does not exist to verify. This is a
statement of repository configuration, not a claim about a Vercel feature.

## Offline checks

`npm run verify:events`, `npm run walkthrough`, `npm test`, `npm run build`,
`npm run lint` and `npm run typecheck` all ran with no outbound service calls.
`npm run check:live` is the only step that contacts the deployed origin.

## CI equivalence

`.github/workflows/ci.yml` runs `npm ci --ignore-scripts --no-fund --no-audit`,
`npm run check` (which now includes the content-free assertion, walkthrough
check and formatting), `git diff --exit-code -- dist/data.js` and
`npm audit --audit-level=low` on every push and pull request. A red check fails
the job. Whether Vercel blocks deployment on that red job is a project setting
outside this repository and remains MTH-010 (human only).
