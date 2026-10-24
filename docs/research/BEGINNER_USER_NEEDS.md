# Beginner user needs

No primary user interviews were run for this release. The needs below combine the brief's listed challenges, community-resource observations (S12), competitor positioning (C1–C10) and the exercise-science findings. Each need should be validated with 5–8 beginner interviews and a usability test before investing heavily in V2 (see [PRODUCT_OPPORTUNITIES.md](PRODUCT_OPPORTUNITIES.md)).

| # | Challenge | Why it happens | UX pattern we use | Where in the app |
|---|---|---|---|---|
| N1 | **Not knowing where to start** | Libraries and programmes assume baseline ability | Five-step onboarding, then an optional 5-minute self-assessment. The result is one clear "Start today's workout" button. | Onboarding, Home |
| N2 | **Choosing exercises beyond current ability** | Exercise names don't communicate difficulty; social media shows advanced skills | The app chooses the variation. Users only see "easier" or "swap" options, never a free choice of harder variations until earned. Difficulty is shown as a 1–5 level with words ("Foundation", "Building"). | Workout player, Library |
| N3 | **No pulling equipment** | A bar or low bar is needed for effective pulling (S12) | Equipment is asked up front. The plan shows a clear notice when pulling is limited and links to what equipment would unlock. No improvised anchors. | Onboarding, Plan, Pull-up skill page |
| N4 | **Inconsistent habits** | Unrealistic schedules; all-or-nothing streaks | 2–4 days and 15/25/40-minute options. The weekly plan is a queue; missing a day just moves the next session. Weekly consistency rings instead of streaks. | Onboarding, Home, Progress |
| N5 | **Uncertain about form** | Text-heavy instructions use jargon | Every exercise has setup, steps, breathing, common mistakes and a "what good control looks like" check, in plain language. During a set, only 1–2 key cues are shown, with the rest a tap away. | Exercise page, Player |
| N6 | **Not recognising progress** | Small gains are invisible | Personal bests, variation unlock moments, skill paths with milestones, and a reps/hold history chart per movement family. | Progress, Skills, completion screen |
| N7 | **Overwhelmed by libraries** | Hundreds of options | About 50 exercises grouped by movement family, filterable by pattern, equipment and level, with "Your current variation" highlighted. | Library |
| N8 | **Recovery between sessions** | Beginners train hard every day, or not at all | Suggested rest days, a "rest is training" message, and a recommendation to rest if a full-body session was done yesterday. | Home, Plan |
| N9 | **Knowing when to increase difficulty** | No clear criteria | The engine decides from logged reps and feedback and explains why: "Two more sessions like this and you'll unlock X." | Completion screen, Exercise page |
| N10 | **Intimidation** | Hardcore aesthetics and language | Calm, warm visual direction; supportive copy; no "beast mode" language; regressions framed as normal, not as failure. | Whole app |
| N11 | **Pain or discomfort** | Beginners may push through or quit entirely | One-tap "discomfort or pain" in the player stops the exercise, offers an easier option, and explains when to see a professional. | Player, Progress |
| N12 | **Using a phone mid-workout** | Small targets, sweaty hands, screen timeouts | Large controls (at least 48 px), a single primary action per screen, rest timer with sound/vibration where allowed, wake lock where supported, and state that survives refresh. | Player |

## Design principles derived from these needs

1. **One decision at a time.** Each screen has one obvious next step.
2. **The app carries the expertise.** Users answer simple questions; the app picks exercises.
3. **Always offer an easier way.** Every exercise has an easier option one tap away, with no penalty.
4. **Explain every change.** Progression and regression always come with a reason.
5. **Progress is about the person, not the calendar.** Ability gates advancement; weeks only shape volume.
6. **Rest is part of the plan.** Never punish missed or rest days.
