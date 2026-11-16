# Phase 3: verified theme and loading-screen scope

Verification date: 16 November 2026. Work is on `codex/phase-3-themes`;
this record describes the local feature branch, not a production release.

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

## Evidence

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

## Remaining work

The illustration and loading status do **not** implement a conversational BARYS
assistant. A separate starting screen, personalized greeting, campus opportunity
research, stronger university card hierarchy, and a full assistant remain future
work. No Supabase schema, user records, authentication checks, AI billing or
production configuration were changed for this theme review.

Push/PR, CI outcome and any later deployment must be recorded using their actual
URLs and commit IDs. Local checks alone do not prove that production changed.
