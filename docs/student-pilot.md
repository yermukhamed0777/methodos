# Methodos release and student pilot

The full handoff — consent wording, schedule, collection fields, failure
intake, go/no-go criteria and the human-only list — is in
[pilot-handoff.md](pilot-handoff.md). This file is the pre-flight checklist.

## Before inviting students

- [ ] Verify the live deployment SHA matches the reviewed merge and `npm run check:live` passes 8/8.
- [ ] On desktop and at 375 px, start signed out. Search from Home, open a result, find eligibility and deadline details, and follow the official provider link. Check that Save prompts for sign-in and preserves the return view.
- [ ] With an owner-controlled new inbox, confirm signup email arrives, open it in the same browser, sign out and back in, and verify password recovery. Check SMTP and Auth logs if mail does not arrive; do not disable confirmation.
- [ ] With that account, save an opportunity and mark a course in progress. Sign out and sign in again and verify both persisted. If documents or AI are part of the pilot, verify upload/review/download/delete with a harmless owner test file and confirm an actual AI response separately.
- [ ] Complete the keyboard, zoom, screen-reader and high-contrast checks in [accessibility.md](accessibility.md).

## Pilot

Ask 3–5 students to try, without guidance: “Find one opportunity that fits your situation. Tell me whether you can apply, where you checked, and the next step you’d take.” Use the public flow first; offer saving only after signup has been verified. Do not ask students to submit applications, share private documents, or expose account details.

For each session, record success without help, time to a credible next step, and the first blocker, without storing names or account details. Aim for at least 4 of 5 students to find a credible next step in five minutes. Fix the recurring blocker before adding features.
