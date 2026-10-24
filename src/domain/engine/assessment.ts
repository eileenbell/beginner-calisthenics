import { FAMILIES } from "../content/families";
import type { Equipment, Experience, FamilyId, FamilyState } from "../types";
import { clampToRange, expandEquipment, ladderStepAt, maxLevel, rangeOf } from "./catalogue";

// Baseline assessment. Every test is optional. Nothing here asks a beginner
// to attempt a full push-up, dip or pull-up: the push test lets them choose the
// hardest variation they're comfortable with, and the pull test only appears
// when they have a bar.

export const PUSH_TEST_VARIATIONS = ["wall", "high_incline", "mid_incline", "low_incline", "floor"] as const;
export type PushTestVariation = (typeof PUSH_TEST_VARIATIONS)[number];

export const SQUAT_TEST_ANSWERS = ["needs_support", "chair_no_hands", "ten_controlled", "fifteen_full_depth"] as const;
export type SquatTestAnswer = (typeof SQUAT_TEST_ANSWERS)[number];

export const ROW_TEST_ANSWERS = ["cannot", "some", "eight_plus"] as const;
export type RowTestAnswer = (typeof ROW_TEST_ANSWERS)[number];

export interface AssessmentInput {
  push?: { variation: PushTestVariation; reps: number } | null;
  squat?: SquatTestAnswer | null;
  /** Forearm plank hold in seconds; 0 if it wasn't possible. */
  plankSeconds?: number | null;
  /** Only asked if the user has something to hang from. */
  hangSeconds?: number | null;
  /** Only asked if the user has a bar. */
  pullUps?: number | null;
  /** Only asked with a low bar, rings or gym. */
  row?: RowTestAnswer | null;
  /** 1 = not confident at all, 5 = very confident. */
  confidence?: number | null;
}

type Levels = Record<FamilyId, { level: number; target?: number }>;

const DEFAULT_LEVELS: Record<Experience, Partial<Record<FamilyId, number>>> = {
  complete_beginner: {},
  some_fitness: { push_up: 2, squat: 2, plank: 2 },
  gym_new_to_calisthenics: { push_up: 3, squat: 3, plank: 3, hollow: 2, lunge: 2, hinge: 2, row: 2 },
};

/** Equipment the pull tests need. */
export function canTestHang(equipment: readonly Equipment[]): boolean {
  const set = expandEquipment(equipment);
  return set.has("pullup_bar") || set.has("rings") || set.has("low_bar");
}
export function canTestPullUps(equipment: readonly Equipment[]): boolean {
  const set = expandEquipment(equipment);
  return set.has("pullup_bar") || set.has("rings");
}
export function canTestRow(equipment: readonly Equipment[]): boolean {
  const set = expandEquipment(equipment);
  return set.has("low_bar") || set.has("rings");
}

export function initialLevels(experience: Experience, input: AssessmentInput, equipment: readonly Equipment[]): Levels {
  const levels = Object.fromEntries(
    FAMILIES.map((f) => [f.id, { level: DEFAULT_LEVELS[experience][f.id] ?? 1 }]),
  ) as Levels;

  if (input.push) {
    const v = PUSH_TEST_VARIATIONS.indexOf(input.push.variation) + 1;
    // The push test variations map onto ladder levels 1-5 (kneeling is an alternative, not a test option).
    const reps = Math.max(0, Math.floor(input.push.reps));
    if (reps >= 12 && v < 5) levels.push_up = { level: v + 1 };
    else if (reps >= 5) levels.push_up = { level: v, target: reps - 2 };
    else levels.push_up = { level: Math.max(1, v - 1) };
  }

  if (input.squat) {
    const level = SQUAT_TEST_ANSWERS.indexOf(input.squat) + 1;
    levels.squat = { level };
    levels.lunge = { level: level >= 3 ? 2 : 1 };
    if (level >= 4) levels.hinge = { level: Math.max(levels.hinge.level, 2) };
  }

  if (typeof input.plankSeconds === "number") {
    const s = Math.max(0, input.plankSeconds);
    if (s < 10) {
      levels.plank = { level: 1 };
      levels.hollow = { level: 1 };
    } else if (s < 30) {
      levels.plank = { level: 2 };
      levels.hollow = { level: 1 };
    } else if (s < 60) {
      levels.plank = { level: 3, target: s - 10 };
      levels.hollow = { level: 2 };
    } else {
      levels.plank = { level: 3, target: 45 };
      levels.hollow = { level: 3 };
    }
    levels.side_plank = { level: s >= 30 ? 2 : 1 };
  }

  if (canTestHang(equipment) && typeof input.hangSeconds === "number") {
    const s = Math.max(0, input.hangSeconds);
    if (s < 10) levels.pull_up = { level: 1 };
    else if (s < 30) levels.pull_up = { level: 1, target: s - 5 };
    else levels.pull_up = { level: 2 };
  }
  if (canTestPullUps(equipment) && typeof input.pullUps === "number" && input.pullUps >= 1) {
    levels.pull_up = { level: 5, target: Math.max(1, Math.floor(input.pullUps) - 1) };
  }

  if (canTestRow(equipment) && input.row) {
    levels.row = { level: ROW_TEST_ANSWERS.indexOf(input.row) + 1 };
  }

  if (levels.push_up.level >= 5) levels.pike = { level: 2 };

  // Low confidence: start one step easier everywhere (never below the first step).
  if (typeof input.confidence === "number" && input.confidence <= 2) {
    for (const id of Object.keys(levels) as FamilyId[]) {
      if (levels[id].level > 1) levels[id] = { level: levels[id].level - 1 };
    }
  }

  for (const id of Object.keys(levels) as FamilyId[]) {
    levels[id].level = Math.min(Math.max(1, levels[id].level), maxLevel(id));
  }
  return levels;
}

export function initialStates(experience: Experience, input: AssessmentInput, equipment: readonly Equipment[]): FamilyState[] {
  const levels = initialLevels(experience, input, equipment);
  return FAMILIES.map((family) => {
    const { level, target } = levels[family.id];
    const exercise = ladderStepAt(family.id, level);
    return {
      familyId: family.id,
      exerciseId: exercise.id,
      target: target === undefined ? rangeOf(exercise)[0] : clampToRange(exercise, target),
      successStreak: 0,
      difficultStreak: 0,
      painReports: [],
      paused: false,
    };
  });
}
