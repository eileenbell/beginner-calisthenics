import { describe, expect, it } from "vitest";
import {
  firstOpenItem,
  initialState,
  nextSetNumber,
  overallProgress,
  playerReducer,
  restRemaining,
  stageOf,
  type PlayerItem,
  type PlayerState,
} from "./player-state";

const item = (index: number, overrides: Partial<PlayerItem> = {}): PlayerItem => ({
  index,
  block: "main",
  sets: 3,
  measure: "reps",
  perSide: false,
  plannedTarget: 8,
  restSeconds: 60,
  plannedExerciseId: "high_incline_push_up",
  exerciseId: "high_incline_push_up",
  familyId: "push_up",
  ...overrides,
});

const warmup = (index: number) => item(index, { block: "warmup", sets: 1, restSeconds: 0, familyId: null, exerciseId: "arm_circles", plannedExerciseId: "arm_circles" });

function run(state: PlayerState, ...actions: Parameters<typeof playerReducer>[1][]): PlayerState {
  return actions.reduce(playerReducer, state);
}

describe("starting position", () => {
  it("starts at the first item for a new workout", () => {
    const state = initialState([warmup(0), item(1)], {}, {});
    expect(state.current).toBe(0);
    expect(stageOf(state)).toBe("set");
  });

  it("resumes where the user left off after a refresh", () => {
    const state = initialState([warmup(0), item(1), item(2)], { 0: { 1: 10 }, 1: { 1: 8, 2: 8 } }, {});
    expect(state.current).toBe(1);
    expect(nextSetNumber(state, 1)).toBe(3);
  });

  it("asks for feedback if all sets were logged before the refresh", () => {
    const state = initialState([item(0)], { 0: { 1: 8, 2: 8, 3: 8 } }, {});
    expect(stageOf(state)).toBe("feedback");
  });

  it("goes to review when everything is finished", () => {
    const state = initialState([item(0)], { 0: { 1: 8, 2: 8, 3: 8 } }, { 0: { difficulty: "about_right", goodControl: true, skipped: null } });
    expect(state.current).toBe(1);
    expect(stageOf(state)).toBe("review");
  });
});

describe("logging sets", () => {
  it("starts the rest timer between sets", () => {
    const state = run(initialState([item(0)], {}, {}), { type: "logged", itemIndex: 0, setNumber: 1, value: 8, now: 1_000 });
    expect(state.rest).toEqual({ endsAt: 61_000, remaining: 60_000, total: 60_000 });
    expect(nextSetNumber(state, 0)).toBe(2);
    expect(restRemaining(state.rest, 31_000)).toBe(30_000);
  });

  it("ends rest when the timer runs out", () => {
    const state = run(
      initialState([item(0)], {}, {}),
      { type: "logged", itemIndex: 0, setNumber: 1, value: 8, now: 0 },
      { type: "tick", now: 30_000 },
    );
    expect(state.rest).not.toBeNull();
    expect(run(state, { type: "tick", now: 60_000 }).rest).toBeNull();
  });

  it("asks for feedback after the last set of a main exercise, with no rest", () => {
    const state = run(
      initialState([item(0, { sets: 2 }), item(1)], {}, {}),
      { type: "logged", itemIndex: 0, setNumber: 1, value: 8, now: 0 },
      { type: "logged", itemIndex: 0, setNumber: 2, value: 7, now: 70_000 },
    );
    expect(state.rest).toBeNull();
    expect(stageOf(state)).toBe("feedback");
    expect(state.current).toBe(0);
  });

  it("moves straight on after a warm-up", () => {
    const state = run(initialState([warmup(0), item(1)], {}, {}), { type: "logged", itemIndex: 0, setNumber: 1, value: 10, now: 0 });
    expect(state.current).toBe(1);
  });

  it("lets a finished set be corrected without starting rest", () => {
    let state = run(initialState([item(0)], {}, {}), { type: "logged", itemIndex: 0, setNumber: 1, value: 8, now: 0 }, { type: "skipRest" });
    state = run(state, { type: "edit", setNumber: 1 }, { type: "logged", itemIndex: 0, setNumber: 1, value: 6, now: 5_000 });
    expect(state.logs[0][1]).toBe(6);
    expect(state.rest).toBeNull();
    expect(state.editing).toBeNull();
  });
});

describe("pause and resume", () => {
  it("freezes and restores the rest timer", () => {
    let state = run(initialState([item(0)], {}, {}), { type: "logged", itemIndex: 0, setNumber: 1, value: 8, now: 0 });
    state = run(state, { type: "pause", now: 20_000 });
    expect(state.paused).toBe(true);
    expect(restRemaining(state.rest, 500_000)).toBe(40_000);
    expect(run(state, { type: "tick", now: 500_000 }).rest).not.toBeNull();
    state = run(state, { type: "resume", now: 100_000 });
    expect(state.rest?.endsAt).toBe(140_000);
  });

  it("can add time to rest", () => {
    const state = run(
      initialState([item(0)], {}, {}),
      { type: "logged", itemIndex: 0, setNumber: 1, value: 8, now: 0 },
      { type: "addRest", seconds: 15, now: 10_000 },
    );
    expect(restRemaining(state.rest, 10_000)).toBe(65_000);
  });

  it("drops a restored rest that has already ended", () => {
    const state = run(initialState([item(0)], {}, {}), {
      type: "restore",
      rest: { endsAt: 1_000, remaining: 60_000, total: 60_000 },
      paused: false,
      now: 2_000,
    });
    expect(state.rest).toBeNull();
  });
});

describe("feedback, skips and swaps", () => {
  it("moves to the next exercise once feedback is saved", () => {
    const state = run(
      initialState([item(0, { sets: 1 }), item(1)], {}, {}),
      { type: "logged", itemIndex: 0, setNumber: 1, value: 8, now: 0 },
      { type: "feedbackSaved", itemIndex: 0, feedback: { difficulty: "about_right", goodControl: true, skipped: null } },
    );
    expect(state.current).toBe(1);
  });

  it("treats a skipped exercise as finished", () => {
    const state = run(initialState([item(0), item(1)], {}, {}), {
      type: "feedbackSaved",
      itemIndex: 0,
      feedback: { difficulty: null, goodControl: null, skipped: "no_equipment" },
    });
    expect(state.current).toBe(1);
    expect(overallProgress(state)).toEqual({ done: 3, total: 6 });
  });

  it("clears an exercise's sets when it is swapped", () => {
    const state = run(
      initialState([item(0)], {}, {}),
      { type: "logged", itemIndex: 0, setNumber: 1, value: 4, now: 0 },
      { type: "swapped", itemIndex: 0, exerciseId: "wall_push_up" },
    );
    expect(state.items[0].exerciseId).toBe("wall_push_up");
    expect(state.logs[0]).toBeUndefined();
    expect(state.rest).toBeNull();
    expect(nextSetNumber(state, 0)).toBe(1);
  });

  it("comes back to an exercise that was left unfinished", () => {
    let state = initialState([item(0), item(1, { sets: 1 })], {}, {});
    state = run(state, { type: "goto", index: 1 }, { type: "logged", itemIndex: 1, setNumber: 1, value: 8, now: 0 });
    state = run(state, { type: "feedbackSaved", itemIndex: 1, feedback: { difficulty: "about_right", goodControl: true, skipped: null } });
    expect(state.current).toBe(0);
    expect(firstOpenItem(state)).toBe(0);
  });
});
