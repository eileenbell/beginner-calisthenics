import { describe, expect, it } from "vitest";
import { getExercise } from "../content/exercises";
import type {
  DaysPerWeek,
  Equipment,
  FamilyId,
  FamilyState,
  Pattern,
  SessionMinutes,
  UserTrainingProfile,
} from "../types";
import { initialStates } from "./assessment";
import { isAvailable } from "./catalogue";
import { buildSchedule, buildSessionPlan, programmeWeek, weekTemplates } from "./programme";

const EQUIPMENT_SETS: Equipment[][] = [
  [],
  ["mat"],
  ["bands"],
  ["pullup_bar"],
  ["low_bar"],
  ["parallel_bars"],
  ["rings"],
  ["gym"],
  ["mat", "bands", "pullup_bar"],
];

function profile(overrides: Partial<UserTrainingProfile> = {}): UserTrainingProfile {
  return {
    experience: "complete_beginner",
    goals: ["overall_strength"],
    daysPerWeek: 3,
    sessionMinutes: 25,
    equipment: [],
    environment: "home",
    ...overrides,
  };
}

function statesFor(p: UserTrainingProfile): Map<FamilyId, FamilyState> {
  return new Map(initialStates(p.experience, {}, p.equipment).map((s) => [s.familyId, s]));
}

function weekPatterns(p: UserTrainingProfile, week = 2): Set<Pattern> {
  const states = statesFor(p);
  const patterns = new Set<Pattern>();
  for (const template of weekTemplates(p.daysPerWeek, week)) {
    const plan = buildSessionPlan({ profile: p, states, week, template, daysSinceLastSession: 2, unlockedSkills: new Set() });
    for (const item of plan.items.filter((i) => i.block === "main")) patterns.add(getExercise(item.exerciseId).pattern);
  }
  return patterns;
}

describe("programme balance", () => {
  const combos: [DaysPerWeek, SessionMinutes, Equipment[]][] = [];
  for (const d of [2, 3, 4] as const) for (const m of [15, 25, 40] as const) for (const e of EQUIPMENT_SETS) combos.push([d, m, e]);

  it.each(combos)("%i days, %i min, equipment %j trains every major pattern each week", (days, minutes, equipment) => {
    const p = profile({ daysPerWeek: days, sessionMinutes: minutes, equipment });
    const patterns = weekPatterns(p);
    expect(patterns.has("squat") || patterns.has("lunge")).toBe(true);
    expect(patterns.has("horizontal_push")).toBe(true);
    expect(patterns.has("horizontal_pull") || patterns.has("vertical_pull")).toBe(true);
    expect(patterns.has("core_anti_extension") || patterns.has("core_lateral") || patterns.has("core_anti_rotation")).toBe(true);
    if (minutes >= 25 || days >= 4) expect(patterns.has("hinge")).toBe(true);
  });

  it.each(combos)("%i days, %i min, equipment %j only uses available equipment", (days, minutes, equipment) => {
    const p = profile({ daysPerWeek: days, sessionMinutes: minutes, equipment });
    const states = statesFor(p);
    for (const template of weekTemplates(days, 1)) {
      const plan = buildSessionPlan({ profile: p, states, week: 1, template, daysSinceLastSession: null, unlockedSkills: new Set() });
      for (const item of plan.items) expect(isAvailable(getExercise(item.exerciseId), equipment), item.exerciseId).toBe(true);
    }
  });
});

