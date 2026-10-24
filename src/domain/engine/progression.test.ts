import { describe, expect, it } from "vitest";
import type { ExposureResult, FamilyState } from "../types";
import { evaluateExposure, resumeFamily } from "./progression";

const NOW = new Date("2026-10-24T08:00:00Z");
const NO_EQUIPMENT = { now: NOW, equipment: [] as const };

function state(overrides: Partial<FamilyState> = {}): FamilyState {
  return {
    familyId: "push_up",
    exerciseId: "high_incline_push_up",
    target: 8,
    successStreak: 0,
    difficultStreak: 0,
    painReports: [],
    paused: false,
    ...overrides,
  };
}

function result(overrides: Partial<ExposureResult> = {}): ExposureResult {
  return {
    exerciseId: "high_incline_push_up",
    prescribedSets: 3,
    target: 8,
    sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }],
    feedback: "about_right",
    goodControl: true,
    ...overrides,
  };
}

const reps = (...n: number[]) => n.map((r) => ({ reps: r }));

describe("progressing", () => {
  it("raises the target when every set hits it with good control", () => {
    const { decision, state: next } = evaluateExposure(state(), result(), NO_EQUIPMENT);
    expect(decision.kind).toBe("increase_target");
    expect(next.target).toBe(10); // range 6-12, step 2
    expect(next.exerciseId).toBe("high_incline_push_up");
  });

  it("raises the target by two steps when rated too easy", () => {
    const { state: next } = evaluateExposure(state(), result({ feedback: "too_easy" }), NO_EQUIPMENT);
    expect(next.target).toBe(12);
  });

  it("does not change variation after a single top-of-range session rated about right", () => {
    const s = state({ target: 12 });
    const { decision, state: next } = evaluateExposure(s, result({ target: 12, sets: reps(12, 12, 12) }), NO_EQUIPMENT);
    expect(decision.kind).toBe("hold");
    expect(next.successStreak).toBe(1);
    expect(next.exerciseId).toBe("high_incline_push_up");
    expect(decision.reason).toMatch(/one more session/i);
  });

  it("moves to the next variation after two consecutive top-of-range sessions", () => {
    const s = state({ target: 12, successStreak: 1 });
    const { decision, state: next } = evaluateExposure(s, result({ target: 12, sets: reps(12, 12, 12) }), NO_EQUIPMENT);
    expect(decision.kind).toBe("progress");
    expect(next.exerciseId).toBe("mid_incline_push_up");
    expect(next.target).toBe(6);
    expect(next.successStreak).toBe(0);
  });

  it("progresses after one top-of-range session rated too easy", () => {
    const s = state({ target: 12 });
    const { decision } = evaluateExposure(s, result({ target: 12, sets: reps(12, 12, 12), feedback: "too_easy" }), NO_EQUIPMENT);
    expect(decision.kind).toBe("progress");
  });

  it("never progresses just because the workout was completed", () => {
    const s = state({ target: 12, successStreak: 1 });
    const { decision } = evaluateExposure(
      s,
      result({ target: 12, sets: reps(12, 12, 12), feedback: null, goodControl: null }),
      NO_EQUIPMENT,
    );
    expect(decision.kind).toBe("hold");
  });

  it("requires confirmed good control before moving up", () => {
    const s = state({ target: 12, successStreak: 1 });
    const poor = evaluateExposure(s, result({ target: 12, sets: reps(12, 12, 12), goodControl: false }), NO_EQUIPMENT);
    expect(poor.decision.kind).toBe("hold");
    expect(poor.state.successStreak).toBe(0);
    const unknown = evaluateExposure(s, result({ target: 12, sets: reps(12, 12, 12), goodControl: null }), NO_EQUIPMENT);
    expect(unknown.decision.kind).toBe("hold");
  });

  it("holds at the top of a ladder instead of inventing a harder exercise", () => {
    const s = state({ exerciseId: "feet_elevated_push_up", target: 10, successStreak: 1 });
    const { decision, state: next } = evaluateExposure(
      s,
      result({ exerciseId: "feet_elevated_push_up", target: 10, sets: reps(10, 10, 10), feedback: "too_easy" }),
      NO_EQUIPMENT,
    );
    expect(decision.kind).toBe("hold");
    expect(next.exerciseId).toBe("feet_elevated_push_up");
    expect(decision.reason).toMatch(/top of the push-up path/i);
  });

  it("holds when some sets miss the target", () => {
    const { decision } = evaluateExposure(state(), result({ sets: reps(8, 8, 7) }), NO_EQUIPMENT);
    expect(decision.kind).toBe("hold");
  });
});

