import { describe, expect, it } from "vitest";
import {
  addDays,
  buildCalendarSchedule,
  checkTrainingDays,
  isIsoDate,
  isoWeekday,
  localDate,
  rescheduleFrom,
  suggestTrainingDays,
  weekDates,
  weekOf,
} from "./calendar";

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isIsoDate("2026-10-24")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("24/10/2026")).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("gives ISO weekdays", () => {
    expect(isoWeekday("2026-10-24")).toBe(6); // Saturday
    expect(isoWeekday("2026-10-25")).toBe(7); // Sunday
    expect(isoWeekday("2026-10-26")).toBe(1); // Monday
  });

  it("uses the user's time zone for today", () => {
    // 2026-10-24 20:00 UTC is already Sunday morning in Sydney.
    const now = new Date("2026-10-24T20:00:00Z");
    expect(localDate(now, "Australia/Sydney")).toBe("2026-10-25");
    expect(localDate(now, "America/Los_Angeles")).toBe("2026-10-24");
    expect(localDate(now, "Not/AZone")).toBe("2026-10-24");
  });
});

describe("training days", () => {
  it("suggests spaced days starting today", () => {
    expect(suggestTrainingDays(3, 1)).toEqual([1, 3, 5]);
    expect(suggestTrainingDays(3, 6)).toEqual([1, 3, 6]); // Sat, Mon, Wed
    expect(suggestTrainingDays(2, 4)).toEqual([4, 7]);
    expect(suggestTrainingDays(4, 1)).toEqual([1, 2, 4, 5]);
  });

  it("accepts every suggestion", () => {
    for (const days of [2, 3, 4] as const) {
      for (let start = 1; start <= 7; start++) {
        expect(checkTrainingDays(days, suggestTrainingDays(days, start as 1))).toBeNull();
      }
    }
  });

  it("needs a rest day between sessions at two or three a week", () => {
    expect(checkTrainingDays(3, [1, 2, 5])).toBe("back_to_back");
    expect(checkTrainingDays(3, [1, 3, 7])).toBe("back_to_back"); // Sunday then Monday
    expect(checkTrainingDays(2, [2, 5])).toBeNull();
  });

  it("allows pairs but not three in a row at four a week", () => {
    expect(checkTrainingDays(4, [1, 2, 4, 5])).toBeNull();
    expect(checkTrainingDays(4, [1, 2, 3, 5])).toBe("three_in_a_row");
    expect(checkTrainingDays(4, [1, 2, 6, 7])).toBe("three_in_a_row"); // Sat, Sun, Mon
  });

  it("rejects wrong counts and bad values", () => {
    expect(checkTrainingDays(3, [1, 3])).toBe("wrong_count");
    expect(checkTrainingDays(2, [1, 1])).toBe("duplicate");
    expect(checkTrainingDays(2, [0, 3])).toBe("invalid_day");
  });
});

describe("calendar schedule", () => {
  it("puts each chosen weekday in every programme week", () => {
    const schedule = buildCalendarSchedule("2026-10-24", 3, [1, 3, 6]);
    expect(schedule).toHaveLength(36);
    const week1 = schedule.filter((s) => s.week === 1);
    expect(week1.map((s) => s.scheduledOn)).toEqual(["2026-10-24", "2026-10-26", "2026-10-28"]);
    expect(week1.map((s) => s.template)).toEqual(["A", "B", "A"]);
    expect(schedule.filter((s) => s.week === 2).map((s) => s.template)).toEqual(["B", "A", "B"]);
    for (const s of schedule) {
      expect(weekDates("2026-10-24", s.week)).toContain(s.scheduledOn);
    }
  });

  it("alternates upper and lower at four a week", () => {
    const week1 = buildCalendarSchedule("2026-10-26", 4, [1, 2, 4, 5]).filter((s) => s.week === 1);
    expect(week1.map((s) => s.template)).toEqual(["U", "L", "U", "L"]);
  });

  it("finds the programme week for a date", () => {
    expect(weekOf("2026-10-24", "2026-10-24")).toBe(1);
    expect(weekOf("2026-10-24", "2026-10-30")).toBe(1);
    expect(weekOf("2026-10-24", "2026-10-31")).toBe(2);
    expect(weekOf("2026-10-24", "2026-10-23")).toBe(0);
  });
});

describe("rescheduling", () => {
  const start = "2026-10-24"; // Saturday
  const original = buildCalendarSchedule(start, 3, [1, 3, 6]);

  it("keeps completed sessions and only adds what the week still owes", () => {
    const existing = original.map((s) => ({
      week: s.week,
      slot: s.slot,
      scheduledOn: s.scheduledOn,
      status: s.scheduledOn < "2026-10-27" ? ("completed" as const) : ("planned" as const),
    }));
    // Change to Tue/Thu/Sat from Tuesday 27 October.
    const next = rescheduleFrom(start, "2026-10-27", 3, [2, 4, 6], existing);
    const week1 = next.filter((s) => s.week === 1);
    // Two sessions already done in week 1 (Sat, Mon), so one more: Tuesday 27th.
    expect(week1.map((s) => s.scheduledOn)).toEqual(["2026-10-27"]);
    expect(week1[0].slot).toBe(2);
    expect(next.filter((s) => s.week === 2)).toHaveLength(3);
    expect(next.every((s) => s.scheduledOn >= "2026-10-27")).toBe(true);
  });

  it("does not add sessions to a week that is already full", () => {
    const existing = original
      .filter((s) => s.week === 1)
      .map((s) => ({ ...s, status: "completed" as const }));
    const next = rescheduleFrom(start, "2026-10-29", 2, [4, 7], existing);
    expect(next.filter((s) => s.week === 1)).toHaveLength(0);
    expect(next.filter((s) => s.week === 2).map((s) => s.template)).toEqual(["A", "B"]);
  });
});
