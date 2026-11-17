# Changelog

## Unreleased

- Added contextual sign-in and recovery help without reading credentials.
- Added a grounded application writing coach with unsaved drafts and an honest skeleton fallback.
- Added an optional OpenAI-compatible provider so generation does not depend on one deployment gateway.
- Added a shared view registry and fixed auth return links for campus and home views.
- Replaced substring catalog scoring with weighted, deterministic ranking; titles now outrank incidental mentions and source URLs are no longer treated as evidence.
- Added deadline triage, shareable pathway cards, a standards-compliant calendar export and a branded 404 page with recovery links.
- Added glass design tokens and reusable component helpers with reduced-transparency, reduced-motion and high-contrast fallbacks.
- Added route announcements, `aria-busy` progress states and an accessibility statement.
- Added a catalog integrity gate (`npm run check:data`) to `npm run check`, rejecting duplicate ids, non-HTTPS sources, impossible dates and unknown references.
- The AI allowance now reports its real reset time, and a failed request returns the typed question instead of discarding it.
- Archived three expired cycles (NASA Space Apps 2026, Haven game jam 2026, EPFL life-sciences summer 2027) so closed deadlines are no longer offered as live options.

## 5.0.0 · 12 November 2026

- Connected five workspaces with public professional facts, illustrative pathways, CV formats, safe project/research ideas and private admissions folders.
- Expanded official learning resources and field-specific skills; linked evidence, course progress, saved resources and private-data export.
- Added a responsive notification center, command palette, keyboard help, accessible plan ordering/undo, motion controls and original white-lion artwork.
- Added administrator source review, versioned publication/restoration, bounded daily source checks and failure retention.
- Fixed course/funding integration, direct-route initialization, impossible deadline dates, atomic project evidence and null document-review revisions.
- Added strict calendar-module type checks, ESLint, production dependency audit and expanded content/DOM/SQL verification. Live owner-session checks remain explicitly unverified.

## 2.1.0 — 7 November 2026

- Organized and formatted the full source, added local preview commands and deployment documentation.
- Kept saved announcements available when a refresh fails, without changing their original dates.
- Prevented a failed storage read from overwriting an unread feed snapshot.
- Improved tracker backup recovery when browser storage is unavailable.
- Strengthened calendar escaping and catalog date validation.
- Limited feed response sizes while streaming and corrected Atom article-link selection.
- Added failure-recovery, storage, validation and local-server tests, plus continuous integration.
- Pinned a patched transitive dependency.
