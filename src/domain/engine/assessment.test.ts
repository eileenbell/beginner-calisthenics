import { describe, expect, it } from "vitest";
import { initialLevels, initialStates } from "./assessment";
import { newMilestones, skillReadiness } from "./milestones";
import { SKILLS_BY_ID } from "../content/skills";

describe("baseline assessment", () => {
  it("defaults a skipped assessment to the easiest steps for complete beginners", () => {
    const levels = initialLevels("complete_beginner", {}, []);
    for (const value of Object.values(levels)) expect(value.level).toBe(1);
  });

  it("starts gym users a little further along when they skip", () => {
    const levels = initialLevels("gym_new_to_calisthenics", {}, []);
    expect(levels.push_up.level).toBe(3);
    expect(levels.squat.level).toBe(3);
  });

  it("places someone who manages 3 high-incline push-ups at the wall", () => {
    const levels = initialLevels("some_fitness", { push: { variation: "high_incline", reps: 3 } }, []);
    expect(levels.push_up.level).toBe(1);
  });

  it("keeps the variation and sets a sub-maximal target for 5-11 reps", () => {
    const states = initialStates("complete_beginner", { push: { variation: "mid_incline", reps: 9 } }, []);
    const push = states.find((s) => s.familyId === "push_up")!;
    expect(push.exerciseId).toBe("mid_incline_push_up");
    expect(push.target).toBe(7);
  });

  it("moves up a step for 12+ reps but never past the floor push-up from the test", () => {
    expect(initialLevels("complete_beginner", { push: { variation: "low_incline", reps: 14 } }, []).push_up.level).toBe(5);
    expect(initialLevels("complete_beginner", { push: { variation: "floor", reps: 20 } }, []).push_up.level).toBe(5);
  });

  it("ignores pull tests when the user has nothing to hang from", () => {
    const levels = initialLevels("complete_beginner", { hangSeconds: 60, pullUps: 5 }, []);
    expect(levels.pull_up.level).toBe(1);
  });

  it("starts people who can already do pull-ups at the pull-up", () => {
    const states = initialStates("complete_beginner", { hangSeconds: 40, pullUps: 3 }, ["pullup_bar"]);
    const pull = states.find((s) => s.familyId === "pull_up")!;
    expect(pull.exerciseId).toBe("pull_up");
    expect(pull.target).toBe(2);
  });

  it("lowers every level by one when confidence is low", () => {
    const levels = initialLevels("gym_new_to_calisthenics", { confidence: 1 }, []);
    expect(levels.push_up.level).toBe(2);
    expect(levels.plank.level).toBe(2);
  });

  it("maps plank time to plank and hollow starting points", () => {
    expect(initialLevels("complete_beginner", { plankSeconds: 0 }, []).plank.level).toBe(1);
    expect(initialLevels("complete_beginner", { plankSeconds: 20 }, []).plank.level).toBe(2);
    const strong = initialLevels("complete_beginner", { plankSeconds: 75 }, []);
    expect(strong.plank.level).toBe(3);
    expect(strong.hollow.level).toBe(3);
  });
});

describe("milestones", () => {
  it("awards the first floor push-up and earlier same-exercise milestones together", () => {
    const earned = newMilestones(
      [{ exerciseId: "floor_push_up", sets: [{ reps: 5 }, { reps: 4 }], feedback: "about_right", goodControl: true }],
      new Set(),
    );
    expect(earned).toEqual(expect.arrayContaining(["push_first_floor", "push_floor_5"]));
    expect(earned).not.toContain("push_floor_10");
  });

  it("never awards a milestone for a set logged with pain or poor control", () => {
    expect(newMilestones([{ exerciseId: "floor_push_up", sets: [{ reps: 5 }], feedback: "pain", goodControl: true }], new Set())).toEqual([]);
    expect(newMilestones([{ exerciseId: "floor_push_up", sets: [{ reps: 5 }], feedback: "about_right", goodControl: false }], new Set())).toEqual([]);
  });

  it("requires all sets for multi-set milestones", () => {
    const two = newMilestones([{ exerciseId: "wall_push_up", sets: [{ reps: 12 }, { reps: 12 }], feedback: "about_right", goodControl: true }], new Set());
    expect(two).not.toContain("push_wall_3x12");
    const three = newMilestones([{ exerciseId: "wall_push_up", sets: [{ reps: 12 }, { reps: 12 }, { reps: 13 }], feedback: "about_right", goodControl: true }], new Set());
    expect(three).toContain("push_wall_3x12");
  });

  it("keeps handstand preparation locked until prerequisites are met and pain-free", () => {
    const skill = SKILLS_BY_ID.get("handstand_prep")!;
    const now = new Date("2026-10-24T00:00:00Z");
    expect(skillReadiness(skill, new Set(), [], [], now).unlocked).toBe(false);
    const ready = new Set(["push_floor_5", "core_plank_45"]);
    expect(skillReadiness(skill, ready, [], [], now).unlocked).toBe(true);
    expect(skillReadiness(skill, ready, [{ familyId: "push_up", at: "2026-10-10T00:00:00Z" }], [], now).unlocked).toBe(false);
    expect(skillReadiness(skill, ready, [{ familyId: "push_up", at: "2026-08-10T00:00:00Z" }], [], now).unlocked).toBe(true);
  });
});
