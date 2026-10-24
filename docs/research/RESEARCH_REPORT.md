# Research report

Prepared 24 October 2026. Supporting documents:

- [EXERCISE_SCIENCE.md](EXERCISE_SCIENCE.md): evidence and programming rules
- [COMPETITOR_MATRIX.md](COMPETITOR_MATRIX.md): ten products plus a community programme
- [BEGINNER_USER_NEEDS.md](BEGINNER_USER_NEEDS.md): needs and UX patterns
- [PRODUCT_OPPORTUNITIES.md](PRODUCT_OPPORTUNITIES.md): positioning, opportunities, brand names
- [SOURCES.md](SOURCES.md): every source, with date, grade and how deeply it was verified

## Method and its limits

Research used web search across journal indexes, government sites, regulator guidance, app-store listings and review sites. The environment could not open most full-text documents, so studies were checked at abstract or official-summary level. Competitor information comes from listings and reviews, not hands-on use. No user interviews were run. These limits are why several decisions are marked as conventions or assumptions, and why the content review requires a qualified professional before launch.

## Highest-value findings

1. **Bodyweight training works when it's hard enough, and body angle is the dial.** Load-matched push-ups produce strength and size gains similar to bench press (S4, S5). Force-plate data give a clear order of push-up difficulty (S6). This justifies a variation-ladder model.
2. **Few prescription details matter much for the average beginner.** The 2026 ACSM position stand found that failure training, equipment type, periodisation and set structure didn't consistently change outcomes, and that individualising to support participation matters more (S1). This lets the product focus on adherence and clarity instead of complexity.
3. **Two or more days a week, 2–3 sets, full range of motion.** ACSM (S1) and Australian guidelines (S2, S3) agree on at least two strength days a week. Frequency doesn't matter much when volume is equal (S8), so 2, 3 or 4 days can all be effective.
4. **Beginners are poor at judging their own effort.** RIR predictions tend to be too low, especially early on (S11). Progression must rest on logged reps plus feedback, never on "completed".
5. **Motivation comes from competence and choice, not pressure.** Autonomous motivation and competence satisfaction predict participation (S14); habits take weeks to months and survive the odd missed day (S13).
6. **Pulling without equipment is a genuine gap.** The community standard says rows need a bar and that this can't be substituted (S12). Honesty here is a differentiator.
7. **Health-adjacent data is sensitive information in Australia.** The OAIC has found that data allowing inferences about health is sensitive, and that tracking pixels on health pages breached the APPs (P2). Minimal collection and no third-party trackers is the safe default.
8. **Competitors are video- and skill-led; none confirmed an explainable, pain-aware beginner engine or a web app.** That's our space.

## Product decision log

| # | Decision | Based on | Alternatives rejected |
|---|---|---|---|
| D1 | Advancement is ability-based: double progression within a variation, then a variation change after two consecutive top-of-range sessions with good control | S1, S6, S12, S11 | Weekly forced progression; feedback-only progression |
| D2 | Full-body A/B sessions for 2–3 days; upper/lower for 4 days; no consecutive full-body days | S1, S2, S8 | Daily training; body-part splits |
| D3 | 2–3 sets per exercise; week 1 at 2 sets; lighter weeks 4 and 8 | S1, S7; lighter weeks are convention | Higher-volume programmes |
| D4 | Rest 60–90 s defaults, adjustable | S9 (to confirm) | Fixed 3-minute rests (too long for short sessions) |
| D5 | Rep ranges ~5–12; move to harder variation above ~12–15 good reps | S1 | Letting reps climb indefinitely |
| D6 | Pain feedback stops the exercise, regresses next time, pauses the family after two reports in 14 days | Safety; brief | Prescribing through discomfort |
| D7 | Readiness check in our own words; store only a flagged/acknowledged result | S16, P1, P2 | Collecting medical history |
| D8 | No full push-up, dip or pull-up required in assessment; every test skippable with conservative defaults | Brief; S6 | Max-rep testing |
| D9 | No dips in the 12-week plan; handstand prep locked behind prerequisites | Convention (joint loading) | Including all classic calisthenics moves |
| D10 | No improvised anchors. Honest no-equipment pulling notice. | S12; brief | Door-frame rows, table rows, towel anchors |
| D11 | Weekly consistency instead of streaks; rest days are part of the plan; reduced volume after 14+ days off | S13, S14 | Daily streaks |
| D12 | ~50 exercises in clearly ordered families | N7 | Large libraries |
| D13 | Deterministic, rule-based engine in TypeScript, unit-tested; no AI for safety decisions | Brief | ML or LLM-driven progression |
| D14 | Visual direction B, "Calm Performance" (warm neutrals, forest green) | N10: intimidation is a core barrier | A (hardcore feel), C (technical/cold) |
| D15 | Installable PWA on Next.js + Supabase, hosted in Sydney region | Brief; data locality | Native apps for MVP |
| D16 | No third-party analytics or ad trackers in MVP | P2 | Standard marketing pixels |
| D17 | Schematic movement diagrams, clearly labelled, plus an asset-production register | Brief (no stock or copied media) | Stock imagery; competitor video |
| D18 | No payments in MVP | Brief; need retention data first | Launch with a subscription |

## Assumptions

- Users are healthy adults aged 18+. The app asks for age confirmation (18+) and does not target young people or older adults with specific needs.
- Most users train at home with no equipment or a mat, which is why no-equipment paths are the default.
- Users will give honest feedback if it takes one tap.
- A 12-week programme is long enough to show visible progress and short enough to commit to.
