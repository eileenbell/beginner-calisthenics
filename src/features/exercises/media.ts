// Exercise imagery. The only photos available are the renders from the
// approved design file; their licence hasn't been confirmed, so the UI labels
// them as placeholders (docs/EXERCISE_CONTENT_REVIEW.md). Every other exercise
// shows a clearly marked illustration placeholder.

export interface ExercisePhoto {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const PHOTOS: Record<string, ExercisePhoto> = {
  high_incline_push_up: {
    src: "/images/design/incline-push-up-hero.png",
    alt: "A person in an incline push-up with hands on a waist-height bar, body in a straight line.",
    width: 326,
    height: 144,
  },
  mid_incline_push_up: {
    src: "/images/design/incline-push-up-bench.png",
    alt: "A person in an incline push-up with hands on a knee-height bench, body in a straight line from head to heels.",
    width: 358,
    height: 269,
  },
};

export function exercisePhoto(exerciseId: string): ExercisePhoto | null {
  return PHOTOS[exerciseId] ?? null;
}
