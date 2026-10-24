import { describe, expect, it } from "vitest";
import { EXERCISES, EXERCISES_BY_ID } from "./exercises";
import { FAMILIES } from "./families";
import { LATER_SKILLS, ROADMAPS } from "./roadmaps";
import { ACHIEVEMENTS, MILESTONES, SKILLS } from "./skills";
import { GOALS, isSkillGoal } from "../types";
import { availableAtLevel, rangeOf } from "../engine/catalogue";

describe("exercise catalogue", () => {
  it("has unique ids and a manageable beginner-sized library", () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    expect(EXERCISES.length).toBeGreaterThanOrEqual(40);
    expect(EXERCISES.length).toBeLessThanOrEqual(90);
  });

  it.each(EXERCISES.map((e) => [e.id, e] as const))("%s has complete, beginner-readable content", (_id, e) => {
    expect(e.name.length).toBeGreaterThan(2);
    expect(e.why.length).toBeGreaterThan(20);
    expect(e.setup.length).toBeGreaterThan(0);
    expect(e.steps.length).toBeGreaterThan(0);
    expect(e.breathing.length).toBeGreaterThan(5);
    expect(e.goodControl.length).toBeGreaterThan(10);
    expect(e.cues.length).toBeGreaterThan(0);
    expect(e.cues.length).toBeLessThanOrEqual(2);
    expect(e.mistakes.length).toBeGreaterThan(0);
    expect(e.safety.length).toBeGreaterThan(0);
    const [min, max] = rangeOf(e);
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThanOrEqual(min);
    expect(e.dosage.sets[0]).toBeLessThanOrEqual(e.dosage.sets[1]);
    for (const alt of e.alternatives) expect(EXERCISES_BY_ID.has(alt)).toBe(true);
  });

  it("never claims professional review that hasn't happened", () => {
    for (const e of EXERCISES) expect(e.validation.status).not.toBe("professional_review");
  });

  it("every exercise cites at least one source from SOURCES.md", () => {
    for (const e of EXERCISES) {
      expect(e.validation.sources.length).toBeGreaterThan(0);
      for (const s of e.validation.sources) expect(s).toMatch(/^S\d+$/);
    }
  });

  it("uses no improvised anchors (doors, door frames, tables, towels in doors)", () => {
    const banned = /(door frame|doorframe|door anchor|under a table|table row|towel in a door|towel row)/i;
    for (const e of EXERCISES) {
      const text = [e.why, ...e.setup, ...e.steps, ...e.safety, e.surfaces ?? ""].join(" ");
      expect(text, e.id).not.toMatch(banned);
    }
  });
});

describe("progression families", () => {
  it.each(FAMILIES.map((f) => [f.id, f] as const))("%s ladder is ordered and consistent", (_id, family) => {
    family.ladder.forEach((id, index) => {
      const e = EXERCISES_BY_ID.get(id);
      expect(e, id).toBeDefined();
      expect(e!.familyId).toBe(family.id);
      expect(e!.level).toBe(index + 1);
      expect(e!.isLadderStep).toBe(true);
    });
    const members = EXERCISES.filter((e) => e.familyId === family.id);
    for (const m of members) {
      if (!family.ladder.includes(m.id)) {
        expect(m.isLadderStep, m.id).toBe(false);
        expect(m.level).toBeGreaterThanOrEqual(1);
        expect(m.level).toBeLessThanOrEqual(family.ladder.length);
      }
    }
    // Difficulty never goes backwards up the ladder.
    const difficulties = family.ladder.map((id) => EXERCISES_BY_ID.get(id)!.difficulty);
    expect([...difficulties].sort((a, b) => a - b)).toEqual(difficulties);
  });

  it("alternatives sit in the same family at the same level", () => {
    for (const e of EXERCISES) {
      for (const altId of e.alternatives) {
        const alt = EXERCISES_BY_ID.get(altId)!;
        expect(alt.familyId).toBe(e.familyId);
        expect(alt.level).toBe(e.level);
      }
    }
  });

  it("fallback families exist and terminate in a no-equipment option", () => {
    for (const family of FAMILIES) {
      let current: typeof family | undefined = family;
      const seen = new Set<string>();
      while (current?.fallbackFamily) {
        expect(seen.has(current.id)).toBe(false);
        seen.add(current.id);
        current = FAMILIES.find((f) => f.id === current!.fallbackFamily);
        expect(current).toBeDefined();
      }
    }
    // Row falls back to no-equipment upper back work.
    expect(availableAtLevel("upper_back_floor", 1, []).length).toBeGreaterThan(0);
  });

  it("the push-up path starts at the wall and needs no equipment", () => {
    const push = FAMILIES.find((f) => f.id === "push_up")!;
    expect(push.ladder[0]).toBe("wall_push_up");
    for (const id of push.ladder) expect(EXERCISES_BY_ID.get(id)!.equipmentAnyOf).toEqual([]);
  });

  it("no dips appear before the dip preparation path, and full dips are not included", () => {
    expect(EXERCISES.some((e) => /^dip$|full dip|bench dip/i.test(e.name))).toBe(false);
  });
});

