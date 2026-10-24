import type { ExercisePhoto } from "@/features/exercises/media";

/** The parts of an exercise the player shows. Sent to the client, so kept small. */
export interface ExerciseInfo {
  id: string;
  name: string;
  difficultyLabel: string;
  level: number;
  measure: "reps" | "seconds";
  perSide: boolean;
  range: [number, number];
  surfaces?: string;
  setup: string[];
  steps: string[];
  cues: string[];
  mistakes: string[];
  safety: string[];
  goodControl: string;
  breathing: string;
  photo: ExercisePhoto | null;
}

export interface SwapOptions {
  easier: string[];
  same: string[];
}
