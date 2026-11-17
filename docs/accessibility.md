# Accessibility statement

This is the working accessibility reference for the ProspectoAI web app. It
describes what is implemented, how it is verified, and what is still missing.
It is not a conformance claim.

## Implemented

- **Language and structure.** `<html lang="en">`, one `<h1>` per page, a single
  `<main id="main-content" tabindex="-1">`, and labelled `<nav>` landmarks.
- **Skip link.** The first focusable element is “Skip to content”, visible on
  keyboard focus and pointing at `#main-content`.
- **Keyboard operation.** All navigation, tabs, dialogs and forms are native
  buttons, links and inputs. BARYS uses a native `<dialog>` and restores focus
  to the launcher when closed. The mobile sidebar moves focus to its close
  button, traps Tab inside the panel and returns focus to the toggle.
- **Route announcements.** Changing view moves focus to `<main>`, writes a
  polite “Now viewing …” message to `#route-announcer` and updates the document
  title. Re-selecting the current view does not repeat the announcement.
- **Current location.** `aria-current="page"` is set on the active hub tab, hub
  item and the “Start here” link.
- **Live progress.** Assistant replies stream into an `aria-live="polite"`
  region. While a request runs, `#chat-messages` is `aria-busy` and
  `#chat-status` announces “Searching the researched collection”. The coach
  result panel does the same with `aria-busy`.
- **Focus visibility.** `:focus-visible` outlines are applied to buttons, links,
  inputs, selects, textareas and `<summary>`.
- **Reduced motion.** Loader animation is removed under
  `prefers-reduced-motion: reduce`; glass hover lifts are opt-in under
  `no-preference`.
- **High contrast.** `forced-colors: active` restores borders and system colours,
  removes translucency and shadows, and switches focus rings to `Highlight`.
- **Content safety.** All catalogue and model text is escaped before insertion;
  icon-only buttons carry `aria-label`; decorative images use `alt=""`.

## Verification

`tests/a11y.test.js` checks the shell (skip link, single `h1`, labelled
navigation, image `alt` attributes), route announcements, title updates,
announcer de-duplication, the visually-hidden utility and the forced-colors
block. Run `npm test` for the full suite.

Manual checks still required before a release:

1. Keyboard-only pass through sign-in, discovery, BARYS, assistant and coach.
2. VoiceOver (Safari/macOS) or NVDA (Firefox/Windows) pass on the same flows.
3. 200% zoom and 320 px viewport width without horizontal scrolling.
4. Windows high-contrast mode with the glass surfaces enabled.

## Known limits

- The public catalogue tables are not yet fully described for screen readers;
  long result lists rely on headings and count announcements rather than a grid
  role.
- Chat history is kept in the tab only, so a reload loses context for everyone,
  including assistive-technology users.
- Automated tests assert markup and behaviour, not perceived contrast. Colour
  pairs are covered separately by `tests/theme-contrast.test.js` for the defined
  theme tokens only.
- No formal audit (WCAG 2.2 AA) has been completed. Treat this document as the
  current implementation record, not certification.

## Reporting a problem

Open an issue on the repository with the page, the assistive technology and
browser used, and the step where the barrier occurs. Please do not include
personal application data in a public issue.
