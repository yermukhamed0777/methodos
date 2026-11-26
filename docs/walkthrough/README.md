# Scripted walkthrough

`npm run walkthrough` verifies that [transcript.json](transcript.json) still
matches the deterministic six-step capture produced by
`scripts/walkthrough.js`. Use `npm run walkthrough -- --write` to regenerate it
byte-for-byte. The current fixture SHA-256 is
`d6e3945e4fd7e21663decae090440ffef9c9586dc3b053bd908bf3dd8b12b58c`.

The transcript contains allowlisted event names and coarse properties only. It
has no user text, no account identifiers and no network data, so it can be used
as a storyboard for a later video without re-running the app or handling
private content.

[finder.jpeg](finder.jpeg) is a one-off local-browser capture of the public
Opportunity finder (signed out, no Supabase configuration). It is visual
evidence only; it is not a participant observation and is not part of the
deterministic fixture check.
