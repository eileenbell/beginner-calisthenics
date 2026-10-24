import { EXERCISES, getExercise } from "../content/exercises";
import { getFamily } from "../content/families";
import type { Equipment, Exercise, FamilyId } from "../types";

/** Gym access implies the common gym equipment we program around. */
export function expandEquipment(equipment: readonly Equipment[]): Set<Equipment> {
  const set = new Set<Equipment>(["none", ...equipment]);
  if (set.has("gym")) {
    for (const e of ["pullup_bar", "low_bar", "parallel_bars", "bands"] as const) set.add(e);
  }
  return set;
}

export function isAvailable(exercise: Exercise, equipment: readonly Equipment[] | Set<Equipment>): boolean {
  const set = equipment instanceof Set ? equipment : expandEquipment(equipment);
  const anyOk = exercise.equipmentAnyOf.length === 0 || exercise.equipmentAnyOf.some((e) => set.has(e));
  const allOk = (exercise.equipmentAllOf ?? []).every((e) => set.has(e));
  return anyOk && allOk;
}

export function rangeOf(exercise: Exercise): [number, number] {
  const range = exercise.measure === "reps" ? exercise.dosage.reps : exercise.dosage.seconds;
  if (!range) throw new Error(`Exercise ${exercise.id} has no ${exercise.measure} range`);
  return range;
}

/** Increment used when raising or lowering a target within the range. */
export function stepOf(exercise: Exercise): number {
  if (exercise.measure === "seconds") return 5;
  const [, max] = rangeOf(exercise);
  return max > 10 ? 2 : 1;
}

export function clampToRange(exercise: Exercise, value: number): number {
  const [min, max] = rangeOf(exercise);
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function familyExercises(familyId: FamilyId): Exercise[] {
  return EXERCISES.filter((e) => e.familyId === familyId);
}

export function maxLevel(familyId: FamilyId): number {
  return getFamily(familyId).ladder.length;
}

/** All exercises at a given level of a family, ladder step first, filtered by equipment. */
export function availableAtLevel(familyId: FamilyId, level: number, equipment: readonly Equipment[]): Exercise[] {
  const set = expandEquipment(equipment);
  return familyExercises(familyId)
    .filter((e) => e.level === level && isAvailable(e, set))
    .sort((a, b) => Number(b.isLadderStep) - Number(a.isLadderStep));
}

/** The next harder exercise in the family that the user can do, or null at the top. */
export function nextHarder(exerciseId: string, equipment: readonly Equipment[]): Exercise | null {
  const current = getExercise(exerciseId);
  if (!current.familyId) return null;
  for (let level = current.level + 1; level <= maxLevel(current.familyId); level++) {
    const options = availableAtLevel(current.familyId, level, equipment);
    if (options.length > 0) return options[0];
  }
  return null;
}

/** The closest easier exercise in the family that the user can do, or null at the bottom. */
export function nextEasier(exerciseId: string, equipment: readonly Equipment[]): Exercise | null {
  const current = getExercise(exerciseId);
  if (!current.familyId) return null;
  for (let level = current.level - 1; level >= 1; level--) {
    const options = availableAtLevel(current.familyId, level, equipment);
    if (options.length > 0) return options[0];
  }
  return null;
}

/** Easier options a user may switch to mid-session: every available exercise below the current level. */
export function easierOptions(exerciseId: string, equipment: readonly Equipment[]): Exercise[] {
  const current = getExercise(exerciseId);
  if (!current.familyId) return [];
  const set = expandEquipment(equipment);
  return familyExercises(current.familyId)
    .filter((e) => e.level < current.level && isAvailable(e, set))
    .sort((a, b) => b.level - a.level || Number(b.isLadderStep) - Number(a.isLadderStep));
}

/** Same-level substitutes (different equipment or emphasis). */
export function substituteOptions(exerciseId: string, equipment: readonly Equipment[]): Exercise[] {
  const current = getExercise(exerciseId);
  if (!current.familyId) return [];
  return availableAtLevel(current.familyId, current.level, equipment).filter((e) => e.id !== current.id);
}

/** Harder exercises shown on the library page (read-only, never chosen by the user mid-session). */
export function harderOptions(exerciseId: string): Exercise[] {
  const current = getExercise(exerciseId);
  if (!current.familyId) return [];
  return familyExercises(current.familyId)
    .filter((e) => e.level === current.level + 1)
    .sort((a, b) => Number(b.isLadderStep) - Number(a.isLadderStep));
}

export function easierLibraryOptions(exerciseId: string): Exercise[] {
  const current = getExercise(exerciseId);
  if (!current.familyId) return [];
  return familyExercises(current.familyId)
    .filter((e) => e.level === current.level - 1)
    .sort((a, b) => Number(b.isLadderStep) - Number(a.isLadderStep));
}

export function ladderStepAt(familyId: FamilyId, level: number): Exercise {
  const family = getFamily(familyId);
  const id = family.ladder[Math.min(Math.max(level, 1), family.ladder.length) - 1];
  return getExercise(id);
}
