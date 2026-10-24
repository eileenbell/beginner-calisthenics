import { easierOptions, getExercise, substituteOptions, type Equipment, type Exercise } from "@/domain";

/**
 * What a user may switch to mid-workout: anything easier than the planned
 * exercise, same-level alternatives, or back to the planned exercise. Never
 * harder, so a swap can't skip the progression rules.
 */
export function allowedSwaps(plannedId: string, currentId: string, equipment: readonly Equipment[]): Exercise[] {
  const options = new Map<string, Exercise>();
  if (currentId !== plannedId) options.set(plannedId, getExercise(plannedId));
  for (const e of substituteOptions(plannedId, equipment)) options.set(e.id, e);
  for (const e of easierOptions(plannedId, equipment)) options.set(e.id, e);
  options.delete(currentId);
  return [...options.values()];
}

export function swapGroups(plannedId: string, currentId: string, equipment: readonly Equipment[]) {
  const easier = easierOptions(plannedId, equipment).filter((e) => e.id !== currentId);
  const same = substituteOptions(plannedId, equipment).filter((e) => e.id !== currentId);
  const planned = currentId !== plannedId ? getExercise(plannedId) : null;
  return { easier, same, planned };
}
