# Product opportunities

## Positioning

Most calisthenics apps sell the destination (muscle-ups, planche, athlete physiques). The under-served person is the one who can't yet do a push-up and finds that content intimidating. The opportunity is to be the most trustworthy **first 12 weeks** of bodyweight training: honest about evidence, explicit about why the plan changes, and safe by design.

**Positioning statement.** For adults who are new to bodyweight training, Beginner Calisthenics is a coach-in-your-pocket that starts exactly where you are and shows you why each step comes next. Unlike skill-first apps, it never assumes you can already do the basics, and it never pushes you through pain.

## Opportunities ranked

| Rank | Opportunity | Evidence of need | Effort | MVP? |
|---|---|---|---|---|
| 1 | Explainable, ability-based progression engine | Gap analysis: no competitor confirmed to explain changes; S11 says beginner effort ratings alone are unreliable | Medium | ✅ |
| 2 | Start below the basics (wall push-up, assisted squat, supported hang) | Target audience definition; S6 load ordering | Low | ✅ |
| 3 | Guided workout player that is phone-first and refresh-proof | N12 | Medium | ✅ |
| 4 | Equipment honesty and safe alternatives | N3, S12 | Low | ✅ |
| 5 | Pain-aware adaptation and professional referral messaging | N11, safety | Low | ✅ |
| 6 | Skill paths linked to real training data | Calistack/Ascend show demand for skill trees | Medium | ✅ |
| 7 | Non-punitive consistency tracking | S13, S14 | Low | ✅ |
| 8 | Installable web app with no app-store dependency | No competitor confirmed on web | Low | ✅ |
| 9 | Original, accurate demonstration media | Competitors invest heavily in video | High | Placeholder + register in MVP; production in V2 |
| 10 | Coach review and co-branded programmes | Credibility | Medium | V2 |
| 11 | Premium tier | Market norm is ~A$5–15/month | Medium | V2, after retention data |

## Monetisation recommendation (not built in MVP)

Launch free to learn about retention and progression accuracy. Once week-4 retention and progression accuracy are measured, test a premium tier around additional programmes (intermediate track, "first pull-up" specialisation, handstand foundations) rather than locking the beginner programme. Keeping the core beginner experience free matches the product promise and avoids competing with Nike Training Club's large free library on content volume.

## Risks

| Risk | Mitigation |
|---|---|
| Programming errors cause injury | Conservative defaults; pain handling; qualified-professional review before launch (flagged in content review) |
| Demonstration media quality is below competitors | Schematic diagrams are clearly labelled; asset register for proper production |
| Users without pulling equipment get an unbalanced plan | Explicit notice and recommendation; balance tests in CI |
| Privacy of health-adjacent data | Data minimisation, RLS, no third-party trackers, export and delete |
| Brand conflict | Names are search-checked only; trademark search required before rebrand |

## Success metrics for the first release

- Onboarding completion rate (target: 80% of sign-ups)
- First workout completed within 48 hours of sign-up
- Week-4 retention (users who completed at least one session in week 4)
- Share of progressions later reversed within two sessions (a proxy for progression accuracy; target under 15%)
- Pain reports per 100 sessions, by exercise family (safety monitoring)

These would need privacy-respecting first-party analytics, which are not part of the MVP.

## Brand names

Search checks are in [SOURCES.md](SOURCES.md). These are not trademark clearances.

1. **Toehold**: the first small grip you get on a climb. It says "you only need a start" and suits beginners well. No fitness app with this name surfaced.
2. **Rung**: progression as a ladder, one rung at a time, which maps directly onto the engine. Short and memorable. As a common English word it will be harder to trademark and its domains are likely taken.
3. **Kinward**: an invented word (kinetic + forward/inward). No company or app surfaced, so likely the easiest to protect, but it carries no meaning until the brand gives it one.

**Recommendation:** Toehold, subject to a proper IP Australia and USPTO trademark search and domain availability check. The app ships under the working name **Beginner Calisthenics**, and the name lives in one config constant (`src/config/brand.ts`) so a rename is a one-line change plus assets.
