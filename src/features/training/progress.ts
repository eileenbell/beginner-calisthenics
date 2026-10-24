import { addDays, getExercise, weekDates, type IsoDate } from "@/domain";
import type { ScheduledWorkoutRow } from "@/server/rows";

// Progress calculations. Everything is derived from sets the user logged in
// completed workouts; nothing is estimated or projected.

export type ProgressRange = "30" | "90" | "all";

export const RANGES: { id: ProgressRange; label: string }[] = [
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

export function parseRange(value: unknown): ProgressRange {
  return value === "90" || value === "all" ? value : "30";
}

/** First day included in a range, in the user's calendar, or null for all time. */
export function rangeStart(range: ProgressRange, today: IsoDate): IsoDate | null {
  if (range === "all") return null;
  return addDays(today, -(Number(range) - 1));
}

export interface LoggedSet {
  sessionId: string;
  exerciseId: string;
  reps: number | null;
  seconds: number | null;
  /** Calendar date of the session, in the user's time zone. */
  date: IsoDate;
  /** Session completion time, used to order sessions on the same day. */
  completedAt: string;
}

export interface Improvement {
  exerciseId: string;
  name: string;
  measure: "reps" | "seconds";
  first: number;
  best: number;
  latest: number;
  firstDate: IsoDate;
  latestDate: IsoDate;
  sessions: number;
}

/**
 * For each exercise logged in two or more workouts, the best single set in
 * the first workout compared with the best set since. Only main-ladder
 * exercises (those that belong to a family) are included.
 */
export function improvements(sets: LoggedSet[]): Improvement[] {
  const byExercise = new Map<string, LoggedSet[]>();
  for (const s of sets) {
    const exercise = getExercise(s.exerciseId);
    if (!exercise.familyId) continue;
    byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  }
  const out: Improvement[] = [];
  for (const [exerciseId, rows] of byExercise) {
    const exercise = getExercise(exerciseId);
    const value = (s: LoggedSet) => (exercise.measure === "seconds" ? (s.seconds ?? 0) : (s.reps ?? 0));
    const sessions = new Map<string, { date: IsoDate; at: string; best: number }>();
    for (const r of rows) {
      const current = sessions.get(r.sessionId);
      sessions.set(r.sessionId, { date: r.date, at: r.completedAt, best: Math.max(current?.best ?? 0, value(r)) });
    }
    if (sessions.size < 2) continue;
    const ordered = [...sessions.values()].sort((a, b) => a.at.localeCompare(b.at));
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    const best = Math.max(...ordered.slice(1).map((s) => s.best));
    out.push({
      exerciseId,
      name: exercise.name,
      measure: exercise.measure,
      first: first.best,
      best,
      latest: latest.best,
      firstDate: first.date,
      latestDate: latest.date,
      sessions: sessions.size,
    });
  }
  return out.sort((a, b) => b.best - b.first - (a.best - a.first) || a.name.localeCompare(b.name));
}

export interface Totals {
  workouts: number;
  sets: number;
  reps: number;
  seconds: number;
}

export function totals(sets: LoggedSet[], workouts: number): Totals {
  return {
    workouts,
    sets: sets.length,
    reps: sets.reduce((t, s) => t + (s.reps ?? 0), 0),
    seconds: sets.reduce((t, s) => t + (s.seconds ?? 0), 0),
  };
}

export type CadenceKind = "done" | "missed" | "planned" | "rest" | "skipped" | "outside";

export interface CadenceDay {
  date: IsoDate;
  kind: CadenceKind;
  isToday: boolean;
}

export interface CadenceWeek {
  week: number;
  days: CadenceDay[];
  completed: number;
  planned: number;
}

/** The current programme week and up to three before it, as day grids. */
export function cadence(schedule: ScheduledWorkoutRow[], startedOn: IsoDate, currentWeek: number, totalWeeks: number, today: IsoDate): CadenceWeek[] {
  const last = Math.min(Math.max(currentWeek, 1), totalWeeks);
  const first = Math.max(1, last - 3);
  const weeks: CadenceWeek[] = [];
  for (let week = first; week <= last; week++) {
    const rows = schedule.filter((s) => s.week === week);
    const days = weekDates(startedOn, week).map((date): CadenceDay => {
      const slot = rows.find((s) => s.scheduled_on === date);
      let kind: CadenceKind;
      if (!slot) kind = "rest";
      else if (slot.status === "completed") kind = "done";
      else if (slot.status === "skipped") kind = "skipped";
      else kind = date < today ? "missed" : "planned";
      return { date, kind, isToday: date === today };
    });
    weeks.push({ week, days, completed: rows.filter((r) => r.status === "completed").length, planned: rows.length });
  }
  return weeks;
}
