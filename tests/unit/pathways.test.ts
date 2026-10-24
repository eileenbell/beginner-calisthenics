import { describe, expect, it } from "vitest";
import type { FamilyId, FamilyState } from "@/domain";
import { PATHWAYS, pathwayView, shortStageName } from "@/features/training/pathways";

const NOW = new Date("2026-11-10T00:00:00Z");
const def = (id: string) => PATHWAYS.find((p) => p.id === id)!;

function input(overrides: Partial<Parameters<typeof pathwayView>[1]> = {}) {
  return {
    states: new Map<FamilyId, FamilyState>(),
    achieved: new Set<string>(),
    painEvents: [],
    equipment: ["none"] as const,
    goals: ["first_push_up"] as const,
    now: NOW,
    ...overrides,
  } as Parameters<typeof pathwayView>[1];
}

const state = (familyId: FamilyId, exerciseId: string, extra: Partial<FamilyState> = {}): FamilyState => ({
  familyId,
  exerciseId,
  target: 8,
  successStreak: 0,
  difficultStreak: 0,
  painReports: [],
  paused: false,
  ...extra,
});

describe("skill pathways", () => {
  it("places the user on their current ladder stage", () => {
    const view = pathwayView(def("push_up_mastery"), input({ states: new Map([["push_up", state("push_up", "high_incline_push_up", { successStreak: 1 })]]) }));
    expect(view.status).toBe("focus");
    expect(view.currentStage).toBe(2);
    expect(view.stages.map((s) => s.status)).toEqual(["done", "current", "next", "upcoming", "upcoming"]);
    expect(view.readiness).toEqual({ streak: 1, needed: 2 });
  });

  it("keeps handstand work locked until its prerequisites are met", () => {
    const locked = pathwayView(def("handstand_prep"), input({ states: new Map([["handstand", state("handstand", "pike_hold_on_step")]]) }));
    expect(locked.status).toBe("locked");
    expect(locked.current).toBeNull();
    expect(locked.stages.every((s) => s.status === "upcoming")).toBe(true);

    const ready = pathwayView(def("handstand_prep"), input({ achieved: new Set(["push_floor_5", "core_plank_45"]), states: new Map([["handstand", state("handstand", "pike_hold_on_step")]]) }));
    expect(ready.status).not.toBe("locked");
  });

  it("re-locks a gated pathway after recent related pain", () => {
    const view = pathwayView(
      def("handstand_prep"),
      input({ achieved: new Set(["push_floor_5", "core_plank_45"]), painEvents: [{ familyId: "push_up", at: "2026-11-05T00:00:00Z" }] }),
    );
    expect(view.status).toBe("locked");
  });

  it("says when equipment is missing rather than pretending progress", () => {
    const view = pathwayView(def("first_pull_up"), input({ equipment: ["none", "mat"] }));
    expect(view.status).toBe("needs_equipment");
    expect(view.statusReason).toMatch(/pull-up bar/);
  });

  it("shows a paused family as paused", () => {
    const view = pathwayView(def("squat_control"), input({ states: new Map([["squat", state("squat", "box_squat", { paused: true })]]) }));
    expect(view.status).toBe("paused");
  });

  it("shortens stage names for compact trajectories", () => {
    expect(shortStageName("High incline push-up")).toBe("High incline");
    expect(shortStageName("Dead hang")).toBe("Dead hang");
    expect(shortStageName("Wall push-up")).toBe("Wall push-up");
    expect(shortStageName("Push-up")).toBe("Push-up");
  });
});