describe("skills and achievements", () => {
  it("milestones reference real exercises and are ordered", () => {
    for (const skill of SKILLS) {
      skill.milestones.forEach((m, i) => {
        expect(EXERCISES_BY_ID.has(m.exerciseId), m.id).toBe(true);
        expect(m.order).toBe(i + 1);
        expect(m.minReps !== undefined || m.minSeconds !== undefined).toBe(true);
        const e = EXERCISES_BY_ID.get(m.exerciseId)!;
        if (m.minReps !== undefined) expect(e.measure).toBe("reps");
        if (m.minSeconds !== undefined) expect(e.measure).toBe("seconds");
      });
      for (const gate of skill.gate?.requiredMilestones ?? []) {
        expect(MILESTONES.some((m) => m.id === gate)).toBe(true);
      }
    }
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
  });

  it("includes the required brief skills and achievements", () => {
    const ids = SKILLS.map((s) => s.id);
    for (const id of ["push_up_mastery", "first_pull_up", "squat_control", "core_hollow", "dip_prep", "hang_grip", "handstand_prep", "l_sit", "crow_pose", "pistol_squat"]) {
      expect(ids).toContain(id);
    }
    expect(ACHIEVEMENTS.map((a) => a.id)).toEqual([
      "first_workout",
      "first_full_week",
      "first_progression",
      "first_push_up",
      "first_pull_up",
      "first_l_sit",
      "first_crow",
      "first_pistol",
    ]);
  });

  it("handstand preparation is gated", () => {
    expect(SKILLS.find((s) => s.id === "handstand_prep")!.gate).toBeDefined();
  });

  it.each(["l_sit", "crow_pose", "pistol_squat"])("%s is gated behind foundation milestones and recent pain", (id) => {
    const skill = SKILLS.find((s) => s.id === id)!;
    expect(skill.gate?.requiredMilestones.length).toBeGreaterThan(0);
    // The gate never depends on the skill's own milestones.
    for (const gate of skill.gate!.requiredMilestones) expect(skill.milestones.some((m) => m.id === gate)).toBe(false);
    expect(skill.gate!.painFreeFamilies).toContain(skill.families[0]);
  });

  it("each new skill ladder needs no equipment and starts at an easy difficulty", () => {
    for (const familyId of ["l_sit", "crow", "pistol"] as const) {
      const family = FAMILIES.find((f) => f.id === familyId)!;
      for (const id of family.ladder) expect(EXERCISES_BY_ID.get(id)!.equipmentAnyOf).toEqual([]);
      expect(EXERCISES_BY_ID.get(family.ladder[0])!.difficulty).toBeLessThanOrEqual(3);
    }
  });
});

describe("long-term roadmaps", () => {
  it("covers every long-term skill goal exactly once", () => {
    const trained = new Set(["skill_l_sit", "skill_crow", "skill_pistol"]);
    const longTerm = GOALS.filter((g) => isSkillGoal(g) && !trained.has(g));
    expect(ROADMAPS.map((r) => r.goal).sort()).toEqual([...longTerm].sort());
  });

  it.each(ROADMAPS.map((r) => [r.id, r] as const))("%s starts with FORM pathways and cites its sources", (_id, roadmap) => {
    expect(roadmap.phases.length).toBeGreaterThanOrEqual(3);
    expect(roadmap.phases[0].pathways.length).toBeGreaterThan(0);
    for (const phase of roadmap.phases) {
      expect(phase.steps.length).toBeGreaterThan(0);
      expect(phase.benchmark.length).toBeGreaterThan(10);
      for (const id of phase.pathways) expect(SKILLS.some((s) => s.id === id)).toBe(true);
    }
    expect(roadmap.safety.length).toBeGreaterThan(0);
    for (const s of roadmap.sources) expect(s).toMatch(/^S\d+$/);
  });

  it("makes no promises about how long anything takes", () => {
    const text = JSON.stringify([ROADMAPS, LATER_SKILLS]);
    expect(text).not.toMatch(/\b\d+\s*(weeks?|months?|years?)\b/i);
    expect(text).not.toMatch(/guarantee/i);
  });
});
