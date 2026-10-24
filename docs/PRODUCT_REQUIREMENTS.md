# Product requirements: FORM MVP

## Problem

Most calisthenics apps assume the user can already do a push-up, a squat to depth and a 30-second plank. Complete beginners open them, fail the first workout and leave. The research summary in `docs/research/BEGINNER_USER_NEEDS.md` sets out what beginners told forums, reviews and studies they need: a starting point that matches what they can actually do, short sessions, clear technique guidance, and progress they can see without guessing.

FORM is a 12-week bodyweight programme for that person. It starts where they are, uses whatever equipment they have, and moves them up only when their own logged sets show they're ready.

## Who it's for

- Adults who are new to strength training, or returning after a long break.
- People who exercise occasionally (walking, classes, sport) but haven't done bodyweight strength work.
- People who lift in a gym and want to learn calisthenics basics.

It is not for people in rehabilitation or anyone told by a health professional not to exercise. The landing page and sign-up form say it gives general fitness guidance for healthy adults, isn't medical advice, and that people with an injury, a condition or a pregnancy should check with a health professional first. There's no formal pre-exercise screening questionnaire yet (see `KNOWN_LIMITATIONS.md`).

## MVP scope and status

| Area | Requirement | Status |
| --- | --- | --- |
| Accounts | Email and password sign-up, sign-in, sign-out, password reset, protected routes | Built, e2e tested against the local stand-in |
| Onboarding | Goals (up to 3), experience, optional starting-point check (push-up position and reps, squat, plank, row), schedule (2–4 days, chosen days, 15/25/40 minutes), equipment. Resumable at any step | Built, tested |
| Programme engine | Deterministic 12-week plan from the answers: templates A/B(/C), lighter weeks, a session per chosen day, exercises matched to equipment. No randomness, no AI | Built, unit tested |
| Today | Greeting, this week's rhythm from real scheduled sessions, today's session with its first exercise, featured pathway progress, flash notices | Built |
| Workout player | One exercise at a time, target and form tip, rep stepper or hold timer, every set saved to the database as it's logged, rest timer, pause, easier swaps, skip with reason, per-exercise feedback (too easy, about right, too difficult, couldn't finish, pain), end and discard. Survives a refresh mid-set and mid-rest | Built, e2e tested |
| Progression | Moves up only after the top of the range on every set, with good control, rated about right or too easy, in 2 workouts (1 if rated too easy). Pain always means an easier option, and a second report within 14 days pauses that movement | Built, unit and e2e tested |
| Summary | What was done and exactly what changes next time for each exercise, in plain language | Built |
| Exercise library | 68 movements with setup, steps, breathing, cues, common mistakes, safety stops, easier and harder options, muscles, equipment. Search, filters, "my equipment only", bookmarks | Built |
| Skill pathways | Six pathways (push-up, pull-up foundations, squat control, core, dips prep, handstand prep). Gated pathways stay locked until prerequisites are met and re-lock after recent pain | Built, unit tested |
| Progress | Workouts, sets, reps and hold time counted only from logged sets; four-week consistency grid; first-versus-best improvements; variations reached; milestones; paused movements with resume | Built |
| History | Every finished workout, with its report | Built |
| Profile | Name, password change, training settings (rebuilds future sessions only), start a new 12-week block, JSON data export, account deletion | Built, e2e tested |
| Accessibility | WCAG 2.2 AA at 390, 768 and 1440 px, keyboard operable, no sideways scrolling | Axe audits and keyboard tests pass |

## Out of scope for the MVP

These were deliberately left out, as the brief required:

- Paid subscriptions, payments and paywalls.
- Social features: friends, feeds, leaderboards, sharing.
- AI form analysis, camera-based scoring or any "biomechanics" metrics.
- Apple, Google or passkey sign-in (shown in the Stitch concepts but not built).
- Push notifications and reminders.
- Coach chat or personalised advice from a person.
- Native iOS or Android apps. The web app works on phones and can be added to the home screen.

## Safety principles

1. Never progress on completion alone. Logged performance and the user's own rating decide.
2. Pain always leads to an easier option or a pause, with a prompt to see a GP or physiotherapist if it continues.
3. No diagnosis, no rehabilitation prescriptions, no medical claims.
4. Every exercise shows when to stop.
5. Exercise guidance is labelled as not yet professionally reviewed until it has been (see `EXERCISE_CONTENT_REVIEW.md`).
6. Placeholder media is labelled as a placeholder.

## Measuring whether it works

No usage data exists yet, so there are no targets here. Once real people use it, the useful questions are:

- Do people finish onboarding? (`onboarding_responses.completed_at`)
- Do they start and finish their first workout? (`workout_sessions`)
- How many planned sessions are completed in weeks 1–4? (`scheduled_workouts.status`)
- How often is pain reported, and does the pause rule trigger? (`exercise_feedback`, `progression_events`)
- How long until a first variation change? (`progression_events.kind = 'progress'`)

All of these can be answered from the existing tables. No analytics SDK is included.
