import type { Equipment, FamilyId } from "../types";

export type SkillId =
  | "push_up_mastery"
  | "first_pull_up"
  | "squat_control"
  | "core_hollow"
  | "dip_prep"
  | "hang_grip"
  | "handstand_prep"
  | "l_sit"
  | "crow_pose"
  | "pistol_squat";

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
  {
    id: "l_sit",
    name: "L-sit",
    summary: "From a foot-supported hold to both legs straight out in front, held on straight arms.",
    families: ["l_sit", "hollow"],
    equipmentAnyOf: [],
    gate: {
      requiredMilestones: ["core_deadbug_3x8", "push_mid_incline_3x10"],
      painFreeFamilies: ["push_up", "plank", "l_sit"],
      explanation:
        "L-sit work presses your bodyweight down through straight arms and wrists. It unlocks after 3 × 8 dead bugs each side and 3 × 10 knee-height incline push-ups, with no wrist, shoulder or core discomfort reported in the last 30 days.",
    },
    milestones: m("l_sit", [
      { id: "lsit_supported_3x20", title: "Foot-supported L-sit, 3 × 20 seconds", description: "Three 20-second holds with your heels down.", exerciseId: "foot_supported_l_sit", sets: 3, minSeconds: 20 },
      { id: "lsit_tuck_10", title: "10-second tuck L-sit", description: "Hips and feet off the floor for 10 seconds.", exerciseId: "tuck_l_sit", sets: 1, minSeconds: 10 },
      { id: "lsit_tuck_3x15", title: "Tuck L-sit, 3 × 15 seconds", description: "Three 15-second tuck holds.", exerciseId: "tuck_l_sit", sets: 3, minSeconds: 15 },
      { id: "lsit_one_leg_10", title: "One-leg L-sit, 10 seconds each side", description: "One leg straight, held for 10 seconds on each side.", exerciseId: "one_leg_l_sit", sets: 1, minSeconds: 10 },
      { id: "lsit_first_5", title: "5-second L-sit", description: "Both legs straight and off the floor for 5 seconds.", exerciseId: "l_sit", sets: 1, minSeconds: 5 },
      { id: "lsit_10", title: "10-second L-sit", description: "A full L-sit held for 10 seconds.", exerciseId: "l_sit", sets: 1, minSeconds: 10 },
    ]),
  },
  {
    id: "crow_pose",
    name: "Crow pose",
    summary: "Your first arm balance: lean forward, lift one foot, then both.",
    families: ["crow", "push_up"],
    equipmentAnyOf: [],
    gate: {
      requiredMilestones: ["push_low_incline_3x8", "core_plank_30"],
      painFreeFamilies: ["push_up", "plank", "crow"],
      explanation:
        "Crow pose balances almost all your weight on bent arms and wrists. It unlocks after 3 × 8 low incline push-ups and a 30-second plank, with no wrist or shoulder discomfort reported in the last 30 days.",
    },
    milestones: m("crow_pose", [
      { id: "crow_lean_3x20", title: "Crow lean, 3 × 20 seconds", description: "Three 20-second leans with your toes on the floor.", exerciseId: "crow_lean", sets: 3, minSeconds: 20 },
      { id: "crow_one_foot_10", title: "One foot up, 10 seconds each side", description: "Balance with one foot lifted for 10 seconds on each side.", exerciseId: "one_foot_crow", sets: 1, minSeconds: 10 },
      { id: "crow_first_5", title: "5-second crow", description: "Both feet off the floor for 5 seconds.", exerciseId: "crow_pose", sets: 1, minSeconds: 5 },
      { id: "crow_15", title: "15-second crow", description: "A full crow pose held for 15 seconds.", exerciseId: "crow_pose", sets: 1, minSeconds: 15 },
    ]),
  },
  {
    id: "pistol_squat",
    name: "Pistol squat",
    summary: "Single-leg squat strength, from holding a support to a full pistol squat.",
    families: ["pistol", "squat", "lunge"],
    equipmentAnyOf: [],
    gate: {
      requiredMilestones: ["squat_bw_3x12", "squat_split_3x8"],
      painFreeFamilies: ["squat", "lunge", "pistol"],
      explanation:
        "Pistol work puts all your weight through one knee and hip at deep angles. It unlocks after 3 × 12 bodyweight squats and 3 × 8 split squats each side, with no knee or hip discomfort reported in the last 30 days.",
    },
    milestones: m("pistol_squat", [
      { id: "pistol_assisted_3x6", title: "Assisted pistols, 3 × 6 each side", description: "Three sets of 6 per leg, holding a support.", exerciseId: "assisted_pistol_squat", sets: 3, minReps: 6 },
      { id: "pistol_box_3x5", title: "Box pistols, 3 × 5 each side", description: "Three sets of 5 per leg to a knee-height box.", exerciseId: "box_pistol_squat", sets: 3, minReps: 5 },
      { id: "pistol_low_box_3x3", title: "Low box pistols, 3 × 3 each side", description: "Three sets of 3 per leg to a low step.", exerciseId: "low_box_pistol_squat", sets: 3, minReps: 3 },
      { id: "pistol_first", title: "First pistol squat", description: "One full pistol squat on each leg.", exerciseId: "pistol_squat", sets: 1, minReps: 1 },
      { id: "pistol_3", title: "3 pistol squats each side", description: "Three pistol squats per leg in a single set.", exerciseId: "pistol_squat", sets: 1, minReps: 3 },
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
  { id: "first_l_sit", title: "First L-sit", description: "Both legs straight and off the floor, held with good control." },
  { id: "first_crow", title: "First crow", description: "Both feet off the floor, balanced on your hands." },
  { id: "first_pistol", title: "First pistol squat", description: "A full single-leg squat on each leg, with good control." },
];
