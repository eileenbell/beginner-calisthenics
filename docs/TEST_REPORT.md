# Test report

Run on 24 October 2026 in the build environment (Linux, Node 22, Chromium from Playwright 1.63). Every number below comes from an actual run. Nothing was skipped or retried.

## Summary

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | No errors or warnings |
| Types | `npm run typecheck` | No errors |
| Unit tests | `npm test` | 379 passed, 0 failed (11 files) |
| Database tests | `npm run test:db` | 38 passed, 0 failed (2 files) |
| Production build | `npm run build` | Succeeds; 29 routes |
| End-to-end, dev server | `npm run test:e2e` | 16 passed, 0 failed |
| End-to-end, production build | `E2E_PROD=1 npm run test:e2e` | 16 passed, 0 failed (1.3 min) |

## What the tests cover

### Unit (`src/**/*.test.ts`, `tests/unit`)

- **Content integrity** (`content.test.ts`): unique ids, every exercise cites a source, none claims professional review, no improvised anchors (doors, towels), alternatives sit at the same level, fallback families end in a no-equipment option, the push-up path starts at the wall, no dips before dip preparation, handstand work is gated.
- **Assessment** (`assessment.test.ts`): onboarding answers map to the right starting variation and a sub-maximal target, including skipped assessments, low confidence and no pull-up bar; milestones are never awarded for sets logged with pain or poor control.
- **Programme** (`programme.test.ts`): 12 weeks with no back-to-back full-body days, every major pattern each week, only available equipment, warm-up then main block then cool-down, exercise counts that fit 15, 25 and 40 minutes, wrist preparation whenever hands bear weight, paused and locked families left out with an explanation, and an upper/lower split at four days.
- **Progression** (`progression.test.ts`): moving up needs top-of-range sets, good control and the right rating twice (once if too easy); pain always swaps or pauses; skips and easier swaps behave; completion alone never progresses.
- **Calendar** (`calendar.test.ts`): date maths, suggested training days, rest-day rules for each frequency, programme weeks, and rescheduling that keeps completed sessions.
- **Player state** (`player-state.test.ts`): the workout reducer, including resuming after a refresh, rest between sets, freezing and restoring the rest timer, feedback after the last set, skips and corrections.
- **Onboarding, pathways, library and progress** (`tests/unit`): answer validation, pathway gating and pain re-locking, search and filters, swaps never harder than planned, progress counting only logged sets, redirect safety (`safeNextPath` rejects `//evil`, `https://…` and header injection).
- **Reference data** (`reference-data.test.ts`): the SQL migration matches the TypeScript content exactly.
- **Class merging** (`cn.test.ts`).

### Database (`tests/db`)

Run against Postgres 16 with Supabase's `anon` and `authenticated` roles, JWT claims and RLS policies:

- Users can read and change only their own rows; cross-user inserts, updates, deletes and "moving" a row to another account all fail.
- Only `display_name` on profiles is writable; reference data is read-only; `auth.users` and internal functions are out of reach.
- Anonymous callers can read reference data and nothing else, and can't call any function.
- `create_programme`, `reschedule_programme`, `complete_workout` and `resume_family` store everything atomically, and `complete_workout` rolls back completely on failure.
- Only one workout can be in progress; re-logging a set updates it; impossible values are rejected.
- `export_my_data` returns only the caller's rows; `delete_my_account` removes every row.

### End-to-end (`tests/e2e`, phone viewport 390 × 844 unless stated)

| Spec | Test |
| --- | --- |
| journey | Someone who can only push against a wall starts on wall push-ups |
| journey | A workout saves every set, survives a refresh and ends with an honest summary; progress shows 1 workout; history lists it |
| journey | The rest timer counts down, freezes while paused and can be skipped (uses a controlled clock) |
| journey | An easier variation can be swapped in mid-workout and is labelled as a swap |
| journey | Reporting pain leads to "Easier option" with discomfort guidance |
| journey | Too easy at the top of the range shows "Moving up" to a harder variation |
| auth | Signed-out visitors are sent to sign in and returned to the page they asked for |
| auth | A wrong password gets a plain explanation |
| auth | An account that needs email confirmation can't sign in until it follows the emailed link |
| auth | A forgotten password can be reset from the emailed link, and the new password works |
| isolation | Another user gets 404 for someone else's history, workout and summary pages |
| keyboard | The app shell starts with a visible skip link |
| keyboard | A set can be logged, rest skipped, and a dialog opened and closed with the keyboard alone |
| a11y | Axe WCAG 2.2 AA audit plus a no-sideways-scroll check on 15 pages (5 public, 9 app pages and the workout player) at 390, 768 and 1440 px |

The first a11y run found three real problems, which were fixed before the results above: text on the success container colour at 1.8:1 contrast, upcoming pathway stages dimmed below 4.5:1 on Today, and the equipment toggle's accessible name not including its visible label.

## What these tests don't prove

- **Hosted Supabase Auth.** End-to-end tests run against the local stand-in in `scripts/local-supabase`, which mimics Supabase Auth's API (sign-up, sign-in, refresh, recovery, PKCE and token-hash links). The live deployment was checked by hand; see `DEPLOYMENT_GUIDE.md`, step 6.
- **Other browsers.** Only Chromium is automated. Check iOS Safari by hand.
- **Screen readers.** Axe and keyboard tests are not a substitute for a VoiceOver or TalkBack pass.
- **Load.** No performance or load testing was done.

## Running them yourself

```bash
npm install
npm run lint && npm run typecheck && npm test
npm run db:local:setup && npm run test:db     # needs local Postgres 16
npm run test:e2e                              # starts the local stack and next dev
E2E_PROD=1 npm run test:e2e                   # same, against a production build
```

Local Postgres and PostgREST are expected at the paths in `scripts/local-supabase/server.ts`.
