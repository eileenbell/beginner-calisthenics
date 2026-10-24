import "server-only";
import { ACHIEVEMENTS, getExercise, localDate, MILESTONES_BY_ID, type AchievementDef, type Milestone, type ProgressionDecision } from "@/domain";
import { getSupabase, requireTrainingAccount } from "./auth";
import type { FeedbackRow, SessionRow, SetLogRow, UserAchievementRow, UserMilestoneRow } from "./rows";
import { sessionOutcomes } from "./workouts";

// Read side of finished workouts: the summary after a session, the history
// list and a single past session. Everything shown comes from what the user
// logged; nothing is estimated.

export interface ReportItem {
  itemIndex: number;
  block: "warmup" | "main" | "cooldown";
  exerciseId: string;
  name: string;
  plannedName: string | null;
  measure: "reps" | "seconds";
  perSide: boolean;
  prescribedSets: number;
  target: number;
  values: number[];
  feedback: FeedbackRow["difficulty"];
  goodControl: boolean | null;
  skipped: FeedbackRow["skipped_reason"];
  decision: ProgressionDecision | null;
}

export interface SessionReport {
  session: SessionRow;
  date: string;
  minutes: number | null;
  items: ReportItem[];
  totals: { sets: number; reps: number; seconds: number; exercises: number };
  milestones: Milestone[];
  achievements: AchievementDef[];
}

function isDecision(value: unknown): value is ProgressionDecision {
  return Boolean(value && typeof value === "object" && "kind" in value && "reason" in value);
}

/** Whole minutes between start and finish, or null if the timestamps are implausible. */
export function sessionMinutes(startedAt: string, completedAt: string | null): number | null {
  if (!completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0 || ms > 6 * 60 * 60 * 1000) return null;
  return Math.max(1, Math.round(ms / 60_000));
}

export async function loadSessionReport(sessionId: string): Promise<SessionReport | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const account = await requireTrainingAccount();
  const supabase = await getSupabase();
  const userId = account.user.id;
  const { data } = await supabase.from("workout_sessions").select("*").eq("id", sessionId).eq("user_id", userId).maybeSingle();
  const session = data as SessionRow | null;
  if (!session || session.status !== "completed") return null;

  const [logs, feedback, milestones, achievements] = await Promise.all([
    supabase.from("set_logs").select("*").eq("session_id", sessionId),
    supabase.from("exercise_feedback").select("*").eq("session_id", sessionId),
    supabase.from("user_milestones").select("milestone_id, session_id, achieved_at").eq("session_id", sessionId),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
  ]);
  if (logs.error || feedback.error || milestones.error || achievements.error) throw new Error("Could not load this workout.");

  const feedbackRows = (feedback.data ?? []) as FeedbackRow[];
  const outcomes = sessionOutcomes(session, (logs.data ?? []) as SetLogRow[], feedbackRows);
  const items: ReportItem[] = outcomes.map((o) => {
    const planned = session.plan.items[o.itemIndex];
    const exercise = getExercise(o.exerciseId);
    const decision = feedbackRows.find((f) => f.item_index === o.itemIndex)?.decision;
    return {
      itemIndex: o.itemIndex,
      block: planned.block,
      exerciseId: o.exerciseId,
      name: exercise.name,
      plannedName: o.exerciseId !== planned.exerciseId ? getExercise(planned.exerciseId).name : null,
      measure: planned.measure,
      perSide: planned.perSide,
      prescribedSets: planned.sets,
      target: planned.target,
      values: o.sets.map((s) => (planned.measure === "seconds" ? (s.seconds ?? 0) : (s.reps ?? 0))),
      feedback: o.feedback,
      goodControl: o.goodControl,
      skipped: o.skipped,
      decision: isDecision(decision) ? decision : null,
    };
  });

  const totals = items.reduce(
    (t, i) => ({
      sets: t.sets + i.values.length,
      reps: t.reps + (i.measure === "reps" ? i.values.reduce((a, b) => a + b, 0) : 0),
      seconds: t.seconds + (i.measure === "seconds" ? i.values.reduce((a, b) => a + b, 0) : 0),
      exercises: t.exercises + (i.values.length > 0 ? 1 : 0),
    }),
    { sets: 0, reps: 0, seconds: 0, exercises: 0 },
  );

  // complete_workout writes achievements in the same transaction that marks
  // the session completed, so their timestamps match.
  const finished = new Date(session.completed_at ?? 0).getTime();
  const earnedHere = ((achievements.data ?? []) as UserAchievementRow[]).filter((a) => Math.abs(new Date(a.earned_at).getTime() - finished) < 2_000);

  return {
    session,
    date: localDate(new Date(session.completed_at ?? session.started_at), account.preferences.time_zone),
    minutes: sessionMinutes(session.started_at, session.completed_at),
    items,
    totals,
    milestones: ((milestones.data ?? []) as UserMilestoneRow[]).map((m) => MILESTONES_BY_ID.get(m.milestone_id)).filter((m): m is Milestone => Boolean(m)),
    achievements: earnedHere.map((a) => ACHIEVEMENTS.find((d) => d.id === a.achievement_id)).filter((a): a is AchievementDef => Boolean(a)),
  };
}

export interface HistoryEntry {
  id: string;
  title: string;
  template: SessionRow["template"];
  date: string;
  minutes: number | null;
  sets: number;
  reps: number;
  week: number | null;
  scheduledWorkoutId: string | null;
}

/** Completed workouts, newest first, with set and rep totals from the logs. */
export async function listHistory(limit = 100): Promise<HistoryEntry[]> {
  const account = await requireTrainingAccount();
  const supabase = await getSupabase();
  const userId = account.user.id;
  const sessions = await supabase
    .from("workout_sessions")
    .select("id, title, template, started_at, completed_at, scheduled_workout_id, scheduled_workouts(week)")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (sessions.error) throw new Error("Could not load your workout history.");
  const rows = (sessions.data ?? []) as unknown as (Pick<SessionRow, "id" | "title" | "template" | "started_at" | "completed_at" | "scheduled_workout_id"> & {
    scheduled_workouts: { week: number } | null;
  })[];
  if (rows.length === 0) return [];

  const logs = await supabase
    .from("set_logs")
    .select("session_id, reps")
    .in(
      "session_id",
      rows.map((r) => r.id),
    );
  if (logs.error) throw new Error("Could not load your workout history.");
  const totals = new Map<string, { sets: number; reps: number }>();
  for (const log of (logs.data ?? []) as { session_id: string; reps: number | null }[]) {
    const t = totals.get(log.session_id) ?? { sets: 0, reps: 0 };
    t.sets += 1;
    t.reps += log.reps ?? 0;
    totals.set(log.session_id, t);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    template: r.template,
    date: localDate(new Date(r.completed_at ?? r.started_at), account.preferences.time_zone),
    minutes: sessionMinutes(r.started_at, r.completed_at),
    sets: totals.get(r.id)?.sets ?? 0,
    reps: totals.get(r.id)?.reps ?? 0,
    week: r.scheduled_workouts?.week ?? null,
    scheduledWorkoutId: r.scheduled_workout_id,
  }));
}