describe("session structure", () => {
  it("has a warm-up, main block and cool-down in that order", () => {
    const p = profile();
    const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 2, template: "A", daysSinceLastSession: 2, unlockedSkills: new Set() });
    const blocks = plan.items.map((i) => i.block);
    expect(blocks[0]).toBe("warmup");
    expect(blocks.at(-1)).toBe("cooldown");
    expect(blocks.indexOf("cooldown")).toBeGreaterThan(blocks.lastIndexOf("main"));
    expect(plan.items.filter((i) => i.block === "main")).toHaveLength(5);
  });

  it("uses 4, 5 and 6-7 main exercises for 15, 25 and 40 minutes", () => {
    for (const [minutes, min, max] of [[15, 4, 4], [25, 5, 5], [40, 6, 7]] as const) {
      const p = profile({ sessionMinutes: minutes, equipment: ["pullup_bar", "bands"] });
      const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 2, template: "B", daysSinceLastSession: 2, unlockedSkills: new Set() });
      const count = plan.items.filter((i) => i.block === "main").length;
      expect(count).toBeGreaterThanOrEqual(min);
      expect(count).toBeLessThanOrEqual(max);
    }
  });

  it("keeps sessions roughly within the chosen length", () => {
    for (const minutes of [15, 25, 40] as const) {
      const p = profile({ sessionMinutes: minutes, experience: "gym_new_to_calisthenics", equipment: ["gym"] });
      const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 5, template: "A", daysSinceLastSession: 2, unlockedSkills: new Set() });
      expect(plan.estimatedMinutes).toBeLessThanOrEqual(minutes * 1.35);
    }
  });

  it("starts week 1 with two sets per exercise", () => {
    const p = profile({ sessionMinutes: 40 });
    const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 1, template: "A", daysSinceLastSession: null, unlockedSkills: new Set() });
    for (const item of plan.items.filter((i) => i.block === "main")) expect(item.sets).toBe(2);
  });

  it("drops a set after 14+ days away and says why", () => {
    const p = profile({ sessionMinutes: 40 });
    const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 6, template: "A", daysSinceLastSession: 20, unlockedSkills: new Set() });
    expect(plan.notices.join(" ")).toMatch(/welcome back/i);
    for (const item of plan.items.filter((i) => i.block === "main" && !i.note?.startsWith("Skill"))) expect(item.sets).toBe(2);
  });

  it("includes wrist preparation whenever hands support bodyweight", () => {
    const p = profile();
    const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 2, template: "A", daysSinceLastSession: 2, unlockedSkills: new Set() });
    expect(plan.items.some((i) => i.exerciseId === "wrist_prep")).toBe(true);
  });
});

describe("beginner safety", () => {
  it("gives a complete beginner who can't do a push-up the wall push-up", () => {
    const p = profile();
    const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 1, template: "A", daysSinceLastSession: null, unlockedSkills: new Set() });
    expect(plan.items.find((i) => i.familyId === "push_up")?.exerciseId).toBe("wall_push_up");
  });

  it("is honest about pulling limits without equipment", () => {
    const p = profile({ equipment: [] });
    const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 1, template: "A", daysSinceLastSession: null, unlockedSkills: new Set() });
    expect(plan.notices.join(" ")).toMatch(/rows need a low bar/i);
    const pull = plan.items.find((i) => getExercise(i.exerciseId).pattern === "horizontal_pull");
    expect(pull?.familyId).toBe("upper_back_floor");
    expect(pull?.note).toMatch(/don't replace rows or pull-ups/);
  });

  it("uses band rows at home when bands are available", () => {
    const p = profile({ equipment: ["bands"] });
    const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 1, template: "A", daysSinceLastSession: null, unlockedSkills: new Set() });
    expect(plan.items.some((i) => i.exerciseId === "band_seated_row")).toBe(true);
  });

  it("never schedules handstand or dip work until the skill is unlocked", () => {
    const p = profile({ sessionMinutes: 40, goals: ["movement_mobility", "build_muscle"], equipment: ["parallel_bars"] });
    const states = statesFor(p);
    const locked = buildSessionPlan({ profile: p, states, week: 3, template: "A", daysSinceLastSession: 2, unlockedSkills: new Set() });
    expect(locked.items.some((i) => i.familyId === "handstand" || i.familyId === "dip_prep")).toBe(false);
    const unlocked = buildSessionPlan({ profile: p, states, week: 3, template: "A", daysSinceLastSession: 2, unlockedSkills: new Set(["handstand_prep"]) });
    expect(unlocked.items.some((i) => i.familyId === "handstand")).toBe(true);
  });

  it("leaves a paused family out and explains", () => {
    const p = profile();
    const states = statesFor(p);
    states.set("push_up", { ...states.get("push_up")!, paused: true });
    const plan = buildSessionPlan({ profile: p, states, week: 2, template: "A", daysSinceLastSession: 2, unlockedSkills: new Set() });
    expect(plan.items.some((i) => i.familyId === "push_up")).toBe(false);
    expect(plan.notices.join(" ")).toMatch(/paused/i);
  });

  it("swaps pike work for side planks until push-ups are established", () => {
    const p = profile({ daysPerWeek: 4, sessionMinutes: 40 });
    const plan = buildSessionPlan({ profile: p, states: statesFor(p), week: 2, template: "U", daysSinceLastSession: 2, unlockedSkills: new Set() });
    expect(plan.items.some((i) => i.familyId === "pike")).toBe(false);
  });
});

