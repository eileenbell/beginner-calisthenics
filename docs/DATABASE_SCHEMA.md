# Database schema

Postgres on Supabase. Three migrations in `supabase/migrations`, applied in order:

1. `20261024000100_initial_schema.sql`: tables, indexes, grants, row level security and the new-user trigger.
2. `20261024000200_training_functions.sql`: RPC functions.
3. `20261024000300_reference_data.sql`: exercises, progressions, skills, milestones and achievements, generated from `src/domain/content` by `npm run db:reference`.

`supabase/local/bootstrap.sql` only exists for the local stand-in (it creates the `auth` schema and roles that hosted Supabase already has). Never run it against a hosted project.

## Reference data (read-only, public)

| Table | Purpose |
| --- | --- |
| `exercises` | 68 exercises: family, level, measure (reps or seconds), per-side flag, muscles, equipment (`equipment_any_of`, `equipment_all_of`), full guidance in `content` (JSON) and `validation_status` |
| `exercise_progressions` | Easier, harder and alternative links between exercises |
| `skills` | Skill pathways, their families, equipment and readiness gate |
| `skill_milestones` | Milestones per skill: exercise, sets, minimum reps or seconds |
| `achievements` | Achievement definitions |

## User data (owner-only)

Every table below has `user_id` referencing `auth.users(id) on delete cascade`.

| Table | Purpose |
| --- | --- |
| `profiles` | Display name. Created by the `handle_new_user` trigger on sign-up |
| `onboarding_responses` | Current step and answers (JSON), so onboarding resumes. `completed_at` when done |
| `training_preferences` | Goals, experience, days per week, chosen days, session minutes, equipment, environment, time zone |
| `programmes` | A 12-week block: start date, weeks, status (`active` or `archived`). One active per user |
| `scheduled_workouts` | One row per planned session: week, slot, template, date, status (`planned`, `in_progress`, `completed`, `skipped`) |
| `workout_sessions` | A started workout with its frozen plan and any swaps. One `in_progress` per user (partial unique index) |
| `set_logs` | One row per set: session, item, exercise, set number, reps or seconds. Unique per session, item and set, so editing a set updates it |
| `exercise_feedback` | Per exercise in a session: difficulty, good control, skip reason, and the engine's decision |
| `user_exercise_progress` | Current state per movement family: exercise, target, success and difficulty streaks, pain report dates, paused flag |
| `progression_events` | History of every change (progress, target up or down, regress, pain swap, pause, resume) with its reason |
| `user_milestones` | Milestones reached and the session that reached them |
| `user_achievements` | Achievements earned |
| `saved_exercises` | Bookmarked exercises |

## Row level security

- RLS is enabled on every table.
- Reference tables: `select` for `anon` and `authenticated`; no writes.
- `profiles`: read and update your own row only, and only the `display_name` column is updatable.
- All other user tables: select, insert, update and delete only where `user_id = auth.uid()`, with `with check` on insert and update so rows can't be moved to another account.
- Table grants start from nothing (`revoke all`) and add only what each table needs.

## Functions

The training rules run in TypeScript before these are called; the functions only store results atomically. All run as the calling user (`security invoker`, so RLS applies inside them) except `delete_my_account`, which is `security definer` because users can't delete from `auth.users` directly. All pin `search_path` and are not executable by `anon`.

| Function | What it does |
| --- | --- |
| `create_programme(...)` | Saves preferences, archives any active programme, creates the new programme, its scheduled workouts and starting progression state (keeping existing state for families already in progress), and marks onboarding complete. One transaction |
| `reschedule_programme(p_preferences, p_from, p_schedule)` | Updates preferences and the programme, deletes planned sessions on or after `p_from` and inserts the new ones. Completed sessions are untouched |
| `complete_workout(...)` | Stores feedback, progression state, events, milestones and achievements and completes the session and its scheduled slot. All or nothing |
| `resume_family(p_family_id)` | Unpauses a paused movement, resets its streaks and records a `resume` event |
| `export_my_data()` | Returns every row belonging to the caller as JSON (used by Profile, Download my data) |
| `delete_my_account()` | Deletes the caller from `auth.users`; cascades remove all their rows |

## Tests

`tests/db/security.test.ts` and `tests/db/training.test.ts` run against real Postgres with the same roles and JWT claims Supabase uses. They cover cross-user reads and writes, column-level grants, function access for anonymous callers, transaction rollback and cascade deletion. See `TEST_REPORT.md`.
