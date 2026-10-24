-- FORM initial schema.
--
-- Reference data (exercises, progressions, skills, milestones, achievements)
-- is readable by everyone and written only by migrations. Everything else is
-- private training data owned by one user and protected by row level security:
-- a signed-in user can only ever see and change their own rows.
--
-- Supabase provides auth.users, auth.uid() and the anon / authenticated /
-- service_role roles. supabase/local/bootstrap.sql recreates the small subset
-- of those that local tests need.

-- ---------------------------------------------------------------- helpers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- reference data

create table public.exercises (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  family_id text,
  level smallint not null check (level between 1 and 10),
  difficulty smallint not null check (difficulty between 1 and 5),
  pattern text not null,
  category text not null check (category in ('strength', 'skill', 'warmup', 'cooldown')),
  measure text not null check (measure in ('reps', 'seconds')),
  per_side boolean not null default false,
  is_ladder_step boolean not null default true,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment_any_of text[] not null default '{}',
  equipment_all_of text[] not null default '{}',
  -- Instructions, cues, mistakes, safety notes, dosage and sources. The
  -- TypeScript catalogue in src/domain/content is the source of truth; this
  -- copy is generated from it (scripts/generate-reference-data.ts).
  content jsonb not null,
  validation_status text not null default 'internal_review'
    check (validation_status in ('internal_review', 'professional_review'))
);

create table public.exercise_progressions (
  from_exercise_id text not null references public.exercises (id) on delete cascade,
  to_exercise_id text not null references public.exercises (id) on delete cascade,
  relation text not null check (relation in ('harder', 'easier', 'alternative')),
  primary key (from_exercise_id, to_exercise_id, relation),
  check (from_exercise_id <> to_exercise_id)
);

create table public.skills (
  id text primary key,
  name text not null,
  summary text not null,
  families text[] not null,
  equipment_any_of text[] not null default '{}',
  gate jsonb,
  sort_order smallint not null
);

create table public.skill_milestones (
  id text primary key,
  skill_id text not null references public.skills (id) on delete cascade,
  sort_order smallint not null,
  title text not null,
  description text not null,
  exercise_id text not null references public.exercises (id),
  sets smallint not null check (sets between 1 and 10),
  min_reps smallint,
  min_seconds smallint,
  check ((min_reps is null) <> (min_seconds is null))
);

create table public.achievements (
  id text primary key,
  title text not null,
  description text not null
);

-- ---------------------------------------------------------------- user data

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Answers saved step by step so onboarding can be resumed.
create table public.onboarding_responses (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_step text not null default 'goals'
    check (current_step in ('goals', 'experience', 'schedule', 'equipment', 'summary')),
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- The user's current training settings. Editable from Profile.
create table public.training_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goals text[] not null check (cardinality(goals) between 1 and 3),
  experience text not null check (experience in ('complete_beginner', 'some_fitness', 'gym_new_to_calisthenics')),
  days_per_week smallint not null check (days_per_week in (2, 3, 4)),
  -- ISO weekdays, 1 = Monday ... 7 = Sunday.
  training_days smallint[] not null,
  session_minutes smallint not null check (session_minutes in (15, 25, 40)),
  equipment text[] not null default '{}',
  environment text not null check (environment in ('home', 'gym', 'park', 'mixed')),
  time_zone text not null default 'Australia/Sydney' check (char_length(time_zone) between 1 and 64),
  updated_at timestamptz not null default now(),
  check (cardinality(training_days) = days_per_week),
  check (training_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_on date not null,
  weeks smallint not null default 12 check (weeks between 1 and 52),
  days_per_week smallint not null check (days_per_week in (2, 3, 4)),
  session_minutes smallint not null check (session_minutes in (15, 25, 40)),
  status text not null default 'active' check (status in ('active', 'archived', 'completed')),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  -- Lets child tables check ownership with a composite foreign key.
  unique (id, user_id)
);

create unique index programmes_one_active_per_user on public.programmes (user_id) where status = 'active';

create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  week smallint not null check (week between 1 and 52),
  slot smallint not null check (slot between 0 and 6),
  template text not null check (template in ('A', 'B', 'U', 'L')),
  scheduled_on date not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  completed_at timestamptz,
  unique (programme_id, week, slot),
  unique (id, user_id),
  foreign key (programme_id, user_id) references public.programmes (id, user_id) on delete cascade
);

create index scheduled_workouts_user_date on public.scheduled_workouts (user_id, scheduled_on);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scheduled_workout_id uuid,
  template text not null check (template in ('A', 'B', 'U', 'L')),
  title text not null check (char_length(title) <= 120),
  -- Snapshot of the session plan the engine produced when the workout started.
  plan jsonb not null,
  -- Exercise swaps made during the session, keyed by item index.
  swaps jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id),
  foreign key (scheduled_workout_id, user_id) references public.scheduled_workouts (id, user_id) on delete set null (scheduled_workout_id)
);

