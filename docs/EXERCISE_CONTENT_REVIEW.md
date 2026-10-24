# Exercise content review

## Status

All 79 exercises have validation status `internal_review`. That means the guidance was written from the sources in `docs/research/SOURCES.md` and checked for internal consistency (ladder order, equipment, dosage ranges, easier and harder links), but **no qualified professional has reviewed it yet**. The app says so on every exercise page.

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
| L-sit | Foot-supported L-sit, Tuck L-sit, One-leg L-sit, L-sit |
| Crow pose | Crow lean, One-foot crow lift, Crow pose |
| Pistol squat | Assisted pistol squat, Box pistol squat, Low box pistol squat, Pistol squat |
| Warm-up and cool-down | March in place, Arm circles, Wrist preparation, Cat-cow, Hip hinge drill, Lunge with reach, Wall scapular push-up, Child's pose, Kneeling hip flexor stretch, Lying hamstring stretch, Chest opener |

Each exercise has: plain-language summary, setup, numbered steps, what good control looks like, breathing, cues, common mistakes, when to stop, easier and harder options, primary and secondary muscles, equipment and surfaces, and a typical dose (sets and a rep or time range).

## Items flagged for the reviewer

These were flagged while writing and need a professional's view first:

- **Negative pull-up.** The claim that negatives beat band assistance rests on vendor summaries we couldn't trace to studies (S17). The app offers both and doesn't rank them.
- **Negative dip (partial range).** The depth limit is a conservative coaching convention, not evidence-based.
- **Partial wall walk** and **chest-to-wall handstand hold.** Inversions. Check the screening and stop guidance, particularly for people with blood pressure concerns, glaucoma or recent head injury.
- **Push-up ladder order.** Kneeling sits between mid and low incline based on force-plate estimates (S6). Some coaches place it lower.
- **Rest intervals** (60–120 s for beginners) rely on secondary summaries of S9.
- **L-sit, crow pose and pistol squat ladders** (S18–S20). Written from coaching guides, not research, and their order differs a little between coaches. Check the gates in particular: L-sit unlocks after 3 × 8 dead bugs and 3 × 10 knee-height incline push-ups; crow after 3 × 8 low incline push-ups and a 30-second plank; pistol after 3 × 12 bodyweight squats and 3 × 8 split squats. All three also need no related pain in the last 30 days.
- **Crow pose** loads extended wrists more than a push-up does. The guidance relies on a wrist warm-up, a cushion in front and stopping if wrists hurt.
- **Pistol squat** puts all the load through one knee at deep flexion. The low box step tells people to go back to the higher box if the knee feels pinched.
- **Long-term roadmaps** (freestanding handstand, muscle-up, front lever; S21–S23). Only the first phase of each is programmed, through existing pathways. Later phases are descriptions of what's involved, with pass marks quoted as ranges from coaching guides and no timelines. They need the same review as the exercise text before launch.

## Progression rules to review

The rules live in `src/domain/engine/progression.ts`, with tests in `progression.test.ts`:

- **Move up a variation** after the top of the range on every set, with good control, rated *about right* or *too easy*, in two workouts in a row. One *too easy* workout at the top of the range is enough.
- **Raise the target** within the range when every set reached the current target with good control.
- **Hold** when performance is in range but not at the top, or control wasn't confirmed.
- **Step back** (lower target, then an easier variation) after *couldn't finish*, *too difficult* twice running, or most sets below the range.
- **Choosing an easier variation mid-workout** makes it the starting point next time.
- **Pain** swaps to the next easier variation next time. A second pain report in the same family within 14 days pauses that family, with advice to see a GP or physiotherapist. Pain within 30 days also blocks gated skill pathways from unlocking.
- **Gated pathways** (handstand prep, dips prep, L-sit, crow pose, pistol squat) stay locked until named milestones are reached in prerequisite families.
- **Skill practice** takes one slot at the start of the main block: in every 40-minute session, and in 25-minute sessions when someone has chosen a specific skill (replacing the fifth exercise). Fifteen-minute sessions have none. A locked skill gives its slot to the pathway that builds towards it (for example the hollow body for the L-sit).

## Safety wording to review

- The health notes on the landing page and sign-up form (who the app is for, and when to check with a professional first). Consider adding a short pre-exercise screen modelled on the ESSA APSS structure (S16).
- The pain alert in the player and the pause message.
- Each exercise's "Stop if you feel pain" panel.

The app never diagnoses, never suggests training through pain, and never prescribes rehabilitation. Please check the wording doesn't imply otherwise.

## Media

No licensed photos or video were supplied. Every exercise shows a labelled placeholder ("Demonstration media placeholder") with the exercise name and a form tip. Real media should be recorded or licensed, and reviewed alongside the text, because a demonstration that contradicts the written cues is worse than none. The media slot is in `src/features/exercises/media.ts`.
