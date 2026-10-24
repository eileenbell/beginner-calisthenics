# Known limitations

What isn't finished, what was only partly verified, and what to fix before a wider launch.

## Content and safety

- **No professional review yet.** All 68 exercises and the progression rules are `internal_review` only. See `EXERCISE_CONTENT_REVIEW.md`.
- **Research checked at abstract level.** Full-text access to journals was blocked during research, so some findings are marked as needing confirmation in `docs/research/SOURCES.md`.
- **No demonstration media.** Every exercise uses a labelled placeholder. Licensed photos or video are needed.
- **No pre-exercise screening.** The landing page and sign-up form carry a short health note, but there's no questionnaire (such as one modelled on the ESSA APSS) before training starts.

## Accounts and email

- **Supabase's built-in email sender** is rate limited and meant for testing. The live demo has email confirmation turned off so sign-ups don't stall on it. Password-reset emails still use the built-in sender, so only a few can go out per hour. Add custom SMTP (for example Resend or Postmark) before inviting more than a handful of people, then turn confirmation back on.
- **Email templates** are Supabase's defaults, not branded.
- **Email and password only.** No Apple, Google or passkey sign-in.
- Changing your email address isn't offered in Profile yet.

## Training features

- **Online only.** Each set is saved to the server as it's logged. If the connection drops, the player shows "Not saved" and the set can be logged again, but there's no offline queue.
- **No reminders or notifications.**
- **Rest and pause timers** live in the browser (`localStorage`). They survive a refresh on the same device, but switching devices mid-workout restores the logged sets, not the timer.
- **Time zones.** The schedule uses the time zone captured at onboarding. Travelling across time zones doesn't move sessions.
- **One programme type.** The Foundations 12-week block. Starting a new block carries progression levels forward; there are no specialised programmes yet.
- **Progress charts** are lists and grids, not trend charts.

## Testing

- **End-to-end tests run against a local stand-in** for Supabase Auth (`scripts/local-supabase`), not the hosted service. The database tests use real Postgres with Supabase's roles and RLS, but sign-up, sign-in, email links and token refresh against hosted Supabase were checked by a manual smoke test only. See `TEST_REPORT.md`.
- **Browsers.** Automated tests run in Chromium at phone, tablet and desktop sizes. Safari and Firefox haven't been tested automatically. iOS Safari is the most important one to check by hand.
- **No load or performance testing.**
- **Accessibility.** Axe finds roughly a third to a half of WCAG issues. A manual screen reader pass (VoiceOver on iOS, TalkBack on Android) hasn't been done.

## Operations

- **Free tiers.** Supabase Free pauses a project after a week without activity and has storage and bandwidth caps. Vercel Hobby is for non-commercial use. Both need upgrading before any commercial launch.
- **No error monitoring or analytics.** Server errors appear in Vercel's function logs only.
- **No automated backups** beyond what Supabase Free includes. Free plans don't include point-in-time recovery.
- **Account deletion is immediate** and can't be undone. There's no grace period.

## Design

- The Figma file had no interaction states or responsive layouts, so tablet and desktop layouts, error states and empty states were designed in the existing style rather than taken from Figma. See `DESIGN_IMPLEMENTATION.md` for every deviation.
