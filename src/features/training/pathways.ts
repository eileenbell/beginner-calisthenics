import {
  getExercise,
  getFamily,
  rangeOf,
  skillReadiness,
  SKILLS_BY_ID,
  SUCCESS_EXPOSURES_TO_PROGRESS,
  type Equipment,
  type Exercise,
  type FamilyId,
  type FamilyState,
  type Goal,
  type Milestone,
  type PainEvent,
  type SkillPath,
} from "@/domain";

// The six skill pathways shown in the app (Figma screens 3 and 4). Each one
// follows a family ladder from the exercise library; the user's position comes
// from their progression state, never from a fixed script.

export type PathwayId = "push_up_mastery" | "first_pull_up" | "core_hollow" | "dip_prep" | "squat_control" | "handstand_prep";
export type PathwayCategory = "push" | "pull" | "core" | "legs";

export interface PathwayDef {
  id: PathwayId;
  title: string;
  subtitle: string;
  family: FamilyId;
  category: PathwayCategory;
  /** Ladder steps shown as stages (a family ladder can be longer). */
  stages: number;
  goals: Goal[];
}

export const PATHWAYS: PathwayDef[] = [
  {
    id: "push_up_mastery",
    title: "Push-Up Pathway",
    subtitle: "From wall push-ups to your first floor push-up on your toes.",
    family: "push_up",
    category: "push",
    stages: 5,
    goals: ["first_push_up", "overall_strength", "build_muscle"],
  },
  {
    id: "first_pull_up",
    title: "First Pull-Up",
    subtitle: "Hangs, shoulder-blade pulls, holds and slow negatives, then your first full pull-up.",
    family: "pull_up",
    category: "pull",
    stages: 5,
    goals: ["first_pull_up"],
  },
  {
    id: "core_hollow",
    title: "Core Foundations",
    subtitle: "From dead bugs to the hollow body hold used across calisthenics.",
    family: "hollow",
    category: "core",
    stages: 4,
    goals: ["core_strength", "foundations"],
  },
  {
    id: "dip_prep",
    title: "Dip Foundations",
    subtitle: "Support holds and controlled lowering on parallel bars. Full dips come after this programme.",
    family: "dip_prep",
    category: "push",
    stages: 3,
    goals: [],
  },
  {
    id: "squat_control",
    title: "Squat & Mobility",
    subtitle: "From supported squats to slow, paused bodyweight squats.",
    family: "squat",
    category: "legs",
    stages: 4,
    goals: ["movement_mobility", "overall_strength", "foundations"],
  },
  {
    id: "handstand_prep",
    title: "Handstand Foundations",
    subtitle: "Gradual, wall-supported work towards a handstand. Unlocks once the prerequisites are in place.",
    family: "handstand",
    category: "core",
    stages: 3,
    goals: ["movement_mobility"],
  },
];

export const CATEGORY_LABELS: Record<PathwayCategory, string> = {
  push: "Push Strength",
  pull: "Pull Strength",
  core: "Core & Balance",
  legs: "Legs",
};

export type StageStatus = "done" | "current" | "next" | "upcoming";

export interface StageView {
  index: number;
  exercise: Exercise;
  status: StageStatus;
}

export type PathwayStatus = "focus" | "in_progress" | "paused" | "locked" | "needs_equipment" | "top";

export interface PathwayView {
  def: PathwayDef;
  skill: SkillPath;
  status: PathwayStatus;
  statusReason?: string;
  stages: StageView[];
  /** 1-based current stage, or 0 when locked or not started. */
  currentStage: number;
  current: Exercise | null;
  state: FamilyState | null;
  /** Qualifying workouts at the top of the range so far, out of `needed`. */
  readiness: { streak: number; needed: number };
  milestones: { milestone: Milestone; achieved: boolean }[];
  nextMilestone: Milestone | null;
}

