# Phase 3: verified theme and loading-screen scope

Verification date: 16 November 2026. The theme foundation was merged in
[PR #13](https://github.com/yermukhamed0777/methodos/pull/13) at
`32b68bf0ade825086243b96000a66618056b3e37`. The subsequent discovery release is on
`codex/phase-3-home-campus-barys`; publication and deployment evidence belong in
its PR and release handoff.

## Implemented

- Light, Dark and System modes persist under `prefers-theme`. The small maintained
  runtime in `dist/theme.js` applies the resolved mode in the document head before
  deferred application code runs. Both the main application and account page load
  the theme stylesheet and controller.
- One controller owns the media-query listener. Choosing a manual mode removes
  that listener, returning to System reattaches it once, and `destroy()` removes
  listeners. Browser code contains no mock media-query globals or test hooks.
- Theme controls retain a visible keyboard focus indicator and a 44px minimum
  height. The mobile header places Menu, Theme and Account on one row, with search
  below. The mobile label remains available to assistive technology.
- Dark palette roles and the wordmark are readable against their surfaces.
  A mathematical contrast regression test checks the text/background pairs named
  in `tests/theme-contrast.test.js` against 4.5:1. This is a targeted check, not a
  claim that every rendered state has received a complete accessibility audit.
- The loading screen uses the existing local white-lion illustration named BARYS,
  shared theme tokens, a status announcement and a reduced-motion-aware spinner.
  `src/boot-status.js` hides it after startup, clears the busy state, and replaces
  it with an escaped error message and one working Retry button on failure.
  No artificial wait or invented completion percentage is added.
- Explore exposes the existing university route as **Universities & Admissions**.

`dist/theme.js`, `dist/theme.css`, `dist/loading.css` and the HTML/CSS shell are
maintained files in this repository. Other browser bundles are built from `src/`.
The theme runtime is explicitly included in lint coverage. Formatting exclusions
cover generated bundles and dependency files; `src/*.js` is not excluded.

## Initial theme evidence

- `npm run check`: build, lint, scoped type checking and **93 tests passed**.
- `npm run format:check`: passed.
- `npm audit --json`: zero reported vulnerabilities.
- Theme tests execute the actual controller in isolated Happy DOM windows and
  cover early initialization, both System transitions, manual overrides, actual
  listener removal, repeated initialization, cleanup and unavailable storage.
- Local browser: selecting Dark on `/login` survives reload; the public catalog
  retains the preference. Light, Dark and System controls were exercised.
- Local desktop Dark view and mobile 375px Dark / 430px Light views were inspected.
  Header controls fit without overlap; the 375px page had no document-wide
  horizontal overflow. Section navigation intentionally scrolls horizontally.
- Local account pages show the setup diagnostic because this workspace has no
  `.env.local`. An authenticated production session was not tested in this review.

## Discovery release

- A separate Home route opens at `/`, `/home` and `#home`. Existing opportunity
  links retain their finder behavior. The brand and Start here control return
  Home; four primary hubs remain intact.
- Guided discovery cards explain opportunities, admissions, courses, careers and
  the campus explorer. Counts are derived from the returned catalog.
- Confirmed signed-in users see a local-time greeting with their actual profile
  name and up to three real active plan tasks. Empty and failed-sync states do not
  invent progress. Tests cover escaping and late responses after navigation.
- University names lead redesigned cards. Details expand to expose the original
  research, admissions and campus sources. Location, field and query filters,
  alphabetical/location sorting, result counts and clear-filter recovery work
  with existing records. Comparison and private folders retain existing guards.
- At my university offers researched institutional resources and category filters.
  Individual openings require an exact institution ID and Verified Open status;
  missing coverage is stated explicitly. Capability profiles are not vacancies.
- Campus selections can be shared through exact-ID URLs. Browser storage is opt-in
  and stores only the university ID; clear selection removes it. It does not alter
  the account profile. Back restores URL-backed campus filters.
- BARYS is an on-demand white-lion guide with contextual help, practical answers,
  navigation, session hide/reopen, native dialog keyboard behavior and focus
  restoration. It uses no model calls. Open-ended AI stays in the existing gated
  assistant and depends on the existing provider/account configuration.
- Courses have platform and format filters, honest unknown-format labeling,
  12-item pages, complete catalog coverage and clear recovery from no matches.
- Home shows only reviewed open deadlines within 30 days, with a badge legend.
  Directories, stale reviews and previous cycles are excluded from that radar.

## Discovery validation

`npm run check` passed build, lint, scoped type checking and **107 tests**.
Formatting passed before final release documentation; the dependency audit found
zero vulnerabilities. The final formatting check and GitHub CI are release gates.

Local browser review exercised Home, university location filtering, institution
links to campus, campus category Back navigation, BARYS navigation to a gated
private plan, course provider filtering, page changes, empty-state reset, and both
themes. Desktop, 375px and 430px views were inspected; the narrow views had no
document-wide horizontal overflow. The missing-account local startup error found
in that review was fixed and covered by a regression test. Old console entries
remain in the browser log, but no new occurrence followed the corrected reload.

## Boundaries

No Supabase migration, user-data write, authentication-policy change, AI billing
change or new service dependency is part of this release. BARYS is a deterministic
guide, not a general-purpose chatbot. Campus resources are limited to the existing
reviewed university profiles; this release does not claim a fresh university-wide
vacancy crawl. Authenticated production verification is reported separately from
the isolated signed-in tests.

Push/PR, CI outcome and any later deployment must be recorded using their actual
URLs and commit IDs. Local checks alone do not prove that production changed.
