// Core domain types shared by the content catalogue, the progression engine,
// the programme generator and the UI. Nothing in src/domain touches the
// network, the database or React, so all of it is unit-testable.

export const EQUIPMENT = [
  "none",
  "mat",
  "bands",
  "pullup_bar",
  "low_bar",
  "parallel_bars",
  "rings",
  "gym",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EXPERIENCE = ["complete_beginner", "some_fitness", "gym_new_to_calisthenics"] as const;
export type Experience = (typeof EXPERIENCE)[number];

export const GOALS = [
  "overall_strength",
  "first_push_up",
  "first_pull_up",
  "core_strength",
  "movement_mobility",
  "build_muscle",
  "foundations",
] as const;
export type Goal = (typeof GOALS)[number];

export const ENVIRONMENTS = ["home", "gym", "park", "mixed"] as const;
export type TrainingEnvironment = (typeof ENVIRONMENTS)[number];

export const DAYS_PER_WEEK = [2, 3, 4] as const;
export type DaysPerWeek = (typeof DAYS_PER_WEEK)[number];

export const SESSION_MINUTES = [15, 25, 40] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];

export type Pattern =
  | "squat"
  | "lunge"
  | "hinge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "core_anti_extension"
  | "core_anti_rotation"
  | "core_lateral"
  | "support"
  | "mobility";

export type Muscle =
  | "chest"
  | "shoulders"
  | "triceps"
  | "biceps"
  | "forearms_grip"
  | "lats"
  | "upper_back"
  | "lower_back"
  | "abdominals"
  | "obliques"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves"
  | "hip_flexors"
  | "wrists";

export type ExerciseCategory = "strength" | "skill" | "warmup" | "cooldown";

/** How an exercise is measured. Holds are in seconds. */
export type Measure = "reps" | "seconds";

export type FamilyId =
  | "push_up"
  | "pike"
  | "squat"
  | "lunge"
  | "hinge"
  | "row"
  | "upper_back_floor"
  | "pull_up"
  | "plank"
  | "hollow"
  | "side_plank"
  | "dip_prep"
  | "handstand";

export type ValidationStatus =
  /** Written from the cited sources and checked internally for consistency. */
  | "internal_review"
  /** Reviewed and signed off by a named, qualified professional. None yet. */
  | "professional_review";

export interface Dosage {
  sets: [number, number];
  reps?: [number, number];
  seconds?: [number, number];
  restSeconds: number;
}

export interface Exercise {
  id: string;
  name: string;
  /** Family ladder this exercise belongs to; null for warm-up and cool-down moves. */
  familyId: FamilyId | null;
  /** Position within the family ladder, 1 = easiest. Alternatives share a level. */
  level: number;
  /** Global difficulty shown to users, 1 (Foundation) to 5 (Advanced). */
  difficulty: 1 | 2 | 3 | 4 | 5;
  pattern: Pattern;
  category: ExerciseCategory;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  /**
   * The exercise is available if the user has ANY of these.
   * An empty list means no equipment is required.
   */
  equipmentAnyOf: Equipment[];
  /** Additional equipment that is always required on top of equipmentAnyOf. */
  equipmentAllOf?: Equipment[];
  /** Everyday surfaces needed, in plain words (e.g. "A clear wall"). */
  surfaces?: string;
  goals: Goal[];
  measure: Measure;
  perSide: boolean;
  dosage: Dosage;
  /** True if this is the main rung of its ladder rather than an alternative at the same level. */
  isLadderStep: boolean;
  why: string;
  setup: string[];
  steps: string[];
  breathing: string;
  /** Plain-language definition of "good control" for this exercise. */
  goodControl: string;
  /** One or two short cues shown during an active set. */
  cues: string[];
  mistakes: string[];
  safety: string[];
  /** Alternatives at a similar level (different equipment or emphasis). */
  alternatives: string[];
  /** Extra easier options beyond the ladder step below. */
  extraEasier?: string[];
  /** Note shown when this is the best available option but has limits. */
  limitationNote?: string;
  validation: {
    status: ValidationStatus;
    sources: string[];
    reviewNotes?: string;
  };
}

export interface ProgressionFamily {
  id: FamilyId;
  name: string;
  pattern: Pattern;
  description: string;
  /** Ordered main ladder, easiest first. */
  ladder: string[];
  /** Family to fall back to when no ladder step is available with the user's equipment. */
  fallbackFamily?: FamilyId;
  /** Shown when the user lacks equipment for this whole family. */
  equipmentNote?: string;
}

export type ExerciseFeedback =
  | "too_easy"
  | "about_right"
  | "too_difficult"
  | "could_not_finish"
  | "pain";

export type SkipReason = "pain" | "too_hard" | "no_equipment" | "short_on_time" | "other";

export interface SetResult {
  reps?: number | null;
  seconds?: number | null;
}

/** Everything the engine needs to know about one exercise in one session. */
export interface ExposureResult {
  exerciseId: string;
  prescribedSets: number;
  target: number;
  sets: SetResult[];
  feedback: ExerciseFeedback | null;
  goodControl: boolean | null;
  skipped?: SkipReason | null;
}

/** Per-user, per-family progression state, persisted in user_exercise_levels. */
export interface FamilyState {
  familyId: FamilyId;
  exerciseId: string;
  /** Current per-set target in reps or seconds. */
  target: number;
  /** Consecutive exposures meeting the progression criteria at the top of the range. */
  successStreak: number;
  /** Consecutive exposures rated too difficult. */
  difficultStreak: number;
  /** ISO timestamps of recent pain reports in this family. */
  painReports: string[];
  paused: boolean;
}

export type DecisionKind =
  | "progress"
  | "increase_target"
  | "hold"
  | "decrease_target"
  | "regress"
  | "pain_swap"
  | "pain_pause"
  | "no_change";

export interface ProgressionDecision {
  kind: DecisionKind;
  familyId: FamilyId;
  fromExerciseId: string;
  toExerciseId: string;
  fromTarget: number;
  toTarget: number;
  /** Plain-language reason, shown to the user. */
  reason: string;
}

export interface UserTrainingProfile {
  experience: Experience;
  goals: Goal[];
  daysPerWeek: DaysPerWeek;
  sessionMinutes: SessionMinutes;
  equipment: Equipment[];
  environment: TrainingEnvironment;
}

export type SessionTemplate = "A" | "B" | "U" | "L";

export type SessionBlock = "warmup" | "main" | "cooldown";

export interface PlannedItem {
  exerciseId: string;
  familyId: FamilyId | null;
  block: SessionBlock;
  sets: number;
  measure: Measure;
  perSide: boolean;
  /** Target per set (reps or seconds). */
  target: number;
  /** Range for the current exercise, for display. */
  range: [number, number];
  restSeconds: number;
  note?: string;
}

export interface SessionPlan {
  template: SessionTemplate;
  title: string;
  objective: string;
  week: number;
  phase: ProgrammePhase;
  items: PlannedItem[];
  notices: string[];
  estimatedMinutes: number;
}

export type ProgrammePhase = "foundations" | "build" | "consolidate";