interface PathwayInput {
  states: ReadonlyMap<FamilyId, FamilyState>;
  achieved: ReadonlySet<string>;
  painEvents: PainEvent[];
  equipment: readonly Equipment[];
  goals: readonly Goal[];
  now: Date;
}

export function pathwayView(def: PathwayDef, input: PathwayInput): PathwayView {
  const skill = SKILLS_BY_ID.get(def.id)!;
  const ladder = getFamily(def.family).ladder.slice(0, def.stages).map(getExercise);
  const state = input.states.get(def.family) ?? null;
  const readinessInfo = skillReadiness(skill, input.achieved, input.painEvents, input.equipment, input.now);
  const current = state ? getExercise(state.exerciseId) : null;
  const level = current ? Math.min(current.level, def.stages) : 0;
  const milestones = skill.milestones.map((milestone) => ({ milestone, achieved: input.achieved.has(milestone.id) }));
  const nextMilestone = milestones.find((m) => !m.achieved)?.milestone ?? null;

  let status: PathwayStatus;
  let statusReason: string | undefined;
  if (!readinessInfo.unlocked) {
    status = "locked";
    statusReason = readinessInfo.reason;
  } else if (!readinessInfo.hasEquipment) {
    status = "needs_equipment";
    statusReason = skill.equipmentNote;
  } else if (state?.paused) {
    status = "paused";
    statusReason = "Paused after you reported discomfort. You can resume it from Progress when you're ready.";
  } else if (current && current.level >= def.stages && !nextMilestone) {
    status = "top";
  } else if (def.goals.some((g) => input.goals.includes(g))) {
    status = "focus";
  } else {
    status = "in_progress";
  }

  const locked = status === "locked";
  const stages: StageView[] = ladder.map((exercise, i) => {
    const n = i + 1;
    let s: StageStatus = "upcoming";
    if (!locked && level > 0) {
      if (n < level) s = "done";
      else if (n === level) s = "current";
      else if (n === level + 1) s = "next";
    }
    return { index: n, exercise, status: s };
  });

  return {
    def,
    skill,
    status,
    statusReason,
    stages,
    currentStage: locked ? 0 : level,
    current: locked ? null : current,
    state,
    readiness: { streak: Math.min(state?.successStreak ?? 0, SUCCESS_EXPOSURES_TO_PROGRESS), needed: SUCCESS_EXPOSURES_TO_PROGRESS },
    milestones,
    nextMilestone,
  };
}

export function allPathways(input: PathwayInput): PathwayView[] {
  return PATHWAYS.map((def) => pathwayView(def, input));
}

/** The pathway to feature on the dashboard: the first goal's, falling back to push-ups. */
export function featuredPathway(views: PathwayView[], goals: readonly Goal[]): PathwayView {
  for (const goal of goals) {
    const match = views.find((v) => v.def.goals[0] === goal && v.status !== "locked" && v.status !== "needs_equipment");
    if (match) return match;
  }
  return views.find((v) => v.def.id === "push_up_mastery")!;
}

/** "9 of 8–10 reps" style description of where the working target sits. */
export function targetSummary(state: FamilyState | null): string | null {
  if (!state) return null;
  const exercise = getExercise(state.exerciseId);
  const [lo, hi] = rangeOf(exercise);
  const unit = exercise.measure === "seconds" ? "seconds" : "reps";
  return `${state.target} ${unit} per set (range ${lo}–${hi})`;
}

export const STATUS_LABELS: Record<PathwayStatus, string> = {
  focus: "Focus pathway",
  in_progress: "In progress",
  paused: "Paused",
  locked: "Locked",
  needs_equipment: "Needs equipment",
  top: "Top of pathway",
};

/**
 * "High incline push-up" → "High incline": the family word is implied by the
 * pathway. One-word leftovers ("Wall", "Dead") read badly, so those keep the full name.
 */
export function shortStageName(name: string): string {
  const trimmed = name.replace(/\s*(push-up|pull-up|squat|hold|hang)$/i, "").trim();
  if (trimmed.split(/\s+/).length < 2) return name;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
