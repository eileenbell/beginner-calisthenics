import "server-only";
import { localDate, type IsoDate } from "@/domain";
import { rangeStart, type LoggedSet, type ProgressRange } from "@/features/training/progress";
import { getSupabase } from "./auth";
import type { ProgressionEventRow } from "./rows";
import type { TrainingSnapshot } from "./training";

export interface ProgressData {
  sets: LoggedSet[];
  workouts: number;
  events: ProgressionEventRow[];
}

/** Logged sets from completed workouts in the range, plus progression events. */
export async function loadProgress(snapshot: TrainingSnapshot, range: ProgressRange): Promise<ProgressData> {
  const supabase = await getSupabase();
  const userId = snapshot.account.user.id;
  const tz = snapshot.account.preferences.time_zone;
  const start = rangeStart(range, snapshot.today);

  const sessionsQuery = supabase.from("workout_sessions").select("id, completed_at").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: true });
  const [sessions, events] = await Promise.all([
    sessionsQuery,
    supabase.from("progression_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ]);
  if (sessions.error || events.error) throw new Error("Could not load your progress.");

  const inRange = ((sessions.data ?? []) as { id: string; completed_at: string }[])
    .map((s) => ({ ...s, date: localDate(new Date(s.completed_at), tz) as IsoDate }))
    .filter((s) => !start || s.date >= start);
  if (inRange.length === 0) return { sets: [], workouts: 0, events: (events.data ?? []) as ProgressionEventRow[] };

  const byId = new Map(inRange.map((s) => [s.id, s]));
  const logs = await supabase
    .from("set_logs")
    .select("session_id, exercise_id, reps, seconds")
    .eq("user_id", userId)
    .in("session_id", [...byId.keys()]);
  if (logs.error) throw new Error("Could not load your progress.");

  const sets: LoggedSet[] = ((logs.data ?? []) as { session_id: string; exercise_id: string; reps: number | null; seconds: number | null }[]).map((l) => {
    const s = byId.get(l.session_id)!;
    return { sessionId: l.session_id, exerciseId: l.exercise_id, reps: l.reps, seconds: l.seconds, date: s.date, completedAt: s.completed_at };
  });
  return { sets, workouts: inRange.length, events: (events.data ?? []) as ProgressionEventRow[] };
}
