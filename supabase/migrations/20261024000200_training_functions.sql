-- Multi-row writes that must succeed or fail together.
--
-- The training rules themselves run in TypeScript (src/domain), on the server,
-- before these functions are called. These functions only store the results
-- atomically. Apart from delete_my_account they run as the calling user
-- (security invoker), so row level security still applies to every statement.

-- ---------------------------------------------------------------- programme creation

-- Saves training preferences, replaces the active programme with a new one,
-- stores its schedule and seeds progression state for families the user has
-- not trained yet. Used at the end of onboarding and when restarting.
create or replace function public.create_programme(
  p_preferences jsonb,
  p_started_on date,
  p_weeks smallint,
  p_schedule jsonb,
  p_states jsonb,
  p_complete_onboarding boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_programme uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  insert into public.training_preferences as tp (
    user_id, goals, experience, days_per_week, training_days, session_minutes, equipment, environment, time_zone
  )
  values (
    uid,
    array(select jsonb_array_elements_text(p_preferences -> 'goals')),
    p_preferences ->> 'experience',
    (p_preferences ->> 'days_per_week')::smallint,
    array(select (jsonb_array_elements_text(p_preferences -> 'training_days'))::smallint),
    (p_preferences ->> 'session_minutes')::smallint,
    array(select jsonb_array_elements_text(p_preferences -> 'equipment')),
    p_preferences ->> 'environment',
    coalesce(p_preferences ->> 'time_zone', 'Australia/Sydney')
  )
  on conflict (user_id) do update set
    goals = excluded.goals,
    experience = excluded.experience,
    days_per_week = excluded.days_per_week,
    training_days = excluded.training_days,
    session_minutes = excluded.session_minutes,
    equipment = excluded.equipment,
    environment = excluded.environment,
    time_zone = excluded.time_zone;

  update public.programmes
    set status = 'archived', archived_at = now()
    where user_id = uid and status = 'active';

  insert into public.programmes (user_id, started_on, weeks, days_per_week, session_minutes)
  values (
    uid,
    p_started_on,
    p_weeks,
    (p_preferences ->> 'days_per_week')::smallint,
    (p_preferences ->> 'session_minutes')::smallint
  )
  returning id into new_programme;

  insert into public.scheduled_workouts (programme_id, user_id, week, slot, template, scheduled_on)
  select new_programme, uid, (s ->> 'week')::smallint, (s ->> 'slot')::smallint, s ->> 'template', (s ->> 'scheduled_on')::date
  from jsonb_array_elements(p_schedule) as s;

  insert into public.user_exercise_progress (user_id, family_id, exercise_id, target)
  select uid, st ->> 'family_id', st ->> 'exercise_id', (st ->> 'target')::smallint
  from jsonb_array_elements(p_states) as st
  on conflict (user_id, family_id) do nothing;

  if p_complete_onboarding then
    update public.onboarding_responses
      set completed_at = coalesce(completed_at, now()), current_step = 'summary'
      where user_id = uid;
  end if;

  return new_programme;
end;
$$;

-- ---------------------------------------------------------------- schedule changes

-- Applies new preferences to the active programme without losing history:
-- completed sessions stay, planned sessions from p_from onwards are replaced.
create or replace function public.reschedule_programme(
  p_preferences jsonb,
  p_from date,
  p_schedule jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  active uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select id into active from public.programmes where user_id = uid and status = 'active';
  if active is null then
    raise exception 'No active programme' using errcode = 'P0002';
  end if;

  update public.training_preferences set
    goals = array(select jsonb_array_elements_text(p_preferences -> 'goals')),
    experience = p_preferences ->> 'experience',
    days_per_week = (p_preferences ->> 'days_per_week')::smallint,
    training_days = array(select (jsonb_array_elements_text(p_preferences -> 'training_days'))::smallint),
    session_minutes = (p_preferences ->> 'session_minutes')::smallint,
    equipment = array(select jsonb_array_elements_text(p_preferences -> 'equipment')),
    environment = p_preferences ->> 'environment',
    time_zone = coalesce(p_preferences ->> 'time_zone', time_zone)
  where user_id = uid;

  update public.programmes set
    days_per_week = (p_preferences ->> 'days_per_week')::smallint,
    session_minutes = (p_preferences ->> 'session_minutes')::smallint
  where id = active;

  delete from public.scheduled_workouts
    where programme_id = active and status = 'planned' and scheduled_on >= p_from;

  insert into public.scheduled_workouts (programme_id, user_id, week, slot, template, scheduled_on)
  select active, uid, (s ->> 'week')::smallint, (s ->> 'slot')::smallint, s ->> 'template', (s ->> 'scheduled_on')::date
  from jsonb_array_elements(p_schedule) as s;
end;
$$;

-- ---------------------------------------------------------------- workout completion

-- Stores everything that happens when a workout is finished: feedback per
-- exercise, the engine's decisions, new progression state, milestones and
-- achievements. Marks the session and its scheduled slot complete.
create or replace function public.complete_workout(
  p_session_id uuid,
  p_feedback jsonb,
  p_progress jsonb,
  p_events jsonb,
  p_milestones text[],
  p_achievements text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  session_row public.workout_sessions;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into session_row from public.workout_sessions
    where id = p_session_id and user_id = uid
    for update;
  if session_row.id is null then
    raise exception 'Workout not found' using errcode = 'P0002';
  end if;
  if session_row.status <> 'in_progress' then
    raise exception 'Workout already finished' using errcode = '22023';
  end if;

  insert into public.exercise_feedback (session_id, user_id, item_index, exercise_id, family_id, difficulty, good_control, skipped_reason, decision)
  select p_session_id, uid, (f ->> 'item_index')::smallint, f ->> 'exercise_id', f ->> 'family_id',
         f ->> 'difficulty', (f ->> 'good_control')::boolean, f ->> 'skipped_reason', f -> 'decision'
  from jsonb_array_elements(coalesce(p_feedback, '[]'::jsonb)) as f
  on conflict (session_id, item_index) do update set
    exercise_id = excluded.exercise_id,
    family_id = excluded.family_id,
    difficulty = excluded.difficulty,
    good_control = excluded.good_control,
    skipped_reason = excluded.skipped_reason,
    decision = excluded.decision;

  insert into public.user_exercise_progress as p (user_id, family_id, exercise_id, target, success_streak, difficult_streak, pain_reports, paused)
  select uid, s ->> 'family_id', s ->> 'exercise_id', (s ->> 'target')::smallint,
         (s ->> 'success_streak')::smallint, (s ->> 'difficult_streak')::smallint,
         array(select (jsonb_array_elements_text(coalesce(s -> 'pain_reports', '[]'::jsonb)))::timestamptz),
         coalesce((s ->> 'paused')::boolean, false)
  from jsonb_array_elements(coalesce(p_progress, '[]'::jsonb)) as s
  on conflict (user_id, family_id) do update set
    exercise_id = excluded.exercise_id,
    target = excluded.target,
    success_streak = excluded.success_streak,
    difficult_streak = excluded.difficult_streak,
    pain_reports = excluded.pain_reports,
    paused = excluded.paused;

  insert into public.progression_events (user_id, session_id, family_id, kind, from_exercise_id, to_exercise_id, from_target, to_target, reason)
  select uid, p_session_id, e ->> 'family_id', e ->> 'kind', e ->> 'from_exercise_id', e ->> 'to_exercise_id',
         (e ->> 'from_target')::smallint, (e ->> 'to_target')::smallint, e ->> 'reason'
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) as e;

  insert into public.user_milestones (user_id, milestone_id, session_id)
  select uid, m, p_session_id from unnest(coalesce(p_milestones, '{}')) as m
  on conflict do nothing;

  insert into public.user_achievements (user_id, achievement_id)
  select uid, a from unnest(coalesce(p_achievements, '{}')) as a
  on conflict do nothing;

  update public.workout_sessions
    set status = 'completed', completed_at = now()
    where id = p_session_id;

  if session_row.scheduled_workout_id is not null then
    update public.scheduled_workouts
      set status = 'completed', completed_at = now()
      where id = session_row.scheduled_workout_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------- resuming a paused exercise family

create or replace function public.resume_family(p_family_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_row public.user_exercise_progress;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  update public.user_exercise_progress
    set paused = false, success_streak = 0, difficult_streak = 0
    where user_id = uid and family_id = p_family_id and paused
    returning * into current_row;

  if current_row.user_id is not null then
    insert into public.progression_events (user_id, family_id, kind, from_exercise_id, to_exercise_id, from_target, to_target, reason)
    values (uid, p_family_id, 'resume', current_row.exercise_id, current_row.exercise_id, current_row.target, current_row.target,
            'You resumed this movement. Start gently and stop if the discomfort returns.');
  end if;
end;
$$;

-- ---------------------------------------------------------------- data export

-- Everything stored about the calling user, as one JSON document.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'onboarding', (select to_jsonb(o) from public.onboarding_responses o where o.user_id = auth.uid()),
    'training_preferences', (select to_jsonb(t) from public.training_preferences t where t.user_id = auth.uid()),
    'programmes', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.programmes x where x.user_id = auth.uid()), '[]'::jsonb),
    'scheduled_workouts', coalesce((select jsonb_agg(to_jsonb(x) order by x.scheduled_on) from public.scheduled_workouts x where x.user_id = auth.uid()), '[]'::jsonb),
    'workout_sessions', coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at) from public.workout_sessions x where x.user_id = auth.uid()), '[]'::jsonb),
    'set_logs', coalesce((select jsonb_agg(to_jsonb(x) order by x.logged_at) from public.set_logs x where x.user_id = auth.uid()), '[]'::jsonb),
    'exercise_feedback', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.exercise_feedback x where x.user_id = auth.uid()), '[]'::jsonb),
    'exercise_progress', coalesce((select jsonb_agg(to_jsonb(x) order by x.family_id) from public.user_exercise_progress x where x.user_id = auth.uid()), '[]'::jsonb),
    'progression_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.progression_events x where x.user_id = auth.uid()), '[]'::jsonb),
    'milestones', coalesce((select jsonb_agg(to_jsonb(x) order by x.achieved_at) from public.user_milestones x where x.user_id = auth.uid()), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(to_jsonb(x) order by x.earned_at) from public.user_achievements x where x.user_id = auth.uid()), '[]'::jsonb),
    'saved_exercises', coalesce((select jsonb_agg(to_jsonb(x) order by x.saved_at) from public.saved_exercises x where x.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------- account deletion

-- Deletes the caller's account. Every table above references auth.users with
-- "on delete cascade", so all training data goes with it. Security definer is
-- needed because users cannot delete from auth.users directly; the function
-- only ever deletes the caller's own row.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- ---------------------------------------------------------------- privileges

revoke execute on function public.create_programme(jsonb, date, smallint, jsonb, jsonb, boolean) from public, anon;
revoke execute on function public.reschedule_programme(jsonb, date, jsonb) from public, anon;
revoke execute on function public.complete_workout(uuid, jsonb, jsonb, jsonb, text[], text[]) from public, anon;
revoke execute on function public.resume_family(text) from public, anon;
revoke execute on function public.export_my_data() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.create_programme(jsonb, date, smallint, jsonb, jsonb, boolean) to authenticated;
grant execute on function public.reschedule_programme(jsonb, date, jsonb) to authenticated;
grant execute on function public.complete_workout(uuid, jsonb, jsonb, jsonb, text[], text[]) to authenticated;
grant execute on function public.resume_family(text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
