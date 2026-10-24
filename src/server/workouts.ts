import "server-only";
import {
  earnedAchievements,
  evaluateExposure,
  getExercise,
  newMilestones,
  withDefaultStates,
  type ExerciseFeedback,
  type FamilyId,
  type FamilyState,
  type LoggedExercise,
  type ProgressionDecision,
  type SetResult,
  type SkipReason,
} from "@/domain";
import { getSupabase, requireTrainingAccount } from "./auth";
import { toFamilyState, type FeedbackRow, type ProgressRow, type SessionRow, type SetLogRow } from "./rows";

export interface ItemOutcome {
  itemIndex: number;
  exerciseId: string;
  familyId: FamilyId | null;
  sets: SetResult[];
  feedback: ExerciseFeedback | null;
  goodControl: boolean | null;
  skipped: SkipReason | null;
}

/** Joins a session's plan, swaps, set logs and feedback into one row per planned exercise. */
export function sessionOutcomes(session: Pick<SessionRow, "plan" | "swaps">, logs: SetLogRow[], feedback: FeedbackRow[]): ItemOutcome[] {
  return session.plan.items.map((item, itemIndex) => {
    const exerciseId = session.swaps[String(itemIndex)] ?? item.exerciseId;
    const fb = feedback.find((f) => f.item_index === itemIndex);
    const sets = logs
      .filter((l) => l.item_index === itemIndex && l.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number)
      .map((l) => ({ reps: l.reps, seconds: l.seconds }));
    return {
      itemIndex,
      exerciseId,
      familyId: item.familyId,
      sets,
      feedback: fb?.difficulty ?? null,
      goodControl: fb?.good_control ?? null,
      skipped: fb?.skipped_reason ?? null,
    };
  });
}

/**
 * Runs the progression engine over a finished workout and stores the result
 * atomically with complete_workout. Main exercises that were never started
 * count as skipped for time, which changes nothing.
 */
