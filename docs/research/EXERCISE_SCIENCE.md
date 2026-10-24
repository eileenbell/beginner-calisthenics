# Exercise science for beginner calisthenics

This document turns the evidence into programming rules the app can enforce. Each finding is tagged:

- **Evidence**: supported by research listed in [SOURCES.md](SOURCES.md), with the source number.
- **Convention**: widely used coaching practice that is sensible but not directly tested in the form we use it.
- **Decision**: what the app does as a result.

Important limitation: sources were verified at abstract or official-summary level (see SOURCES.md). A qualified exercise professional should review the programming before public launch. This is listed in [EXERCISE_CONTENT_REVIEW.md](../EXERCISE_CONTENT_REVIEW.md).

## 1. Progressive overload with bodyweight

**Evidence.** The 2026 ACSM position stand (S1) concludes that healthy adults should do *progressive* resistance training and that gains in strength and size occur across a wide range of loads when effort is sufficient. Push-ups with the body position adjusted to match a 40% 1RM bench press produced similar strength and hypertrophy gains to the bench press over eight weeks (S4), and elastic-band push-ups matched bench press strength gains at similar intensity (S5). Bodyweight exercise is a legitimate strength stimulus, provided the variation is hard enough.

**Evidence.** Changing body angle changes load. Force-plate data (S6) put a floor push-up at about 64% of bodyweight, kneeling about 49%, hands on a 61 cm box about 41%, and feet elevated about 70–74%. A wall push-up is lower again (not measured in S6; inferred from the incline trend).

**Decision.** Progression in the app has two levers, in this order:
1. **Reps or hold time within a target range** for the current variation.
2. **Variation change** (a harder lever, such as a lower incline) once the top of the range is reached with good control across sessions.

Weekly "add a rep regardless" progression is not used.

## 2. Beginner strength adaptations

**Evidence.** Resistance training improves strength, size, power, endurance, gait speed and balance against no exercise (S1). Most prescription details (training to failure, equipment type, periodisation model, set structure) did not consistently change outcomes for the average healthy adult (S1).

**Convention.** Early strength gains in novices are largely neural and skill-related, which is why technique practice and repeated exposure to the same movement pay off quickly.

**Decision.** Keep the exercise menu small and stable. A beginner repeats the same few movement families every session so skill and strength both build, rather than rotating through dozens of exercises. Variety comes from progressing within a family.

## 3. Frequency and recovery

**Evidence.** Australian guidelines recommend muscle-strengthening activity on at least two days a week (S2, S3). ACSM's strength findings favour at least two sessions per week (S1). With volume equated, training frequency had no significant effect on strength gains (S8).

**Convention.** For full-body sessions, at least one rest day between sessions is the standard beginner recommendation. Four-day plans usually split into upper and lower days so the same muscles aren't trained on consecutive days.

**Decision.**
- 2 days a week: two full-body sessions (A and B), suggested Monday and Thursday.
- 3 days: full-body A/B alternating, suggested Monday, Wednesday, Friday.
- 4 days: upper / lower split, suggested Monday, Tuesday, Thursday, Friday. Each pattern is still trained twice a week.
- The app never schedules the same full-body session on consecutive days, and it suggests rest if a full-body session was completed the day before.
- The schedule is a suggestion. Sessions are a queue, not fixed dates, so a missed day shifts rather than "fails".

## 4. Muscular endurance versus strength

**Evidence.** ACSM (S1) reports greater strength gains with heavier relative loads and more endurance-style adaptation with lighter loads and higher reps. With bodyweight, the relative load is set by the variation.

**Decision.** Rep ranges are kept at roughly 5–12 for most strength exercises. If a user can do more than about 12–15 reps of a variation with good control, the app moves them to a harder variation rather than letting sets drift into 20+ reps. Isometric holds use 10–45 s ranges.

## 5. Volume, sets and rest

**Evidence.** 2–3 sets per exercise is supported for strength (S1). More than 5 weekly sets per muscle group produced somewhat larger strength gains than 5 or fewer (S7). Untrained people appear to do well with roughly 60–120 s rest between sets (S9; secondary summaries, to be confirmed).

**Decision.**

| Session length | Main exercises | Sets each | Typical weekly sets per pattern (3 days) |
|---|---|---|---|
| 15 min | 4 | 2 | 4–6 |
| 25 min | 5 | 2–3 | 6–8 |
| 40 min | 6–7 | 3 | 8–9 |

- Week 1 uses 2 sets regardless of session length, to introduce the movements.
- Rest defaults: 60 s for core and lighter exercises, 90 s for main push, pull and squat work. The user can add 30 s or skip rest.
- A lighter week (one fewer set) is placed in weeks 4 and 8 (**convention**: planned lighter weeks are common coaching practice, not a finding of S1).

## 6. Effort and proximity to failure

**Evidence.** Training to failure did not consistently improve outcomes (S1). Reps-in-reserve (RIR) scales are a practical way to rate effort (S10), but people tend to underpredict how many reps they have left, and accuracy improves with experience (S11).

