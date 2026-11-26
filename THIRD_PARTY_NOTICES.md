# Third-party notices

Methodos depends on the following packages. Versions and licence identifiers
were read from each installed package's `package.json` on 26 November 2026; the
authoritative licences are in `node_modules` and in the packages' repositories.
This notice is attribution only and does not choose a licence for Methodos
itself.

## Runtime dependencies

| Package                 | Version | Licence      | Use                                       |
| ----------------------- | ------- | ------------ | ----------------------------------------- |
| `@supabase/supabase-js` | 2.119.0 | MIT          | Authentication and private workspace data |
| `@vercel/blob`          | 2.8.2   | Apache-2.0   | Private feed snapshots and daily counters |
| `ai`                    | 7.0.169 | Apache-2.0   | Provider-independent AI SDK               |
| `cheerio`               | 1.1.2   | MIT          | HTML parsing for reviewed source checks   |
| `esbuild`               | 0.28.2  | MIT          | Browser bundle generation                 |
| `fflate`                | 0.8.3   | MIT          | Compression utilities                     |
| `mammoth`               | 1.13.0  | BSD-2-Clause | DOCX text extraction                      |
| `unpdf`                 | 2.1.0   | MIT          | PDF text extraction                       |
| `zod`                   | 4.6.6   | MIT          | Runtime validation                        |

## Development dependencies

| Package      | Version | Licence    | Use                               |
| ------------ | ------- | ---------- | --------------------------------- |
| `eslint`     | 10.14.0 | MIT        | Linting                           |
| `globals`    | 17.14.0 | MIT        | Lint environment globals          |
| `happy-dom`  | 21.0.4  | MIT        | DOM integration tests             |
| `prettier`   | 3.9.10  | MIT        | Formatting                        |
| `typescript` | 7.0.2   | Apache-2.0 | Strict checking of shared modules |

Transitive dependencies are recorded in `package-lock.json` and are not
reproduced here. `npm audit --audit-level=low` reported 0 vulnerabilities at
the verification date recorded in
[docs/plan/progress.md](docs/plan/progress.md).

## Content sources

Public opportunity, course and university records cite their own official
sources and review dates in `data/*.json`. Those sources remain the property of
their respective publishers; Methodos stores short attributed references, not
copies of their pages.
