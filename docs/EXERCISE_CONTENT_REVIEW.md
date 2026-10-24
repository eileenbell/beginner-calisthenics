# Exercise content review

## Status

All 68 exercises have validation status `internal_review`. That means the guidance was written from the sources in `docs/research/SOURCES.md` and checked for internal consistency (ladder order, equipment, dosage ranges, easier and harder links), but **no qualified professional has reviewed it yet**. The app says so on every exercise page.

Those research sources were verified at abstract or official-summary level only, because full-text journal pages couldn't be opened from the research environment. `SOURCES.md` marks which findings need full-text confirmation.

**Before a public launch, an accredited exercise physiologist or physiotherapist should review the content listed below.** Once an exercise is signed off, change its status to `professional_review` in `src/domain/content/exercises.ts`, regenerate the reference data (`npm run db:reference`), and add a migration.

## What's in the library

| Family | Exercises, easiest first |
| --- | --- |
| Push-up | Wall push-up, High incline push-up, Mid incline push-up, Kneeling push-up, Low incline push-up, Floor push-up, Feet-elevated push-up |
| Pike (handstand prep) | Bench pike push-up, Pike push-up, Elevated pike push-up |
| Squat | Assisted squat, Box squat to chair, Bodyweight squat, Tempo squat |
| Lunge | Supported split squat, Split squat, Step-up, Reverse lunge, Rear-foot-elevated split squat |
| Hinge | Glute bridge, Marching glute bridge, Band Romanian deadlift, Single-leg glute bridge, Single-leg hip thrust |
| Row | Steep inverted row, Band seated row, Incline inverted row, Band bent-over row, Bent-knee inverted row, Inverted row |
| Upper back (floor) | Prone Y raise, Reverse snow angel |
| Pull-up | Dead hang, Feet-supported hang, Scapular pull-up, Lat pulldown (gym), Flexed-arm hang, Negative pull-up, Band-assisted pull-up, Pull-up, Chin-up |
| Plank | Incline plank, Kneeling forearm plank, Forearm plank |
| Hollow | Bent-knee dead bug, Dead bug, Tuck hollow hold, Hollow body hold |
| Side plank | Kneeling side plank, Bird dog, Side plank |
| Dip prep | Support hold, Scapular dip, Negative dip (partial range) |
| Handstand | Elevated pike hold, Partial wall walk, Chest-to-wall handstand hold |
| Warm-up and cool-down | March in place, Arm circles, Wrist preparation, Cat-cow, Hip hinge drill, Lunge with reach, Wall scapular push-up, Child's pose, Kneeling hip flexor stretch, Lying hamstring stretch, Chest opener |

Each exercise has: plain-language summary, setup, numbered steps, what good control looks like, breathing, cues, common mistakes, when to stop, easier and harder options, primary and secondary muscles, equipment and surfaces, and a typical dose (sets and a rep or time range).

## Items flagged for the reviewer

These were flagged while writing and need a professional's view first:

- **Negative pull-up.** The claim that negatives beat band assistance rests on vendor summaries we couldn't trace to studies (S17). The app offers both and doesn't rank them.
- **Negative dip (partial range).** The depth limit is a conservative coaching convention, not evidence-based.
- **Partial wall walk** and **chest-to-wall handstand hold.** Inversions. Check the screening and stop guidance, particularly for people with blood pressure concerns, glaucoma or recent head injury.
- **Push-up ladder order.** Kneeling sits between mid and low incline based on force-plate estimates (S6). Some coaches place it lower.
- **Rest intervals** (60–120 s for beginners) rely on secondary summaries of S9.

## Progression rules to review

The rules live in `src/domain/engine/progression.ts`, with tests in `progression.test.ts`:

- **Move up a variation** after the top of the range on every set, with good control, rated *about right* or *too easy*, in two workouts in a row. One *too easy* workout at the top of the range is enough.
- **Raise the target** within the range when every set reached the current target with good control.
- **Hold** when performance is in range but not at the top, or control wasn't confirmed.
- **Step back** (lower target, then an easier variation) after *couldn't finish*, *too difficult* twice running, or most sets below the range.
- **Choosing an easier variation mid-workout** makes it the starting point next time.
- **Pain** swaps to the next easier variation next time. A second pain report in the same family within 14 days pauses that family, with advice to see a GP or physiotherapist. Pain within 30 days also blocks gated skill pathways from unlocking.
- **Gated pathways** (handstand prep, dips prep, harder pull-up stages) stay locked until named milestones are reached in prerequisite families.

## Safety wording to review

- The health notes on the landing page and sign-up form (who the app is for, and when to check with a professional first). Consider adding a short pre-exercise screen modelled on the ESSA APSS structure (S16).
- The pain alert in the player and the pause message.
- Each exercise's "Stop if you feel pain" panel.

The app never diagnoses, never suggests training through pain, and never prescribes rehabilitation. Please check the wording doesn't imply otherwise.

## Media

No licensed photos or video were supplied. Every exercise shows a labelled placeholder ("Demonstration media placeholder") with the exercise name and a form tip. Real media should be recorded or licensed, and reviewed alongside the text, because a demonstration that contradicts the written cues is worse than none. The media slot is in `src/features/exercises/media.ts`.