describe("too difficult and could not finish", () => {
  it("holds on the first 'too difficult' and steps down on the second", () => {
    const first = evaluateExposure(state({ target: 10 }), result({ target: 10, sets: reps(10, 10, 10), feedback: "too_difficult" }), NO_EQUIPMENT);
    expect(first.decision.kind).toBe("hold");
    expect(first.state.difficultStreak).toBe(1);
    const second = evaluateExposure(first.state, result({ target: 10, sets: reps(10, 10, 10), feedback: "too_difficult" }), NO_EQUIPMENT);
    expect(second.decision.kind).toBe("decrease_target");
    expect(second.state.target).toBe(8);
  });

  it("lowers the target when the user couldn't finish above the minimum", () => {
    const { decision, state: next } = evaluateExposure(
      state({ target: 10 }),
      result({ target: 10, sets: reps(10, 9, 7), feedback: "could_not_finish" }),
      NO_EQUIPMENT,
    );
    expect(decision.kind).toBe("decrease_target");
    expect(next.target).toBe(8);
  });

  it("regresses the variation when most sets fall below the range", () => {
    const { decision, state: next } = evaluateExposure(
      state({ target: 6 }),
      result({ target: 6, sets: reps(4, 3, 3), feedback: "could_not_finish" }),
      NO_EQUIPMENT,
    );
    expect(decision.kind).toBe("regress");
    expect(next.exerciseId).toBe("wall_push_up");
    // Regressed exercises start mid-range so the user isn't sent back to the very bottom.
    expect(next.target).toBe(12);
  });

  it("treats missing sets as below the range", () => {
    const { decision } = evaluateExposure(
      state({ target: 6 }),
      result({ target: 6, sets: reps(6), feedback: "could_not_finish" }),
      NO_EQUIPMENT,
    );
    expect(decision.kind).toBe("regress");
  });

  it("keeps the first exercise at its minimum when there's nothing easier", () => {
    const s = state({ exerciseId: "wall_push_up", target: 8 });
    const { decision, state: next } = evaluateExposure(
      s,
      result({ exerciseId: "wall_push_up", target: 8, sets: reps(3, 2, 2), feedback: "could_not_finish" }),
      NO_EQUIPMENT,
    );
    expect(decision.kind).toBe("hold");
    expect(next.exerciseId).toBe("wall_push_up");
    expect(next.target).toBe(8);
  });

  it("treats a 'too hard' skip as could not finish", () => {
    const { decision } = evaluateExposure(state({ target: 6 }), result({ target: 6, sets: [], feedback: null, skipped: "too_hard" }), NO_EQUIPMENT);
    expect(decision.kind).toBe("regress");
  });
});

