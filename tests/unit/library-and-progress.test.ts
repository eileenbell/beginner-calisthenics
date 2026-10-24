import { describe, expect, it } from "vitest";
import { EXERCISES, getExercise, isAvailable } from "@/domain";
import { exerciseGroup, filterExercises, libraryHref, parseLibraryQuery, relatedPathway } from "@/features/exercises/library";
import { cadence, improvements, parseRange, rangeStart, totals, type LoggedSet } from "@/features/training/progress";
import { allowedSwaps } from "@/features/workout/swaps";
import { safeNextPath } from "@/lib/safe-path";
import type { ScheduledWorkoutRow } from "@/server/rows";

const ctx = { equipment: ["none"] as const, saved: new Set<string>() };

describe("exercise library", () => {
  it("lists every exercise by default", () => {
    expect(filterExercises({}, { ...ctx, equipment: ["none"] })).toHaveLength(EXERCISES.length);
  });

  it("filters by group, equipment and search words", () => {
    const pull = filterExercises({ group: "pull" }, { ...ctx, equipment: ["none"] });
    expect(pull.length).toBeGreaterThan(0);
    expect(pull.every((e) => exerciseGroup(e) === "pull")).toBe(true);

    const mine = filterExercises({ mine: true }, { ...ctx, equipment: ["none"] });
    expect(mine.every((e) => isAvailable(e, ["none"]))).toBe(true);
    expect(mine.some((e) => e.id === "dead_hang")).toBe(false);

    const search = filterExercises({ q: "incline push" }, { ...ctx, equipment: ["none"] });
    expect(search.map((e) => e.id)).toContain("high_incline_push_up");
    expect(search.every((e) => /incline/i.test(e.name) || e.primaryMuscles.length > 0)).toBe(true);
  });

  it("shows only saved exercises on the saved tab", () => {
    const saved = filterExercises({ group: "saved" }, { equipment: ["none"], saved: new Set(["glute_bridge"]) });
    expect(saved.map((e) => e.id)).toEqual(["glute_bridge"]);
  });

  it("sanitises the query string", () => {
    expect(parseLibraryQuery({ group: "nonsense", q: "  plank ", mine: "1" })).toEqual({ group: "all", q: "plank", mine: true });
    expect(parseLibraryQuery({ q: "x".repeat(200) }).q).toHaveLength(60);
    expect(libraryHref({ group: "core", mine: true })).toBe("/exercises?group=core&mine=1");
  });

  it("links ladder exercises to their skill pathway", () => {
    expect(relatedPathway(getExercise("wall_push_up"))?.id).toBe("push_up_mastery");
    expect(relatedPathway(getExercise("arm_circles"))).toBeNull();
  });
});

describe("mid-workout swaps", () => {
  it("never offers anything harder than the planned exercise", () => {
    for (const e of EXERCISES.filter((x) => x.familyId)) {
      for (const option of allowedSwaps(e.id, e.id, ["none", "mat", "bands", "pullup_bar", "low_bar", "parallel_bars", "rings", "gym"])) {
        expect(option.level).toBeLessThanOrEqual(e.level);
      }
    }
  });

  it("offers a way back to the planned exercise after swapping", () => {
    const options = allowedSwaps("high_incline_push_up", "wall_push_up", ["none"]);
    expect(options.map((e) => e.id)).toContain("high_incline_push_up");
    expect(options.map((e) => e.id)).not.toContain("wall_push_up");
  });

  it("only offers options the user has equipment for", () => {
    for (const option of allowedSwaps("bodyweight_squat", "bodyweight_squat", ["none"])) expect(isAvailable(option, ["none"])).toBe(true);
  });
});

describe("progress", () => {
  const set = (sessionId: string, exerciseId: string, reps: number, date: string): LoggedSet => ({
    sessionId,
    exerciseId,
    reps,
    seconds: null,
    date,
    completedAt: `${date}T08:00:00Z`,
  });

  it("compares the best set of the first workout with the best since", () => {
    const sets = [
      set("a", "high_incline_push_up", 6, "2026-10-26"),
      set("a", "high_incline_push_up", 5, "2026-10-26"),
      set("b", "high_incline_push_up", 8, "2026-10-28"),
      set("c", "high_incline_push_up", 7, "2026-10-30"),
      set("a", "arm_circles", 10, "2026-10-26"),
      set("b", "arm_circles", 12, "2026-10-28"),
      set("a", "glute_bridge", 10, "2026-10-26"),
    ];
    const result = improvements(sets);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ exerciseId: "high_incline_push_up", first: 6, best: 8, latest: 7, sessions: 3 });
  });

  it("totals only what was logged", () => {
    expect(totals([set("a", "glute_bridge", 10, "2026-10-26"), { ...set("a", "forearm_plank", 0, "2026-10-26"), reps: null, seconds: 20 }], 1)).toEqual({
      workouts: 1,
      sets: 2,
      reps: 10,
      seconds: 20,
    });
  });

  it("works out range starts in the user's calendar", () => {
    expect(rangeStart("30", "2026-11-30")).toBe("2026-11-01");
    expect(rangeStart("all", "2026-11-30")).toBeNull();
    expect(parseRange("bogus")).toBe("30");
  });

  it("builds a four-week consistency grid from the schedule", () => {
    const row = (week: number, date: string, status: ScheduledWorkoutRow["status"]): ScheduledWorkoutRow => ({
      id: date,
      programme_id: "p",
      week,
      slot: 0,
      template: "A",
      scheduled_on: date,
      status,
      completed_at: null,
    });
    const schedule = [row(1, "2026-10-26", "completed"), row(1, "2026-10-28", "planned"), row(2, "2026-11-02", "planned")];
    const grid = cadence(schedule, "2026-10-26", 2, 12, "2026-11-02");
    expect(grid.map((w) => w.week)).toEqual([1, 2]);
    expect(grid[0].days.map((d) => d.kind)).toEqual(["done", "rest", "missed", "rest", "rest", "rest", "rest"]);
    expect(grid[1].days[0]).toMatchObject({ kind: "planned", isToday: true });
    expect(grid[0]).toMatchObject({ completed: 1, planned: 2 });
  });
});

describe("redirect safety", () => {
  it.each([
    ["/today", "/today"],
    ["/workout/abc?x=1", "/workout/abc?x=1"],
    ["//evil.example", "/today"],
    ["/\\evil.example", "/today"],
    ["https://evil.example", "/today"],
    ["/ok\r\nSet-Cookie: x", "/today"],
    [null, "/today"],
  ])("safeNextPath(%j) is %j", (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });
});
