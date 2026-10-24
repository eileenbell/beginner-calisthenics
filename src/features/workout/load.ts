import "server-only";
import { easierOptions, getExercise, rangeOf, substituteOptions, type Equipment } from "@/domain";
import { exercisePhoto } from "@/features/exercises/media";
import { DIFFICULTY_LABELS } from "@/features/training/format";
import type { FeedbackRow, SessionRow, SetLogRow } from "@/server/rows";
import type { FeedbackEntry, PlayerItem, PlayerState } from "./player-state";
import type { ExerciseInfo, SwapOptions } from "./types";

export function exerciseInfo(id: string): ExerciseInfo {
  const e = getExercise(id);
  return {
    id: e.id,
    name: e.name,
    difficultyLabel: DIFFICULTY_LABELS[e.difficulty],
    level: e.level,
    measure: e.measure,
    perSide: e.perSide,
    range: rangeOf(e),
    surfaces: e.surfaces,
    setup: e.setup,
    steps: e.steps,
    cues: e.cues,
    mistakes: e.mistakes,
    safety: e.safety,
    goodControl: e.goodControl,
    breathing: e.breathing,
    photo: exercisePhoto(e.id),
  };
}

export function playerData(session: SessionRow, logs: SetLogRow[], feedback: FeedbackRow[], equipment: Equipment[]) {
  const items: PlayerItem[] = session.plan.items.map((item, index) => ({
    index,
    block: item.block,
    sets: item.sets,
    measure: item.measure,
    perSide: item.perSide,
    plannedTarget: item.target,
    restSeconds: item.restSeconds,
    plannedExerciseId: item.exerciseId,
    exerciseId: session.swaps[String(index)] ?? item.exerciseId,
    familyId: item.familyId,
    note: item.note,
  }));
  const ids = new Set<string>();
  const swaps: Record<number, SwapOptions> = {};
  for (const item of items) {
    ids.add(item.plannedExerciseId);
    ids.add(item.exerciseId);
    const easier = item.familyId ? easierOptions(item.plannedExerciseId, equipment).map((e) => e.id) : [];
    const same = item.familyId ? substituteOptions(item.plannedExerciseId, equipment).map((e) => e.id) : [];
    swaps[item.index] = { easier, same };
    for (const id of [...easier, ...same]) ids.add(id);
  }
  const exercises: Record<string, ExerciseInfo> = Object.fromEntries([...ids].map((id) => [id, exerciseInfo(id)]));

  const logMap: PlayerState["logs"] = {};
  for (const log of logs) {
    if (log.exercise_id !== items[log.item_index]?.exerciseId) continue;
    const value = log.reps ?? log.seconds;
    if (value === null) continue;
    (logMap[log.item_index] ??= {})[log.set_number] = value;
  }
  const feedbackMap: Record<number, FeedbackEntry> = {};
  for (const f of feedback) {
    feedbackMap[f.item_index] = { difficulty: f.difficulty, goodControl: f.good_control, skipped: f.skipped_reason };
  }
  return { items, exercises, swaps, logs: logMap, feedback: feedbackMap };
}
