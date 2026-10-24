import type { ReactNode } from "react";
import { getExercise } from "@/domain";
import { exercisePhoto } from "./media";
import { MediaFrame } from "./media-frame";

interface ExerciseMediaProps {
  exerciseId: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  children?: ReactNode;
}

export function ExerciseMedia({ exerciseId, ...props }: ExerciseMediaProps) {
  return <MediaFrame name={getExercise(exerciseId).name} photo={exercisePhoto(exerciseId)} {...props} />;
}
