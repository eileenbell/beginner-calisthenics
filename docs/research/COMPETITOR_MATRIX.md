# Competitor matrix

All entries come from app-store listings, review sites and price trackers accessed on 24 October 2026 (sources C1–C11 in [SOURCES.md](SOURCES.md)). None of the apps were installed or used hands-on. Each cell is marked:

- ✅ **Confirmed** in a listing or official description
- 🟡 **Reported** by a third-party review or price tracker
- ❔ **Unknown / assumed** (not found; stated as an assumption)

Prices are as listed and vary by country.

## Feature comparison

| Product | Target user | Onboarding & personalisation | Demonstrations | Progression system | Skill tracking | Gamification | Pricing | Notable frustrations reported |
|---|---|---|---|---|---|---|---|---|
| **Calistree** (C1) | Bodyweight / calisthenics, all levels | ✅ Workouts built around goals, equipment and skill level | ✅ "1500+ exercises with videos" (listing) | ✅ Programmes "slowly adjusted over time based on your progress" | ❔ Not confirmed | ❔ | ✅ Free download; paid tier details not found | ❔ None found |
| **Thenx** (C2) | Beginners to advanced; Chris Heria brand | ✅ Daily workouts "based on your fitness level and goals" | ✅ Video tutorials led by a known athlete | 🟡 Beginner→advanced programmes (fixed tracks) | ✅ Skill tutorials (muscle-up, handstand, planche) | ❔ | 🟡 Around US$9.99/mo or US$89.99/yr (US); much cheaper elsewhere | 🟡 Login problems and slow support in some reviews |
| **Freeletics** (C3) | General fitness, HIIT-style bodyweight | 🟡 "AI Coach" personalisation | ✅ Video | 🟡 Coach adjusts sessions | ❔ | 🟡 | 🟡 €39.99 / 12 weeks; €79.99 / 12 months | 🟡 Beginners describe it as tough at the start |
| **Madbarz** (C4) | Bodyweight workouts | 🟡 Plans by goal and level, with or without equipment | 🟡 Video tutorials | 🟡 Fixed 2–12 week plans | ❔ | 🟡 Weekly challenges | ✅ US$12.49/mo, US$88.99/yr (App Store US) | ✅ Charges non-refundable; auto-renew |
| **Nike Training Club** (C5) | General fitness, mass market | 🟡 Programmes by goal | ✅ High-production video | 🟡 Fixed multi-week programmes | ❔ | ❔ | 🟡 Large free library; paid programmes reported in some regions (conflicting sources) | 🟡 Not calisthenics-specific; little progression logic |
| **Fitbod** (C6) | Gym-goers | ✅ Equipment profiles | ✅ Video | 🟡 Automated progressive overload from logged history | ❔ | ❔ | 🟡 ~US$15.99/mo or US$95.99/yr (2026); 7-day trial | 🟡 Weak for bodyweight skill progressions (assumption based on gym focus) |
| **Calisteniapp** (C7) | Calisthenics, beginner to skills | ✅ Recommends a programme by level and goal | ✅ Guided tutorials | ✅ "EVO" routines adjust daily load from performance | ✅ Skill progressions (handstand, muscle-up, planche) | ❔ | 🟡 ~US$3.49–4.49/mo, ~US$19–27/yr | ❔ |
| **Caliverse** (C8) | Bodyweight, community-oriented | 🟡 40+ plans | ✅ Video tutorials | 🟡 Plans by level | ❔ | 🟡 Live group sessions | 🟡 £4.49/mo or £43.99/yr; free tier with 100+ workouts | ❔ |
| **Calistack** (C9) | Skill-focused | ❔ | ❔ | ✅ Skill tree, nodes from locked to mastered | ✅ Core feature | ✅ Tree unlocks | ❔ | ❔ |
| **Ascend** apps (C10) | Skill learners | ❔ | ❔ | ✅ "Skill trees" for pull-ups, push-ups, handstands, levers | ✅ | ✅ | ❔ | ❔ |
| **r/bodyweightfitness Recommended Routine** (C11) | Self-directed beginners | ❌ None (wiki) | 🟡 Linked videos per exercise | ✅ Clear ladders and a 3×5→3×8 rule | ❌ Manual | ❌ | Free | Hard to follow on a phone; the wiki says rows need a bar and "this genuinely cannot be substituted" |

## Accessibility and monetisation

Accessibility statements (screen-reader support, captions, colour contrast) were not found for any of these products. That is an **unknown**, not evidence of poor accessibility.

Monetisation is almost universally an auto-renewing subscription with a free trial, with free tiers of varying size (largest: Nike Training Club, Caliverse).

## Feature-gap analysis

| Gap | Who does it partly | What we do |
|---|---|---|
| **Starting below a full push-up or pull-up, explicitly** | Recommended Routine (manual), Calisteniapp (assumed) | Assessment never requires a full push-up, dip or pull-up. Wall and incline push-ups, assisted squats, feet-supported hangs are first-class starting points. |
| **Explaining *why* the plan changed** | Nobody confirmed | Every progression, hold or regression shows a plain-language reason ("You hit 3 × 10 with good control twice, so you're moving to a lower incline"). |
| **Honest equipment limitations** | Recommended Routine says rows need a bar | The plan states when pulling is limited by equipment and offers the safest available option, with no improvised anchors. |
| **Pain-aware adaptation** | Nobody confirmed | Pain feedback stops the exercise, swaps to an easier option and pauses the family after repeated reports, with advice to seek professional help. |
| **Skill tree tied to the actual training plan** | Calistack, Ascend (trees), Calisteniapp | Skill milestones are earned automatically from logged sets in the plan, not from a separate "skills" mode. |
| **Non-punitive motivation** | Unknown | Weekly consistency, not daily streaks. Rest days are part of the plan. |
| **Mobile web / no install required** | None (all native apps) | Installable PWA that works in any modern browser. |
| **Privacy posture** | Unknown | No third-party trackers or ad pixels. Data export and account deletion built in. |

## What we deliberately do not copy

- Large exercise libraries (700–1500+). Beginners are overwhelmed by them. We start with about 50 carefully structured movements.
- Athlete-led advanced skill marketing (planche, muscle-up). These are out of scope for a 12-week beginner programme.
- AI-generated workouts for safety-relevant decisions. Our engine is rule-based and testable.
- Any competitor's video content. We use our own schematic demonstrations and an asset register (see `docs/ASSET_REGISTER.md`).