describe("pain and discomfort", () => {
  it("swaps to an easier option after a first pain report", () => {
    const { decision, state: next } = evaluateExposure(state(), result({ feedback: "pain" }), NO_EQUIPMENT);
    expect(decision.kind).toBe("pain_swap");
    expect(next.exerciseId).toBe("wall_push_up");
    expect(next.painReports).toHaveLength(1);
    expect(next.paused).toBe(false);
    expect(decision.reason).toMatch(/health professional/i);
  });

  it("pain overrides otherwise perfect performance", () => {
    const s = state({ target: 12, successStreak: 1 });
    const { decision } = evaluateExposure(s, result({ target: 12, sets: reps(12, 12, 12), feedback: "pain", goodControl: true }), NO_EQUIPMENT);
    expect(decision.kind).toBe("pain_swap");
  });

  it("a skip with reason pain counts as a pain report", () => {
    const { decision } = evaluateExposure(state(), result({ sets: [], feedback: null, skipped: "pain" }), NO_EQUIPMENT);
    expect(decision.kind).toBe("pain_swap");
  });

  it("pauses the family after two pain reports within 14 days", () => {
    const s = state({ painReports: ["2026-10-17T08:00:00Z"] });
    const { decision, state: next } = evaluateExposure(s, result({ feedback: "pain" }), NO_EQUIPMENT);
    expect(decision.kind).toBe("pain_pause");
    expect(next.paused).toBe(true);
    expect(decision.reason).toMatch(/GP or physiotherapist/);
  });

  it("does not pause when the earlier report is older than 14 days", () => {
    const s = state({ painReports: ["2026-10-01T08:00:00Z"] });
    const { decision } = evaluateExposure(s, result({ feedback: "pain" }), NO_EQUIPMENT);
    expect(decision.kind).toBe("pain_swap");
  });

  it("forgets pain reports after 30 days", () => {
    const s = state({ painReports: ["2026-09-01T08:00:00Z"] });
    const { state: next } = evaluateExposure(s, result(), NO_EQUIPMENT);
    expect(next.painReports).toEqual([]);
  });

  it("resuming clears the pause without changing the exercise", () => {
    const resumed = resumeFamily(state({ paused: true, exerciseId: "wall_push_up" }));
    expect(resumed.paused).toBe(false);
    expect(resumed.exerciseId).toBe("wall_push_up");
  });
});

describe("skips, swaps and equipment", () => {
  it("does not change anything after a skip for time or equipment", () => {
    for (const reason of ["short_on_time", "no_equipment", "other"] as const) {
      const { decision, state: next } = evaluateExposure(state(), result({ sets: [], feedback: null, skipped: reason }), NO_EQUIPMENT);
      expect(decision.kind).toBe("no_change");
      expect(next.exerciseId).toBe("high_incline_push_up");
      expect(next.target).toBe(8);
    }
  });

  it("follows the user when they chose an easier variation mid-session", () => {
    const { decision, state: next } = evaluateExposure(
      state(),
      result({ exerciseId: "wall_push_up", target: 10, sets: reps(10, 10, 10) }),
      NO_EQUIPMENT,
    );
    expect(decision.kind).toBe("regress");
    expect(next.exerciseId).toBe("wall_push_up");
  });

  it("only progresses into exercises the user has equipment for", () => {
    const s: FamilyState = {
      familyId: "pull_up",
      exerciseId: "scapular_pull_up",
      target: 10,
      successStreak: 1,
      difficultStreak: 0,
      painReports: [],
      paused: false,
    };
    const { state: next } = evaluateExposure(
      s,
      result({ exerciseId: "scapular_pull_up", target: 10, sets: reps(10, 10, 10) }),
      { now: NOW, equipment: ["pullup_bar"] },
    );
    expect(next.exerciseId).toBe("flexed_arm_hang");
  });

  it("handles timed holds in seconds", () => {
    const s: FamilyState = { ...state(), familyId: "plank", exerciseId: "forearm_plank", target: 20 };
    const { decision, state: next } = evaluateExposure(
      s,
      { exerciseId: "forearm_plank", prescribedSets: 2, target: 20, sets: [{ seconds: 22 }, { seconds: 20 }], feedback: "about_right", goodControl: true },
      NO_EQUIPMENT,
    );
    expect(decision.kind).toBe("increase_target");
    expect(next.target).toBe(25);
    expect(decision.reason).toMatch(/20 s/);
  });
});
