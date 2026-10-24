import { describe, expect, it } from "vitest";
import { getExercise, isAvailable } from "@/domain";
import { ALL_GOAL_OPTIONS, completeAnswers, firstIncompleteStep, goalsSchema, readAnswers, scheduleSchema, type OnboardingAnswers } from "@/features/onboarding/answers";
import { GOALS } from "@/domain";
import { previewProgramme } from "@/features/onboarding/preview";

const base: OnboardingAnswers = {
  goals: ["first_push_up"],
  experience: "complete_beginner",
  assessment: null,
  daysPerWeek: 3,
  trainingDays: [1, 3, 5],
  sessionMinutes: 25,
  environment: "home",
  timeZone: "Australia/Sydney",
  equipment: [],
};

// A Monday morning in Sydney.
const NOW = new Date("2026-10-25T22:00:00Z");

function preview(overrides: Partial<OnboardingAnswers> = {}) {
  const complete = completeAnswers({ ...base, ...overrides });
  if (!complete) throw new Error("answers incomplete");
  return { complete, preview: previewProgramme(complete, NOW) };
}

describe("onboarding answers", () => {
  it("resumes at the first unanswered step", () => {
    expect(firstIncompleteStep({})).toBe("goals");
    expect(firstIncompleteStep({ goals: ["foundations"] })).toBe("experience");
    expect(firstIncompleteStep({ ...base, trainingDays: undefined })).toBe("schedule");
    expect(firstIncompleteStep({ ...base, equipment: undefined })).toBe("equipment");
    expect(firstIncompleteStep(base)).toBe("summary");
  });

  it("drops malformed stored answers instead of failing", () => {
    const answers = readAnswers({ goals: ["first_push_up"], daysPerWeek: 9, equipment: ["teleporter"] });
    expect(answers.goals).toEqual(["first_push_up"]);
    expect(answers.daysPerWeek).toBeUndefined();
    expect(answers.equipment).toBeUndefined();
  });

  it("always includes floor, wall and furniture as equipment", () => {
    expect(completeAnswers(base)?.profile.equipment).toEqual(["none"]);
    expect(completeAnswers({ ...base, equipment: ["mat", "bands"] })?.profile.equipment).toEqual(["none", "mat", "bands"]);
  });

  it("rejects training days without rest between sessions", () => {
    const back2back = scheduleSchema.safeParse({ daysPerWeek: 3, trainingDays: [1, 2, 4], sessionMinutes: 25, environment: "home", timeZone: "UTC" });
    expect(back2back.success).toBe(false);
    const wrongCount = scheduleSchema.safeParse({ daysPerWeek: 3, trainingDays: [1, 3], sessionMinutes: 25, environment: "home", timeZone: "UTC" });
    expect(wrongCount.success).toBe(false);
    const ok = scheduleSchema.safeParse({ daysPerWeek: 3, trainingDays: ["1", "3", "5"], sessionMinutes: "25", environment: "home", timeZone: "UTC" });
    expect(ok.success).toBe(true);
  });

  it("rejects an unknown time zone", () => {
    const parsed = scheduleSchema.safeParse({ daysPerWeek: 2, trainingDays: [2, 5], sessionMinutes: 15, environment: "park", timeZone: "Mars/Olympus" });
    expect(parsed.success).toBe(false);
  });
});

describe("goal choices", () => {
  it("offers every goal exactly once across the general and skill lists", () => {
    expect(ALL_GOAL_OPTIONS.map((o) => o.id).sort()).toEqual([...GOALS].filter((g) => g !== "build_muscle").sort());
  });

  it("accepts skill goals alongside general ones, up to three in total", () => {
    expect(goalsSchema.safeParse({ goals: ["first_push_up", "skill_crow"] }).success).toBe(true);
    expect(goalsSchema.safeParse({ goals: ["skill_l_sit", "skill_pistol", "skill_muscle_up", "core_strength"] }).success).toBe(false);
    expect(goalsSchema.safeParse({ goals: ["skill_backflip"] }).success).toBe(false);
  });
});

describe("programme generation from onboarding", () => {
  it("builds 12 weeks on the chosen weekdays, starting today", () => {
    const { preview: p } = preview();
    expect(p.startedOn).toBe("2026-10-26");
    expect(p.weeks).toBe(12);
    expect(p.schedule).toHaveLength(36);
    const weekdays = new Set(p.schedule.map((s) => new Date(`${s.scheduledOn}T00:00:00Z`).getUTCDay()));
    expect([...weekdays].sort()).toEqual([1, 3, 5]);
  });

  it.each([2, 3, 4] as const)("schedules %i sessions a week", (days) => {
    const trainingDays = { 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5] }[days];
    const { preview: p } = preview({ daysPerWeek: days, trainingDays });
    expect(p.schedule).toHaveLength(days * 12);
    for (let week = 1; week <= 12; week++) expect(p.schedule.filter((s) => s.week === week)).toHaveLength(days);
  });

  it("starts a beginner who can't do a push-up yet on wall push-ups", () => {
    const { preview: p } = preview({ assessment: { pushVariation: "wall", pushReps: 0, squat: "needs_support", plankSeconds: 0, hangSeconds: null, pullUps: null, confidence: 2 } });
    const push = p.states.find((s) => s.familyId === "push_up");
    expect(push?.exerciseId).toBe("wall_push_up");
    const squat = p.states.find((s) => s.familyId === "squat");
    expect(squat?.exerciseId).toBe("assisted_squat");
  });

  it("never prescribes exercises that need equipment the user doesn't have", () => {
    const { complete, preview: p } = preview({ equipment: [] });
    for (const { plan } of p.firstWeek) {
      for (const item of plan.items) expect(isAvailable(getExercise(item.exerciseId), complete.profile.equipment)).toBe(true);
    }
    expect(p.firstWeek.flatMap((w) => w.plan.items).some((i) => i.familyId === "pull_up")).toBe(false);
  });

  it("adds bar work when the user has a pull-up bar", () => {
    const { preview: p } = preview({ goals: ["first_pull_up"], equipment: ["pullup_bar"] });
    const families = new Set(p.firstWeek.flatMap((w) => w.plan.items).map((i) => i.familyId));
    expect(families.has("pull_up")).toBe(true);
  });

  it("gives longer sessions more main exercises", () => {
    const short = preview({ sessionMinutes: 15 }).preview.firstWeek[0].plan.items.filter((i) => i.block === "main").length;
    const long = preview({ sessionMinutes: 40 }).preview.firstWeek[0].plan.items.filter((i) => i.block === "main").length;
    expect(long).toBeGreaterThan(short);
  });

  it("produces the same plan for the same answers", () => {
    expect(preview().preview).toEqual(preview().preview);
  });
});
