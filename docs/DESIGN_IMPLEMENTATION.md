# Design implementation

## Sources

- **Figma** file `JnTWkumbtverLpdNB8NUbF`, direction "Athletic Precision". This is the source of truth for the six screens it covers.
- **Stitch export** (uploaded 24 October 2026). Its screens 1–6 are older versions of the Figma screens, so Figma wins there. Its screens 7–13 (welcome, account creation, goals, experience and baseline, schedule, equipment, plan reveal) were used for landing, auth and onboarding, with unsupported claims removed (listed below).

The Figma handoff page describes the file as "foundation only, not implementation-ready", and its interaction-state and responsive pages are empty. Where the designs were silent, the existing design language was extended rather than replaced.

## Tokens

Defined once in `src/app/globals.css` under Tailwind v4 `@theme`, taken from the Figma variables:

- Colour: background `#0d0e11`, surfaces `#1b1b1f` / `#1f1f23` / `#292a2d`, accent `#ccf13c` with on-accent `#171e00`, text `#e3e2e6` / `#c5c9af`, success container `#3d4c23`, error tint and strong accent variants.
- Type: Space Grotesk for display and numbers, Plus Jakarta Sans for body. Named sizes `display`, `title`, `section`, `card`, `body-lg`, `body`, `caption`, `label`, `button`, `metric`.
- Radius: `small`, `card`, `large`. Breakpoints: `tablet` (768) and `desktop` (1024).

`cn()` (`src/lib/cn.ts`) uses tailwind-merge configured with these custom scales so a later class reliably overrides an earlier one.

## Screen mapping

| Design | Route | Notes |
| --- | --- | --- |
| Figma 1, Personal Dashboard | `/today` | Week pill, greeting, weekly rhythm, today's session card, featured pathway, all from real data |
| Figma 2, Guided Workout Player | `/workout/[sessionId]` | Sticky header with end and pause, progress bar, media frame with form tip, set chips, rep stepper or hold timer |
| Figma 3, Skills | `/skills` | Pathway cards with status, stage and readiness. The long-term goals section below them is a filled gap |
| Figma 4, Skill Progression | `/skills/[pathwayId]` | Current focus, prerequisites, progression tree, milestones, practice log |
| Figma 5, Exercise Detail | `/exercises/[exerciseId]` | Three stats, steps, cues, safety panel, form check, adaptations |
| Figma 6, Progress | `/progress` | Range tabs, metrics, consistency grid, improvements, milestones |
| Stitch 7 | `/` | Landing |
| Stitch 8 | `/sign-up`, `/sign-in` | Email and password only |
| Stitch 9–13 | `/onboarding/*` | Goals, experience and starting point, schedule, equipment, plan |
| Filled gaps | `/skills/roadmap/[roadmapId]` (long-term skill roadmaps), the "Or aim for a specific move" group on the goals step and in training settings, `/workouts`, `/history/[id]`, `/exercises`, `/profile`, `/profile/training`, rest timer, feedback form, summary, paused overlay, dialogs, error and empty states | Built from the same tokens and components |

## Deliberate deviations

Each of these was either decided with Eileen or needed for honesty, safety or accessibility.

1. **Push-up pathway order** follows the exercise library (wall, counter incline, knee-height incline with kneeling as an alternative, low incline, floor), not the order in Figma. Decided by Eileen.
2. **"7 of 10 sessions" bars** on the skill screens are shown as a practice log only. The move-up rule is the engine's (top of the range on every set in 2 workouts with good control), so the bars don't imply a different rule.
3. **The "45° Optimal Alignment" photo overlay** on the exercise screen isn't used. It implies measurement the app doesn't do.
4. **No notification bell** in the header, because there are no notifications in the MVP.
5. **Icons** are Lucide matches. The Figma asset URLs were blocked from the build environment.
6. **Exercise photos** are labelled placeholders ("Demonstration media placeholder"). No licensed media was supplied.
7. **Text on the success container** uses `#d8e9b3` instead of Figma's `#131f00`. The Figma pair is 1.8:1 contrast; the new one is about 7:1 and passes WCAG AA.
8. **Upcoming pathway stages on Today** use secondary text colour instead of 50% opacity, which failed contrast.
9. **Bottom navigation on phones** follows the Figma "Bottom nav" component. On desktop the same destinations are in a side rail, since Figma had no desktop layouts.
10. **Player header** is sticky rather than fixed so it can't overlap content on short screens.
11. **Skill goals and roadmaps** had no Figma or Stitch design. They reuse the goal choice cards, pathway cards, pills and stage list styles. Roadmap phases that FORM doesn't train yet are marked "Not in FORM yet" so they can't be mistaken for programmed work.

## Stitch content removed

These appeared in the Stitch concepts and were removed because they're unsupported or unbuilt:

- Apple, Google and passkey sign-in buttons.
- "98.4% match" plan score and "2.4× faster" progress claims.
- Coach and biomechanics claims (AI form feedback, joint-angle analysis).
- Any testimonial or user-count figures.

## Accessibility

- Every interactive element has a visible focus style and a 44 px minimum target.
- Skip link to the main content in the app shell.
- Timers use `role="timer"` with a text alternative; the progress bar has a label and values.
- Dialogs use the native `<dialog>` element, so Escape and focus trapping work.
- Decorative icons are `aria-hidden`; meaning is never carried by colour alone.
- Axe WCAG 2.2 AA audits pass on 17 pages at 390, 768 and 1440 px (see `TEST_REPORT.md`).