describe("skill goals", () => {
  const plan = (p: UserTrainingProfile, unlocked: string[], template: "A" | "B" | "U" | "L" = "A") =>
    buildSessionPlan({
      profile: p,
      states: statesFor(p),
      week: 3,
      template,
      daysSinceLastSession: 2,
      unlockedSkills: new Set(unlocked as never[]),
    });
  const main = (items: ReturnType<typeof plan>["items"]) => items.filter((i) => i.block === "main");

  it.each([
    ["skill_l_sit", "l_sit", "l_sit"],
    ["skill_crow", "crow", "crow_pose"],
    ["skill_pistol", "pistol", "pistol_squat"],
  ] as const)("never schedules %s work until it's unlocked, then practises it first", (goal, family, skill) => {
    const p = profile({ goals: [goal], sessionMinutes: 40 });
    expect(plan(p, []).items.some((i) => i.familyId === family)).toBe(false);
    const unlocked = main(plan(p, [skill]).items);
    expect(unlocked[0].familyId).toBe(family);
    expect(unlocked[0].note).toMatch(/skill practice/i);
  });

  it("gives 25-minute sessions skill practice in place of the fifth exercise", () => {
    const p = profile({ goals: ["skill_crow"], sessionMinutes: 25 });
    const items = main(plan(p, ["crow_pose"]).items);
    expect(items).toHaveLength(5);
    expect(items[0].familyId).toBe("crow");
    // Without a skill goal, 25 minutes stays five template exercises with no skill slot.
    const plain = main(plan(profile({ sessionMinutes: 25 }), ["crow_pose"]).items);
    expect(plain).toHaveLength(5);
    expect(plain.some((i) => i.note?.startsWith("Skill practice"))).toBe(false);
  });

  it("keeps the session's own fifth exercise when the skill is still locked", () => {
    const p = profile({ goals: ["skill_l_sit"], sessionMinutes: 25 });
    const items = main(plan(p, []).items);
    expect(items).toHaveLength(5);
    expect(items.some((i) => i.familyId === "l_sit")).toBe(false);
    // L-sit's preparation, the hollow body, takes the practice slot until then.
    expect(items[0].familyId).toBe("hollow");
  });

  it("has no skill practice in 15-minute sessions", () => {
    const p = profile({ goals: ["skill_pistol"], sessionMinutes: 15 });
    const items = main(plan(p, ["pistol_squat"]).items);
    expect(items).toHaveLength(4);
    expect(items.some((i) => i.familyId === "pistol")).toBe(false);
  });

  it("puts a specific skill ahead of general goals in the practice slot", () => {
    const p = profile({ goals: ["core_strength", "skill_l_sit"], sessionMinutes: 40 });
    expect(main(plan(p, ["l_sit"], "B").items)[0].familyId).toBe("l_sit");
  });

  it("practises the foundations for long-term skills", () => {
    const p = profile({ goals: ["skill_muscle_up"], sessionMinutes: 40, equipment: ["pullup_bar"] });
    const items = main(plan(p, [], "A").items);
    expect(items[0].familyId).toBe("pull_up");
  });

  it("warms up wrists for arm balances and hips for pistols", () => {
    const crow = plan(profile({ goals: ["skill_crow"], sessionMinutes: 25 }), ["crow_pose"], "L");
    expect(main(crow.items).some((i) => i.familyId === "crow")).toBe(true);
    expect(crow.items.some((i) => i.exerciseId === "wrist_prep")).toBe(true);
    const pistol = plan(profile({ goals: ["skill_pistol"], sessionMinutes: 25 }), ["pistol_squat"], "U");
    expect(main(pistol.items).some((i) => i.familyId === "pistol")).toBe(true);
    expect(pistol.items.some((i) => i.exerciseId === "kneeling_hip_flexor_stretch")).toBe(true);
  });
});

describe("schedule", () => {
  it("builds 12 weeks of sessions with no consecutive full-body days", () => {
    for (const days of [2, 3] as const) {
      const schedule = buildSchedule(days);
      expect(schedule).toHaveLength(12 * days);
      const offsets = schedule.map((s) => s.dayOffset);
      for (let i = 1; i < offsets.length; i++) expect(offsets[i] - offsets[i - 1]).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses an upper/lower split for four days", () => {
    expect(weekTemplates(4, 1)).toEqual(["U", "L", "U", "L"]);
  });

  it("calculates the programme week from the start date and caps it", () => {
    const start = new Date("2026-10-01T00:00:00Z");
    expect(programmeWeek(start, new Date("2026-10-01T10:00:00Z"))).toBe(1);
    expect(programmeWeek(start, new Date("2026-10-08T10:00:00Z"))).toBe(2);
    expect(programmeWeek(start, new Date("2027-06-01T10:00:00Z"))).toBe(12);
  });
});
