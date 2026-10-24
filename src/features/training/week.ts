import { weekDates, type IsoDate } from "@/domain";
import type { ScheduledWorkoutRow } from "@/server/rows";

export type DayKind = "done" | "today" | "today_done" | "planned" | "missed" | "rest" | "today_rest";

export interface DayTile {
  date: IsoDate;
  kind: DayKind;
  slot: ScheduledWorkoutRow | null;
}

/** The seven days of a programme week, as tiles for the weekly rhythm card. */
export function weekTiles(schedule: ScheduledWorkoutRow[], startedOn: IsoDate, week: number, today: IsoDate): DayTile[] {
  return weekDates(startedOn, week).map((date) => {
    const slot = schedule.find((s) => s.scheduled_on === date && s.week === week) ?? null;
    const isToday = date === today;
    let kind: DayKind;
    if (!slot) kind = isToday ? "today_rest" : "rest";
    else if (slot.status === "completed") kind = isToday ? "today_done" : "done";
    else if (isToday) kind = "today";
    else if (date < today) kind = "missed";
    else kind = "planned";
    return { date, kind, slot };
  });
}

export function weekCounts(schedule: ScheduledWorkoutRow[], week: number) {
  const rows = schedule.filter((s) => s.week === week);
  return { completed: rows.filter((s) => s.status === "completed").length, planned: rows.length };
}

/** Planned sessions earlier this week that haven't been done. */
export function missedThisWeek(schedule: ScheduledWorkoutRow[], week: number, today: IsoDate) {
  return schedule.filter((s) => s.week === week && s.status === "planned" && s.scheduled_on < today);
}