**Decision.** Sets are prescribed to end with roughly 1–3 good reps left. The app asks for simple feedback after each exercise (*too easy, about right, too difficult, couldn't finish, discomfort or pain*) and separately asks whether the reps were done with good control. Progression decisions combine **logged performance** with that feedback, never feedback alone and never "completed" alone.

## 7. Safe progression and regression

**Convention (S12).** Community-tested progression ladders and the "3×5 to 3×8, then move up" double-progression approach are widely used by beginners. They are not trial-tested as a system but are internally logical, conservative and transparent.

**Decision.** The rule set (full detail in [CONTENT_MODEL.md](../specs/CONTENT_MODEL.md) and the engine source):

- **Progress the variation** when the user has hit the top of the rep or time range on every prescribed set, reported good control, and rated the exercise *about right* or *too easy*, in **two consecutive exposures**. A single *too easy* with top-of-range performance counts as a strong signal and progresses after one exposure.
- **Increase reps** within the range when all sets reached the current target with good control and no difficulty flag.
- **Hold** when performance is in range but not at the top, or control was not confirmed.
- **Step back** (reduce target, then regress the variation) after *couldn't finish*, or *too difficult* twice in a row, or when most sets fell below the bottom of the range.
- **Pain** stops the exercise in-session, swaps it for the next easier variation next time, and after two pain reports in the same family within 14 days pauses that family with advice to see a health professional. The app never prescribes through pain.

## 8. Technique and range of motion

**Evidence.** ACSM associates full range of motion with greater strength gains (S1).

**Decision.** Every exercise has a written range-of-motion standard (for example, "chest within a fist's width of the surface"). A regression is preferred over partial reps. Progression requires "good control", which the exercise page defines in plain language.

## 9. Wrist, shoulder and elbow loading

**Convention.** Beginners commonly report wrist discomfort in push-ups and planks (wrist extension under load) and elbow or shoulder irritation from jumping straight into dips or full hangs.

**Decision.**
- Every push-up and plank page offers a wrist-friendly option: fists or push-up handles in a neutral wrist position, or forearm planks.
- Wrist preparation is in the warm-up of any session that includes hand-supported work.
- Dips are not prescribed in the first 12 weeks. A "dip preparation" skill path uses support holds and bench-supported work with conservative range limits.
- Hanging starts with feet-supported or short hangs and scapular pulls before negatives.
- Handstand preparation is locked until the user meets push and core prerequisites and has no recent wrist or shoulder pain flags.

## 10. Balanced patterns

**Decision.** Every week trains five patterns: squat or lunge, hinge, horizontal or vertical push, horizontal or vertical pull, and core (anti-extension plus either anti-rotation or lateral). Generator tests check this balance for every combination of days and equipment.

**No-equipment pulling.** Without a bar, rings, a low bar or bands, there is no effective substitute for loaded pulling. The app offers prone floor work (prone Y-raises, floor "swimmers", reverse snow angels) to train upper-back endurance and posture, and it says plainly that this does **not** replace rows or pull-ups. It never suggests door frames, tables, towels in doors or other improvised anchors. The pull-up skill path recommends a proper pull-up bar or a park with low bars.

## 11. Warm-up and mobility

**Evidence.** Structured dynamic warm-ups reduce some injuries in team-sport populations (S15). The transfer to bodyweight strength training is indirect.

**Decision.** A 3–5 minute general plus movement-specific warm-up (joint circles, wrist prep when needed, bodyweight rehearsal of the first exercise at an easier level). A 2–4 minute cool-down of easy mobility. Long static stretching is not placed before strength work.

## 12. Skill acquisition

**Convention.** Skills are learned faster with frequent, high-quality, non-fatigued practice and clear external cues.

**Decision.** Skill-type work (hollow body, hangs, support holds) goes early in the session when fresh, uses short sets, and has one or two cues shown during the set. Detailed cues are one tap away rather than on screen during effort.

## 13. Adherence and motivation

**Evidence.** Autonomous motivation and feelings of competence predict exercise participation (S14). Habit automaticity builds over weeks to months, with a wide range, and an occasional missed day did not derail it (S13).

**Decision.**
- Show competence: personal bests, variation unlocks, skill milestones.
- Offer choice: substitutions, easier variations, skip with a reason, all without penalty.
- No daily streaks. Consistency is measured per week against the user's own plan, and rest days count as part of the plan.
- After 14+ days away, the next session automatically drops one set per exercise and says why.

## 14. Readiness screening

**Convention / professional tool (S16).** ESSA's Adult Pre-Exercise Screening System uses a short self-administered stage asking about known heart conditions, chest pain, dizziness, uncontrolled conditions and similar, with advice to seek medical guidance if any are answered yes.

**Decision.** An optional, short readiness check written in our own words. If the user answers yes to any item, the app explains that it's sensible to speak to a GP or exercise physiologist before starting, and asks the user to confirm they've considered that before continuing. The app does not diagnose, does not adapt the programme for medical conditions, and stores only a yes/no "check flagged" result and the time it was acknowledged, not the individual answers.
