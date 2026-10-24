# Architecture

## Overview

```
Browser (React 19, server components + small client islands)
   │  HTTPS, cookies (Supabase session)
   ▼
Next.js 16 App Router on Vercel
   ├─ src/proxy.ts            refreshes the session cookie, redirects signed-out visitors
   ├─ src/app/**              pages and route handlers
   ├─ src/features/**/actions server actions (form posts, workout saves)
   └─ src/server/**           server-only data loaders
   │  supabase-js with the user's JWT (publishable key only)
   ▼
Supabase
   ├─ Auth                    email + password, PKCE email links
   ├─ Postgres + RLS          every user row is owner-only
   └─ RPC functions           multi-table writes in one transaction
```

The app never uses the Supabase service role key. Every query runs as the signed-in user, so row level security is the boundary, not application code.

## Layers

### Domain (`src/domain`)

Pure TypeScript with no framework or database imports. It holds:

- `content/`: the exercise library (68 exercises in 13 movement families), skills, milestones and achievements. This is the single source of truth. `npm run db:reference` generates the reference-data migration from it, and a unit test fails if the two drift apart.
- `engine/assessment.ts`: turns onboarding answers into a starting variation and target per family.
- `engine/programme.ts`: builds the 12-week schedule and each session's plan (warm-up, main block, cool-down) from preferences, equipment and current progression state.
- `engine/progression.ts`: evaluates one exercise's result and returns the new state plus a decision with a plain-language reason. Pain rules come first and can't be bypassed.
- `engine/milestones.ts` and `engine/calendar.ts`: milestone checks and time-zone-aware dates.

Because it's pure, the engine is tested directly (unit tests in `src/domain/engine/*.test.ts`) and produces the same plan for the same inputs every time.

### Features (`src/features`)

UI and server actions grouped by feature: `auth`, `onboarding`, `workout`, `exercises`, `training` (pathways, progress, formatting), `profile`. Server actions validate input with zod (`src/lib/validation`) before touching the database.

### Server (`src/server`)

`server-only` modules that load data for pages: the signed-in account and active programme (`auth.ts`, `programme.ts`), workout history and reports (`history.ts`) and progress (`progress.ts`). `origin.ts` works out the site address for email links.

### App (`src/app`)

Route groups:

- `(auth)`: sign-in, sign-up, forgot and reset password.
- `onboarding/*`: one route per step; answers are saved after each step so the flow resumes.
- `(app)`: the signed-in shell (header, bottom nav on phones, side rail on desktop) with Today, Workouts, Exercises, Skills, Progress, History and Profile.
- `workout/[sessionId]`: the full-screen player and its summary, outside the shell.
- `auth/callback` and `auth/confirm`: email link handlers (PKCE code, or token hash).

## Key flows

### Onboarding to programme

Each step posts to a server action that merges the answer into `onboarding_responses.answers`. The final step calls the `create_programme` RPC with preferences, the schedule from `engine/programme.ts` and starting states from `engine/assessment.ts`. The RPC writes preferences, the programme, every scheduled workout and progression state in one transaction, archiving any earlier programme.

### Workout

1. Starting a scheduled workout creates a `workout_sessions` row with the plan frozen into `plan` (JSON), so later engine changes can't alter a workout in progress. A partial unique index allows only one in-progress session per user.
2. The player (`features/workout/player.tsx`) is a client component driven by a pure reducer (`player-state.ts`). Each logged set is saved by a server action immediately (upsert on session, item and set number, so editing a set updates it). Rest and pause timers are stored in `localStorage` under `form:player:<sessionId>`, keyed by timestamps rather than counters, so a refresh restores them.
3. After the last set of an exercise, the feedback form saves difficulty, control and any skip reason.
4. Finishing runs the progression engine on the server for every exercise (from the logged sets and feedback), then calls `complete_workout` to store the results in one transaction: `user_exercise_progress`, `progression_events`, milestones, achievements, and the session and its scheduled slot marked complete. If any part fails, nothing is written.

### Changing training settings

`reschedule_programme` updates preferences, deletes planned (not completed) sessions from today onwards and inserts the new schedule. Completed history is never rewritten.

### Account deletion

`delete_my_account` deletes the caller's `auth.users` row. Every user table references it with `on delete cascade`, so all their data goes in the same statement. The user is signed out and returned to the landing page.

## Security

- Row level security on every table. User tables allow select, insert, update and delete only where `user_id = auth.uid()`. Reference tables are read-only.
- Grants are explicit. `anon` and `authenticated` start with nothing, then get only what they need (for example, profiles can update `display_name` only).
- RPC functions run as the calling user (`security invoker`), so RLS still applies to every statement inside them. The only exception is `delete_my_account`, which must be `security definer` to delete from `auth.users` and only ever deletes the caller's own row. All have `search_path` pinned and are not executable by `anon`.
- Redirect targets after sign-in pass through `safeNextPath`, which only allows same-site paths.
- Database tests in `tests/db` try cross-user reads, writes, moves and function calls and expect them to fail.

## Local development without a cloud project

`scripts/local-supabase` runs Postgres 16, PostgREST and a small Node mock of the Supabase Auth API on port 54321, with a dev mailbox at `/__dev/mailbox`. It exists so the full app, database tests and Playwright tests run in CI or a sandbox with no Supabase account. It is a test double: the hosted Supabase Auth is the real thing, and the differences are listed in `KNOWN_LIMITATIONS.md`.

## Extending it

- New exercises or pathways: add them to `src/domain/content`, run `npm run db:reference`, and add a new migration with the regenerated reference data.
- New equipment: extend `EQUIPMENT` in the domain types and the onboarding options; the engine filters on equipment already.
- Paid features or social features would need new tables with the same owner-only RLS pattern. Nothing in the current schema assumes either.
