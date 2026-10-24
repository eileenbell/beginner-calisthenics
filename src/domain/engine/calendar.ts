import type { DaysPerWeek, SessionTemplate } from "../types";
import { PROGRAMME_WEEKS, SUGGESTED_DAY_OFFSETS, weekTemplates } from "./programme";

// Calendar dates for the programme. Dates are plain "YYYY-MM-DD" strings in
// the user's own time zone, so "today" means the user's today wherever the
// server runs. Programme weeks roll from the start date: week 1 is the start
// date and the six days after it, so every week holds each chosen weekday once.

export type IsoDate = string;
/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(date: IsoDate): Date {
  if (!isIsoDate(date)) throw new Error(`Invalid date: ${date}`);
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

export function isoWeekday(date: IsoDate): IsoWeekday {
  const day = toUtc(date).getUTCDay();
  return (day === 0 ? 7 : day) as IsoWeekday;
}

/** The calendar date at `now` in an IANA time zone. Falls back to UTC for unknown zones. */
export function localDate(now: Date, timeZone: string): IsoDate {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone });
  } catch {
    zone = "UTC";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Default training days: the engine's suggested spacing, starting on `startWeekday`. */
export function suggestTrainingDays(daysPerWeek: DaysPerWeek, startWeekday: IsoWeekday): IsoWeekday[] {
  return SUGGESTED_DAY_OFFSETS[daysPerWeek]
    .map((offset) => (((startWeekday - 1 + offset) % 7) + 1) as IsoWeekday)
    .sort((a, b) => a - b);
}

export type TrainingDaysProblem = "wrong_count" | "duplicate" | "invalid_day" | "back_to_back" | "three_in_a_row";

/**
 * Checks a set of training weekdays. With two or three sessions a week there
 * must be a rest day between sessions (Sunday to Monday counts as back to
 * back, because the week repeats). With four, two days in a row is fine but
 * three is not.
 */
export function checkTrainingDays(daysPerWeek: DaysPerWeek, days: readonly number[]): TrainingDaysProblem | null {
  if (days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) return "invalid_day";
  if (new Set(days).size !== days.length) return "duplicate";
  if (days.length !== daysPerWeek) return "wrong_count";
  const on = new Set(days);
  const next = (d: number) => (d % 7) + 1;
  if (daysPerWeek <= 3) {
    if (days.some((d) => on.has(next(d)))) return "back_to_back";
  } else if (days.some((d) => on.has(next(d)) && on.has(next(next(d))))) {
    return "three_in_a_row";
  }
  return null;
}

export const TRAINING_DAYS_MESSAGES: Record<TrainingDaysProblem, string> = {
  wrong_count: "Pick the same number of days as sessions per week.",
  duplicate: "Each day can only be picked once.",
  invalid_day: "Pick days from Monday to Sunday.",
  back_to_back: "Leave at least one rest day between sessions.",
  three_in_a_row: "Avoid training three days in a row. Leave a rest day after two sessions.",
};

export interface CalendarSlot {
  week: number;
  slot: number;
  template: SessionTemplate;
  scheduledOn: IsoDate;
}

/** The dates of programme week `week` (1-based). */
export function weekDates(startedOn: IsoDate, week: number): IsoDate[] {
  const first = addDays(startedOn, (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Programme week containing `date`. Can be below 1 or above the programme length. */
export function weekOf(startedOn: IsoDate, date: IsoDate): number {
  return Math.floor(daysBetween(startedOn, date) / 7) + 1;
}

export function buildCalendarSchedule(
  startedOn: IsoDate,
  daysPerWeek: DaysPerWeek,
  trainingDays: readonly number[],
  weeks = PROGRAMME_WEEKS,
): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  for (let week = 1; week <= weeks; week++) {
    const templates = weekTemplates(daysPerWeek, week);
    const dates = weekDates(startedOn, week).filter((d) => trainingDays.includes(isoWeekday(d)));
    dates.forEach((scheduledOn, slot) => {
      slots.push({ week, slot, template: templates[slot] ?? templates[templates.length - 1], scheduledOn });
    });
  }
  return slots;
}

export interface ExistingSlot {
  week: number;
  slot: number;
  scheduledOn: IsoDate;
  status: "planned" | "completed" | "skipped";
}

/**
 * New sessions after a schedule change. Planned sessions on or after `from`
 * are replaced; completed sessions and anything before `from` stay. In the
 * current week, only the sessions still owed are added, using slot numbers
 * that are free.
 */
export function rescheduleFrom(
  startedOn: IsoDate,
  from: IsoDate,
  daysPerWeek: DaysPerWeek,
  trainingDays: readonly number[],
  existing: readonly ExistingSlot[],
  weeks = PROGRAMME_WEEKS,
): CalendarSlot[] {
  const kept = existing.filter((s) => s.status !== "planned" || s.scheduledOn < from);
  const result: CalendarSlot[] = [];
  const fromWeek = Math.max(1, weekOf(startedOn, from));
  for (let week = fromWeek; week <= weeks; week++) {
    const templates = weekTemplates(daysPerWeek, week);
    const keptThisWeek = kept.filter((s) => s.week === week);
    const usedSlots = new Set(keptThisWeek.map((s) => s.slot));
    const owed = Math.max(0, daysPerWeek - keptThisWeek.length);
    const dates = weekDates(startedOn, week)
      .filter((d) => d >= from && trainingDays.includes(isoWeekday(d)))
      .slice(0, owed);
    let position = keptThisWeek.length;
    for (const scheduledOn of dates) {
      let slot = 0;
      while (usedSlots.has(slot)) slot++;
      usedSlots.add(slot);
      result.push({ week, slot, template: templates[position] ?? templates[templates.length - 1], scheduledOn });
      position++;
    }
  }
  return result;
}
