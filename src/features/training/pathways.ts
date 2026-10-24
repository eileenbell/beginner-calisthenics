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

// The skill pathways shown in the app (Figma screens 3 and 4). Each one
// follows a family ladder from the exercise library; the user's position comes
// from their progression state, never from a fixed script.

export type PathwayId =
  | "push_up_mastery"
  | "first_pull_up"
  | "core_hollow"
  | "dip_prep"
  | "squat_control"
  | "handstand_prep"
  | "l_sit"
  | "crow_pose"
  | "pistol_squat";
export type PathwayCategory = "push" | "pull" | "core" | "legs";

export interface PathwayDef {
  id: PathwayId;
  title: string;
  subtitle: string;
  family: FamilyId;
  category: PathwayCategory;
  /** Ladder steps shown as stages (a family ladder can be longer). */
  stages: number;
  /** Goals this pathway serves. It's marked as a focus pathway for them. */
  goals: Goal[];
  /** What the skill involves, for pathways people choose as a specific goal. */
  involves?: string;
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
    goals: ["first_pull_up", "skill_muscle_up", "skill_front_lever"],
  },
  {
    id: "core_hollow",
    title: "Core Foundations",
    subtitle: "From dead bugs to the hollow body hold used across calisthenics.",
    family: "hollow",
    category: "core",
    stages: 4,
    goals: ["core_strength", "foundations", "skill_l_sit", "skill_front_lever"],
  },
  {
    id: "dip_prep",
    title: "Dip Foundations",
    subtitle: "Support holds and controlled lowering on parallel bars. Full dips come after this programme.",
    family: "dip_prep",
    category: "push",
    stages: 3,
    goals: ["skill_muscle_up"],
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
    goals: ["movement_mobility", "skill_handstand"],
  },
  {
    id: "l_sit",
    title: "L-Sit",
    subtitle: "From a foot-supported hold to both legs straight out in front, on straight arms.",
    family: "l_sit",
    category: "core",
    stages: 4,
    goals: ["skill_l_sit"],
    involves:
      "An L-sit is a hold where you press yourself up on straight arms with your legs held straight out in front, off the floor. It takes pressing strength through straight arms and wrists, plus strong abs and hip flexors to lift your legs. You can do it on the floor; push-up handles, parallettes or a dip station give your feet more room.",
  },
  {
    id: "crow_pose",
    title: "Crow Pose",
    subtitle: "Your first arm balance: lean forward, lift one foot, then both.",
    family: "crow",
    category: "core",
    stages: 3,
    goals: ["skill_crow"],
    involves:
      "In crow pose you balance on your hands with your knees resting on the backs of your upper arms and your feet off the floor. It's more about balance and wrist comfort than raw strength: you learn how far forward to lean, and use your fingers to steer. No equipment needed, just a cushion in front of you while you learn.",
  },
  {
    id: "pistol_squat",
    title: "Pistol Squat",
    subtitle: "Single-leg squat strength, from holding a support to a full pistol squat.",
    family: "pistol",
    category: "legs",
    stages: 4,
    goals: ["skill_pistol"],
    involves:
      "A pistol squat is a full squat on one leg, with the other leg held straight out in front. It needs strong legs, good balance and enough ankle and hip mobility to sit deep with your heel down. The build-up uses a sturdy support for your hands, then boxes that get lower, so you control the depth at every stage.",
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

/**
 * Which pathway to feature on the dashboard for each goal, in order of
 * preference. A locked skill falls back to the pathway that builds towards it.
 */
const FEATURED_FOR: Record<Goal, PathwayId[]> = {
  first_push_up: ["push_up_mastery"],
  first_pull_up: ["first_pull_up"],
  core_strength: ["core_hollow"],
  movement_mobility: ["squat_control"],
  overall_strength: [],
  build_muscle: [],
  foundations: [],
  skill_l_sit: ["l_sit", "core_hollow"],
  skill_crow: ["crow_pose", "push_up_mastery"],
  skill_pistol: ["pistol_squat", "squat_control"],
  skill_handstand: ["handstand_prep", "push_up_mastery"],
  skill_muscle_up: ["first_pull_up", "dip_prep"],
  skill_front_lever: ["first_pull_up", "core_hollow"],
};

/** The pathway to feature on the dashboard: the first goal's, falling back to push-ups. */
export function featuredPathway(views: PathwayView[], goals: readonly Goal[]): PathwayView {
  for (const goal of goals) {
    for (const id of FEATURED_FOR[goal]) {
      const match = views.find((v) => v.def.id === id && v.status !== "locked" && v.status !== "needs_equipment");
      if (match) return match;
    }
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