create unique index workout_sessions_one_in_progress on public.workout_sessions (user_id) where status = 'in_progress';
create index workout_sessions_user_completed on public.workout_sessions (user_id, completed_at desc);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_index smallint not null check (item_index between 0 and 40),
  exercise_id text not null references public.exercises (id),
  set_number smallint not null check (set_number between 1 and 10),
  reps smallint check (reps between 0 and 300),
  seconds smallint check (seconds between 0 and 1800),
  logged_at timestamptz not null default now(),
  unique (session_id, item_index, set_number),
  check (reps is not null or seconds is not null),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade
);

create index set_logs_user_exercise on public.set_logs (user_id, exercise_id, logged_at desc);

-- How an exercise felt, and what the progression engine decided because of it.
create table public.exercise_feedback (
  session_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_index smallint not null check (item_index between 0 and 40),
  exercise_id text not null references public.exercises (id),
  family_id text,
  difficulty text check (difficulty in ('too_easy', 'about_right', 'too_difficult', 'could_not_finish', 'pain')),
  good_control boolean,
  skipped_reason text check (skipped_reason in ('pain', 'too_hard', 'no_equipment', 'short_on_time', 'other')),
  decision jsonb,
  created_at timestamptz not null default now(),
  primary key (session_id, item_index),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade
);

-- Where the user is on each progression ladder (the engine's FamilyState).
create table public.user_exercise_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id text not null,
  exercise_id text not null references public.exercises (id),
  target smallint not null check (target between 1 and 1800),
  success_streak smallint not null default 0 check (success_streak >= 0),
  difficult_streak smallint not null default 0 check (difficult_streak >= 0),
  pain_reports timestamptz[] not null default '{}',
  paused boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, family_id)
);

-- Every change the engine made, with its plain-language reason.
create table public.progression_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid,
  family_id text not null,
  kind text not null check (kind in ('progress', 'increase_target', 'hold', 'decrease_target', 'regress', 'pain_swap', 'pain_pause', 'no_change', 'resume')),
  from_exercise_id text not null references public.exercises (id),
  to_exercise_id text not null references public.exercises (id),
  from_target smallint not null,
  to_target smallint not null,
  reason text not null,
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete set null (session_id)
);

create index progression_events_user on public.progression_events (user_id, created_at desc);

create table public.user_milestones (
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone_id text not null references public.skill_milestones (id),
  session_id uuid,
  achieved_at timestamptz not null default now(),
  primary key (user_id, milestone_id),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete set null (session_id)
);

create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.saved_exercises (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null references public.exercises (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- ---------------------------------------------------------------- triggers

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger onboarding_updated_at before update on public.onboarding_responses
  for each row execute function public.set_updated_at();
create trigger training_preferences_updated_at before update on public.training_preferences
  for each row execute function public.set_updated_at();
create trigger user_exercise_progress_updated_at before update on public.user_exercise_progress
  for each row execute function public.set_updated_at();

-- Create the profile and an empty onboarding record for every new account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(requested_name, 60));
  insert into public.onboarding_responses (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- privileges

-- Supabase grants broad table privileges to anon and authenticated by default.
-- Narrow them explicitly so the policies below are not the only safeguard.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.exercises, public.exercise_progressions, public.skills,
  public.skill_milestones, public.achievements to anon, authenticated;

grant select, update (display_name) on public.profiles to authenticated;
grant select, insert, update on public.onboarding_responses to authenticated;
grant select, insert, update on public.training_preferences to authenticated;
grant select, insert, update on public.programmes to authenticated;
grant select, insert, update, delete on public.scheduled_workouts to authenticated;
grant select, insert, update on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.set_logs to authenticated;
grant select, insert, update on public.exercise_feedback to authenticated;
grant select, insert, update on public.user_exercise_progress to authenticated;
grant select, insert on public.progression_events to authenticated;
grant select, insert on public.user_milestones to authenticated;
grant select, insert on public.user_achievements to authenticated;
grant select, insert, delete on public.saved_exercises to authenticated;

-- ---------------------------------------------------------------- row level security

alter table public.exercises enable row level security;
alter table public.exercise_progressions enable row level security;
alter table public.skills enable row level security;
alter table public.skill_milestones enable row level security;
alter table public.achievements enable row level security;

create policy "Reference data is public" on public.exercises for select to anon, authenticated using (true);
create policy "Reference data is public" on public.exercise_progressions for select to anon, authenticated using (true);
create policy "Reference data is public" on public.skills for select to anon, authenticated using (true);
create policy "Reference data is public" on public.skill_milestones for select to anon, authenticated using (true);
create policy "Reference data is public" on public.achievements for select to anon, authenticated using (true);

alter table public.profiles enable row level security;
create policy "Own profile: read" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "Own profile: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Every table below has a user_id column and the same rule: only the owner.
do $$
declare
  t text;
begin
  foreach t in array array[
    'onboarding_responses', 'training_preferences', 'programmes', 'scheduled_workouts',
    'workout_sessions', 'set_logs', 'exercise_feedback', 'user_exercise_progress',
    'progression_events', 'user_milestones', 'user_achievements', 'saved_exercises'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Own rows: read" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "Own rows: insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "Own rows: update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "Own rows: delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;
