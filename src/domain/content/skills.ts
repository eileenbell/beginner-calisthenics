import type { Equipment, FamilyId } from "../types";

export type SkillId =
  | "push_up_mastery"
  | "first_pull_up"
  | "squat_control"
  | "core_hollow"
  | "dip_prep"
  | "hang_grip"
  | "handstand_prep";

/**
 * A milestone is achieved when, in a single session, the user logs at least
 * `sets` sets of `exerciseId` each reaching `minReps` or `minSeconds`, without
 * reporting pain and without marking the exercise as poorly controlled.
 */
export interface Milestone {
  id: string;
  skillId: SkillId;
  order: number;
  title: string;
  description: string;
  exerciseId: string;
  sets: number;
  minReps?: number;
  minSeconds?: number;
}

export interface SkillPath {
  id: SkillId;
  name: string;
  summary: string;
  /** Families whose exercises train this skill. */
  families: FamilyId[];
  /** User needs at least one of these to train the skill. Empty = no equipment needed. */
  equipmentAnyOf: Equipment[];
  equipmentNote?: string;
  /**
   * Readiness gate: milestones that must be achieved before this skill is
   * unlocked, plus families that must have no pain reports in the last 30 days.
   */
  gate?: {
    requiredMilestones: string[];
    painFreeFamilies: FamilyId[];
    explanation: string;
  };
  milestones: Milestone[];
}

function m(skillId: SkillId, items: Omit<Milestone, "skillId" | "order">[]): Milestone[] {
  return items.map((item, index) => ({ ...item, skillId, order: index + 1 }));
}