export async function completeSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const account = await requireTrainingAccount();
  const supabase = await getSupabase();
  const userId = account.user.id;

  const sessionResult = await supabase.from("workout_sessions").select("*").eq("id", sessionId).eq("user_id", userId).maybeSingle();
  const session = sessionResult.data as SessionRow | null;
  if (!session) return { ok: false, error: "Workout not found." };
  if (session.status !== "in_progress") return { ok: true };

  const [logs, feedback, progress, milestones, completed, events, schedule] = await Promise.all([
    supabase.from("set_logs").select("*").eq("session_id", sessionId),
    supabase.from("exercise_feedback").select("*").eq("session_id", sessionId),
    supabase.from("user_exercise_progress").select("*").eq("user_id", userId),
    supabase.from("user_milestones").select("milestone_id").eq("user_id", userId),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("progression_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "progress"),
    supabase.from("scheduled_workouts").select("id, week, status").eq("programme_id", account.programme.id),
  ]);
  const failed = [logs, feedback, progress, milestones, completed, events, schedule].find((r) => r.error);
  if (failed?.error) return { ok: false, error: "We couldn't load this workout to finish it. Please try again." };

  const outcomes = sessionOutcomes(session, (logs.data ?? []) as SetLogRow[], (feedback.data ?? []) as FeedbackRow[]);
  // Families added after sign-up have no saved row yet; complete_workout creates it.
  const states = withDefaultStates(new Map<FamilyId, FamilyState>(((progress.data ?? []) as ProgressRow[]).map((r) => [r.family_id, toFamilyState(r)])));
  const now = new Date();
  const decisions: { itemIndex: number; decision: ProgressionDecision }[] = [];

  for (const outcome of outcomes) {
    const item = session.plan.items[outcome.itemIndex];
    if (item.block !== "main" || !outcome.familyId) continue;
    const state = states.get(outcome.familyId);
    if (!state) continue;
    const untouched = outcome.sets.length === 0 && !outcome.feedback && !outcome.skipped;
    const result = evaluateExposure(
      state,
      {
        exerciseId: outcome.exerciseId,
        prescribedSets: item.sets,
        target: item.target,
        sets: outcome.sets,
        feedback: outcome.feedback,
        goodControl: outcome.goodControl,
        skipped: untouched ? "short_on_time" : outcome.skipped,
      },
      { now, equipment: account.preferences.equipment },
    );
    states.set(outcome.familyId, result.state);
    decisions.push({ itemIndex: outcome.itemIndex, decision: result.decision });
  }

  const achieved = new Set(((milestones.data ?? []) as { milestone_id: string }[]).map((m) => m.milestone_id));
  const logged: LoggedExercise[] = outcomes
    .filter((o) => o.sets.length > 0 && !o.skipped)
    .map((o) => ({ exerciseId: o.exerciseId, sets: o.sets, feedback: o.feedback, goodControl: o.goodControl }));
  const earnedMilestones = newMilestones(logged, achieved);
  const allMilestones = new Set([...achieved, ...earnedMilestones]);

  const scheduleRows = (schedule.data ?? []) as { id: string; week: number; status: string }[];
  const done = (row: { id: string; status: string }) => row.status === "completed" || row.id === session.scheduled_workout_id;
  const weeks = new Map<number, { id: string; status: string }[]>();
  for (const row of scheduleRows) weeks.set(row.week, [...(weeks.get(row.week) ?? []), row]);
  const hasFullWeek = [...weeks.values()].some((rows) => rows.length > 0 && rows.every(done));
  const achievements = earnedAchievements({
    completedSessions: (completed.count ?? 0) + 1,
    hasFullWeek,
    progressions: (events.count ?? 0) + decisions.filter((d) => d.decision.kind === "progress").length,
    achievedMilestones: allMilestones,
  });

  const feedbackPayload = outcomes
    .filter((o) => session.plan.items[o.itemIndex].block === "main" || o.feedback || o.skipped)
    .filter((o) => o.sets.length > 0 || o.feedback || o.skipped || decisions.some((d) => d.itemIndex === o.itemIndex))
    .map((o) => ({
      item_index: o.itemIndex,
      exercise_id: o.exerciseId,
      family_id: o.familyId,
      difficulty: o.feedback,
      good_control: o.goodControl,
      skipped_reason: o.skipped ?? (o.sets.length === 0 && session.plan.items[o.itemIndex].block === "main" ? "short_on_time" : null),
      decision: decisions.find((d) => d.itemIndex === o.itemIndex)?.decision ?? null,
    }));

  const changedFamilies = new Set(decisions.map((d) => d.decision.familyId));
  const progressPayload = [...states.values()]
    .filter((s) => changedFamilies.has(s.familyId))
    .map((s) => ({
      family_id: s.familyId,
      exercise_id: s.exerciseId,
      target: s.target,
      success_streak: s.successStreak,
      difficult_streak: s.difficultStreak,
      pain_reports: s.painReports,
      paused: s.paused,
    }));

  const eventsPayload = decisions
    .filter((d) => d.decision.kind !== "no_change")
    .map(({ decision }) => ({
      family_id: decision.familyId,
      kind: decision.kind,
      from_exercise_id: decision.fromExerciseId,
      to_exercise_id: decision.toExerciseId,
      from_target: decision.fromTarget,
      to_target: decision.toTarget,
      reason: decision.reason,
    }));

  const { error } = await supabase.rpc("complete_workout", {
    p_session_id: sessionId,
    p_feedback: feedbackPayload,
    p_progress: progressPayload,
    p_events: eventsPayload,
    p_milestones: earnedMilestones,
    p_achievements: achievements,
  });
  if (error) {
    if (error.message.includes("already finished")) return { ok: true };
    return { ok: false, error: "We couldn't save your finished workout. Your sets are safe; try again." };
  }
  return { ok: true };
}

export function exerciseName(id: string): string {
  return getExercise(id).name;
}
