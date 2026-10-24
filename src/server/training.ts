import "server-only";
import { cache } from "react";
import {
  buildSessionPlan,
  daysBetween,
  localDate,
  unlockedSkills,
  weekOf,
  type FamilyId,
  type FamilyState,
  type PainEvent,
  type SessionPlan,
  type SessionTemplate,
} from "@/domain";
import { getSupabase, requireTrainingAccount, type TrainingAccount } from "./auth";
import {
  toFamilyState,
  toTrainingProfile,
  type ProgressRow,
  type ScheduledWorkoutRow,
  type SessionRow,
  type UserAchievementRow,
  type UserMilestoneRow,
} from "./rows";

// Read side of training: everything the dashboard, programme, skills and
// progress screens need, loaded once per request.

export interface TrainingSnapshot {
  account: TrainingAccount;
  today: string;
  now: Date;
  /** Programme week containing today, clamped to the programme. */
  week: number;
  /** Raw programme week (can exceed the programme length once it's over). */
  rawWeek: number;
  programmeOver: boolean;
  states: Map<FamilyId, FamilyState>;
  schedule: ScheduledWorkoutRow[];
  inProgress: Pick<SessionRow, "id" | "title" | "template" | "started_at" | "scheduled_workout_id"> | null;
  completedCount: number;
  lastCompletedAt: string | null;
  milestones: UserMilestoneRow[];
  achievedMilestones: Set<string>;
  achievements: UserAchievementRow[];
  painEvents: PainEvent[];
}

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return result.data as T;
}

export const getTrainingSnapshot = cache(async (): Promise<TrainingSnapshot> => {
  const account = await requireTrainingAccount();
  const supabase = await getSupabase();
  const userId = account.user.id;
  const [progress, schedule, inProgress, completed, lastCompleted, milestones, achievements] = await Promise.all([
    supabase.from("user_exercise_progress").select("*").eq("user_id", userId),
    supabase
      .from("scheduled_workouts")
      .select("id, programme_id, week, slot, template, scheduled_on, status, completed_at")
      .eq("programme_id", account.programme.id)
      .order("scheduled_on")
      .order("slot"),
    supabase
      .from("workout_sessions")
      .select("id, title, template, started_at, scheduled_workout_id")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .maybeSingle(),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    supabase
      .from("workout_sessions")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("user_milestones").select("milestone_id, session_id, achieved_at").eq("user_id", userId),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId).order("earned_at", { ascending: false }),
  ]);

  const progressRows = check(progress, "your progress") as ProgressRow[];
  const states = new Map<FamilyId, FamilyState>(progressRows.map((r) => [r.family_id, toFamilyState(r)]));
  const now = new Date();
  const today = localDate(now, account.preferences.time_zone);
  const rawWeek = Math.max(1, weekOf(account.programme.started_on, today));
  const milestoneRows = check(milestones, "milestones") as UserMilestoneRow[];
  if (completed.error) throw new Error(`Could not load workouts: ${completed.error.message}`);

  return {
    account,
    today,
    now,
    week: Math.min(account.programme.weeks, rawWeek),
    rawWeek,
    programmeOver: rawWeek > account.programme.weeks,
    states,
    schedule: check(schedule, "your schedule") as ScheduledWorkoutRow[],
    inProgress: check(inProgress, "your current workout"),
    completedCount: completed.count ?? 0,
    lastCompletedAt: (check(lastCompleted, "your last workout") as { completed_at: string } | null)?.completed_at ?? null,
    milestones: milestoneRows,
    achievedMilestones: new Set(milestoneRows.map((m) => m.milestone_id)),
    achievements: check(achievements, "achievements") as UserAchievementRow[],
    painEvents: progressRows.flatMap((r) => (r.pain_reports ?? []).map((at) => ({ familyId: r.family_id, at }))),
  };
});

/** The engine's plan for a session, from the user's current progression state. */
export function planSession(snapshot: TrainingSnapshot, template: SessionTemplate, week: number): SessionPlan {
  const { account, states, achievedMilestones, painEvents, now, today, lastCompletedAt } = snapshot;
  const profile = toTrainingProfile(account.preferences);
  const lastDay = lastCompletedAt ? localDate(new Date(lastCompletedAt), account.preferences.time_zone) : null;
  return buildSessionPlan({
    profile,
    states,
    week: Math.min(account.programme.weeks, Math.max(1, week)),
    template,
    daysSinceLastSession: lastDay ? daysBetween(lastDay, today) : null,
    unlockedSkills: unlockedSkills(achievedMilestones, painEvents, profile.equipment, now),
  });
}

export type NextSessionKind = "resume" | "today" | "catch_up" | "upcoming" | "none";

export interface NextSession {
  kind: NextSessionKind;
  slot: ScheduledWorkoutRow | null;
}

/**
 * What the Today screen should offer: a workout already under way, then
 * today's session, then a missed one from this week, then the next one.
 */
export function nextSession(snapshot: TrainingSnapshot): NextSession {
  const { schedule, today, inProgress, rawWeek } = snapshot;
  if (inProgress) {
    return { kind: "resume", slot: schedule.find((s) => s.id === inProgress.scheduled_workout_id) ?? null };
  }
  const planned = schedule.filter((s) => s.status === "planned");
  const todays = planned.find((s) => s.scheduled_on === today);
  if (todays) return { kind: "today", slot: todays };
  const missed = planned.find((s) => s.week === rawWeek && s.scheduled_on < today);
  if (missed) return { kind: "catch_up", slot: missed };
  const upcoming = planned.find((s) => s.scheduled_on > today);
  if (upcoming) return { kind: "upcoming", slot: upcoming };
  return { kind: "none", slot: null };
}