export const SKILLS: SkillPath[] = [
  {
    id: "push_up_mastery",
    name: "Push-up mastery",
    summary: "From wall push-ups to ten clean floor push-ups.",
    families: ["push_up", "plank"],
    equipmentAnyOf: [],
    milestones: m("push_up_mastery", [
      { id: "push_wall_3x12", title: "Wall push-ups, 3 × 12", description: "Three sets of 12 controlled wall push-ups.", exerciseId: "wall_push_up", sets: 3, minReps: 12 },
      { id: "push_high_incline_3x10", title: "High incline, 3 × 10", description: "Three sets of 10 at waist height.", exerciseId: "high_incline_push_up", sets: 3, minReps: 10 },
      { id: "push_mid_incline_3x10", title: "Knee-height incline, 3 × 10", description: "Three sets of 10 at knee height.", exerciseId: "mid_incline_push_up", sets: 3, minReps: 10 },
      { id: "push_low_incline_3x8", title: "Low incline, 3 × 8", description: "Three sets of 8 on a low step.", exerciseId: "low_incline_push_up", sets: 3, minReps: 8 },
      { id: "push_first_floor", title: "First floor push-up", description: "One full floor push-up with good control.", exerciseId: "floor_push_up", sets: 1, minReps: 1 },
      { id: "push_floor_5", title: "5 floor push-ups", description: "Five floor push-ups in a single set.", exerciseId: "floor_push_up", sets: 1, minReps: 5 },
      { id: "push_floor_10", title: "10 floor push-ups", description: "Ten floor push-ups in a single set.", exerciseId: "floor_push_up", sets: 1, minReps: 10 },
    ]),
  },
  {
    id: "first_pull_up",
    name: "First pull-up",
    summary: "Grip, shoulder-blade control, holds and negatives, then the first full rep.",
    families: ["pull_up", "row"],
    equipmentAnyOf: ["pullup_bar", "rings", "gym"],
    equipmentNote:
      "You'll need a pull-up bar, rings or a gym for this path. A properly installed bar or a park with bars both work. Rows on a low bar or with bands are the best preparation until then.",
    milestones: m("first_pull_up", [
      { id: "pull_hang_20", title: "20-second hang", description: "Hang from the bar for 20 seconds.", exerciseId: "dead_hang", sets: 1, minSeconds: 20 },
      { id: "pull_hang_30", title: "30-second hang", description: "Hang for 30 seconds.", exerciseId: "dead_hang", sets: 1, minSeconds: 30 },
      { id: "pull_scap_10", title: "10 scapular pull-ups", description: "Ten shoulder-blade pulls in one set.", exerciseId: "scapular_pull_up", sets: 1, minReps: 10 },
      { id: "pull_flexed_10", title: "10-second top hold", description: "Hold your chin above the bar for 10 seconds.", exerciseId: "flexed_arm_hang", sets: 1, minSeconds: 10 },
      { id: "pull_negative_3", title: "3 slow negatives", description: "Three slow negative pull-ups in one set.", exerciseId: "negative_pull_up", sets: 1, minReps: 3 },
      { id: "pull_first", title: "First pull-up", description: "One full pull-up from straight arms.", exerciseId: "pull_up", sets: 1, minReps: 1 },
      { id: "pull_three", title: "3 pull-ups", description: "Three pull-ups in a single set.", exerciseId: "pull_up", sets: 1, minReps: 3 },
    ]),
  },
  {
    id: "squat_control",
    name: "Squat strength and control",
    summary: "From supported squats to slow, paused squats and single-leg work.",
    families: ["squat", "lunge"],
    equipmentAnyOf: [],
    milestones: m("squat_control", [
      { id: "squat_assisted_3x10", title: "Assisted squats, 3 × 10", description: "Three sets of 10 holding a support.", exerciseId: "assisted_squat", sets: 3, minReps: 10 },
      { id: "squat_box_3x10", title: "Box squats, 3 × 10", description: "Three sets of 10 to a chair without hands.", exerciseId: "box_squat", sets: 3, minReps: 10 },
      { id: "squat_bw_3x12", title: "Bodyweight squats, 3 × 12", description: "Three sets of 12 free squats.", exerciseId: "bodyweight_squat", sets: 3, minReps: 12 },
      { id: "squat_tempo_3x8", title: "Tempo squats, 3 × 8", description: "Three sets of 8 slow, paused squats.", exerciseId: "tempo_squat", sets: 3, minReps: 8 },
      { id: "squat_split_3x8", title: "Split squats, 3 × 8 each side", description: "Three sets of 8 per leg, unsupported.", exerciseId: "split_squat", sets: 3, minReps: 8 },
    ]),
  },
  {
    id: "core_hollow",
    name: "Core and hollow body",
    summary: "Planks and the hollow body position used across calisthenics.",
    families: ["plank", "hollow", "side_plank"],
    equipmentAnyOf: [],
    milestones: m("core_hollow", [
      { id: "core_deadbug_3x8", title: "Dead bugs, 3 × 8 each side", description: "Three controlled sets.", exerciseId: "dead_bug", sets: 3, minReps: 8 },
      { id: "core_plank_30", title: "30-second plank", description: "A 30-second forearm plank.", exerciseId: "forearm_plank", sets: 1, minSeconds: 30 },
      { id: "core_tuck_20", title: "20-second tuck hollow", description: "Hold the tuck hollow for 20 seconds.", exerciseId: "tuck_hollow_hold", sets: 1, minSeconds: 20 },
      { id: "core_plank_45", title: "45-second plank", description: "A 45-second forearm plank.", exerciseId: "forearm_plank", sets: 1, minSeconds: 45 },
      { id: "core_hollow_20", title: "20-second hollow hold", description: "Hold the full hollow body for 20 seconds.", exerciseId: "hollow_body_hold", sets: 1, minSeconds: 20 },
    ]),
  },
  {
    id: "dip_prep",
    name: "Dip preparation",
    summary: "Shoulder strength and control on parallel bars. Full dips come after this programme.",
    families: ["dip_prep", "push_up"],
    equipmentAnyOf: ["parallel_bars", "gym"],
    equipmentNote: "You'll need parallel bars (often at parks) or a gym dip station.",
    gate: {
      requiredMilestones: ["push_low_incline_3x8"],
      painFreeFamilies: ["push_up", "dip_prep"],
      explanation: "Dip work loads the front of the shoulders. It unlocks once you can do 3 × 8 low incline push-ups with no recent shoulder discomfort.",
    },
    milestones: m("dip_prep", [
      { id: "dip_support_10", title: "10-second support hold", description: "Hold yourself up on straight arms for 10 seconds.", exerciseId: "support_hold", sets: 1, minSeconds: 10 },
      { id: "dip_support_30", title: "30-second support hold", description: "Hold for 30 seconds.", exerciseId: "support_hold", sets: 1, minSeconds: 30 },
      { id: "dip_scap_3x8", title: "Scapular dips, 3 × 8", description: "Three sets of 8.", exerciseId: "scapular_dip", sets: 3, minReps: 8 },
      { id: "dip_negative_3", title: "3 controlled negatives", description: "Three slow, partial-range negative dips.", exerciseId: "negative_dip", sets: 1, minReps: 3 },
    ]),
  },
  {
    id: "hang_grip",
    name: "Hanging and grip",
    summary: "Grip endurance and comfortable shoulders under a bar.",
    families: ["pull_up"],
    equipmentAnyOf: ["pullup_bar", "rings", "gym", "low_bar"],
    equipmentNote: "You'll need something to hang from: a pull-up bar, rings, a low bar or a gym.",
    milestones: m("hang_grip", [
      { id: "grip_supported_30", title: "30-second supported hang", description: "Feet-supported hang for 30 seconds.", exerciseId: "feet_supported_hang", sets: 1, minSeconds: 30 },
      { id: "grip_hang_10", title: "10-second hang", description: "A full hang for 10 seconds.", exerciseId: "dead_hang", sets: 1, minSeconds: 10 },
      { id: "grip_hang_3x20", title: "Hang 3 × 20 seconds", description: "Three hangs of 20 seconds.", exerciseId: "dead_hang", sets: 3, minSeconds: 20 },
      { id: "grip_hang_45", title: "45-second hang", description: "A single 45-second hang.", exerciseId: "dead_hang", sets: 1, minSeconds: 45 },
    ]),
  },
  {
    id: "handstand_prep",
    name: "Handstand preparation",
    summary: "Gradual, wall-supported work towards a handstand, unlocked once you're ready.",
    families: ["handstand", "pike"],
    equipmentAnyOf: [],
    gate: {
      requiredMilestones: ["push_floor_5", "core_plank_45"],
      painFreeFamilies: ["push_up", "pike", "plank", "handstand"],
      explanation:
        "Handstand work puts your full bodyweight through your wrists and shoulders. It unlocks after 5 floor push-ups and a 45-second plank, with no wrist or shoulder discomfort reported in the last 30 days.",
    },
    milestones: m("handstand_prep", [
      { id: "hs_pike_hold_20", title: "20-second elevated pike hold", description: "Hold the elevated pike for 20 seconds.", exerciseId: "pike_hold_on_step", sets: 1, minSeconds: 20 },
      { id: "hs_pike_pushup_3x5", title: "Pike push-ups, 3 × 5", description: "Three sets of 5.", exerciseId: "pike_push_up", sets: 3, minReps: 5 },
      { id: "hs_wall_walk_3", title: "3 partial wall walks", description: "Three controlled wall walks to about 45 degrees.", exerciseId: "wall_walk_partial", sets: 1, minReps: 3 },
      { id: "hs_wall_hold_10", title: "10-second wall handstand", description: "Chest-to-wall hold for 10 seconds.", exerciseId: "chest_to_wall_hold", sets: 1, minSeconds: 10 },
      { id: "hs_wall_hold_30", title: "30-second wall handstand", description: "Chest-to-wall hold for 30 seconds.", exerciseId: "chest_to_wall_hold", sets: 1, minSeconds: 30 },
    ]),
  },
];

export const MILESTONES = SKILLS.flatMap((s) => s.milestones);
export const MILESTONES_BY_ID: ReadonlyMap<string, Milestone> = new Map(MILESTONES.map((x) => [x.id, x]));
export const SKILLS_BY_ID: ReadonlyMap<SkillId, SkillPath> = new Map(SKILLS.map((s) => [s.id, s]));

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_workout", title: "First workout", description: "You finished your first session. The hardest one is done." },
  { id: "first_full_week", title: "First full week", description: "Every planned session in a week, completed." },
  { id: "first_progression", title: "Levelled up", description: "Your first move to a harder variation, earned through consistent, controlled reps." },
  { id: "first_push_up", title: "First push-up", description: "A full floor push-up with good control." },
  { id: "first_pull_up", title: "First pull-up", description: "A full pull-up from straight arms." },
];
