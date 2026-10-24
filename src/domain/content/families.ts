import type { FamilyId, ProgressionFamily } from "../types";

export const FAMILIES: ProgressionFamily[] = [
  {
    id: "push_up",
    name: "Push-up",
    pattern: "horizontal_push",
    description: "From the wall to the floor. Each step lowers your hands and puts more of your bodyweight through your arms.",
    ladder: [
      "wall_push_up",
      "high_incline_push_up",
      "mid_incline_push_up",
      "low_incline_push_up",
      "floor_push_up",
      "feet_elevated_push_up",
    ],
  },
  {
    id: "pike",
    name: "Pike push-up",
    pattern: "vertical_push",
    description: "Shoulder pressing with your hips high, building towards handstand strength.",
    ladder: ["bench_pike_push_up", "pike_push_up", "elevated_pike_push_up"],
  },
  {
    id: "squat",
    name: "Squat",
    pattern: "squat",
    description: "From holding on for balance to slow, paused bodyweight squats.",
    ladder: ["assisted_squat", "box_squat", "bodyweight_squat", "tempo_squat"],
  },
  {
    id: "lunge",
    name: "Split squat and lunge",
    pattern: "lunge",
    description: "Single-leg strength and balance, from supported split squats to elevated split squats.",
    ladder: ["supported_split_squat", "split_squat", "reverse_lunge", "rear_foot_elevated_split_squat"],
  },
  {
    id: "hinge",
    name: "Hip hinge and bridge",
    pattern: "hinge",
    description: "Strength for the back of your hips, from two-leg bridges to single-leg hip thrusts.",
    ladder: ["glute_bridge", "marching_glute_bridge", "single_leg_glute_bridge", "single_leg_hip_thrust"],
  },
  {
    id: "row",
    name: "Row",
    pattern: "horizontal_pull",
    description: "Horizontal pulling, from leaning back on a high bar to full bodyweight rows. Bands work at home.",
    ladder: ["steep_inverted_row", "incline_inverted_row", "bent_knee_inverted_row", "inverted_row"],
    fallbackFamily: "upper_back_floor",
    equipmentNote:
      "Rows need a low bar, rings, resistance bands or a gym. Without them, you'll do floor-based upper-back work instead, which helps posture but doesn't build the same pulling strength.",
  },
  {
    id: "upper_back_floor",
    name: "Upper back (floor)",
    pattern: "horizontal_pull",
    description: "Upper-back and shoulder-blade work you can do lying on the floor with no equipment.",
    ladder: ["prone_y_raise", "reverse_snow_angel"],
  },
  {
    id: "pull_up",
    name: "Pull-up",
    pattern: "vertical_pull",
    description: "Hangs, shoulder-blade pulls, holds and slow negatives on the way to your first pull-up.",
    ladder: ["dead_hang", "scapular_pull_up", "flexed_arm_hang", "negative_pull_up", "pull_up"],
    fallbackFamily: "row",
    equipmentNote:
      "Pull-up work needs a pull-up bar, rings or a gym. Without one, your plan uses rows (if you have bands or a low bar) or floor upper-back work.",
  },
  {
    id: "plank",
    name: "Plank",
    pattern: "core_anti_extension",
    description: "Holding a strong, straight body, from an incline to a full forearm plank.",
    ladder: ["incline_plank", "kneeling_plank", "forearm_plank"],
  },
  {
    id: "hollow",
    name: "Hollow body",
    pattern: "core_anti_extension",
    description: "Core control for calisthenics, from dead bugs to the full hollow hold.",
    ladder: ["dead_bug_bent_knee", "dead_bug", "tuck_hollow_hold", "hollow_body_hold"],
  },
  {
    id: "side_plank",
    name: "Side plank",
    pattern: "core_lateral",
    description: "Strength for the sides of your trunk.",
    ladder: ["kneeling_side_plank", "side_plank"],
  },
  {
    id: "dip_prep",
    name: "Dip preparation",
    pattern: "support",
    description: "Support holds and controlled lowering on parallel bars. Full dips are beyond this 12-week programme.",
    ladder: ["support_hold", "scapular_dip", "negative_dip"],
    equipmentNote: "Dip preparation needs parallel bars (often found at parks) or a gym dip station.",
  },
  {
    id: "handstand",
    name: "Handstand preparation",
    pattern: "vertical_push",
    description: "Gradual exposure to bearing weight overhead. Unlocks only once you've built the push and core prerequisites.",
    ladder: ["pike_hold_on_step", "wall_walk_partial", "chest_to_wall_hold"],
  },
];

export const FAMILIES_BY_ID: ReadonlyMap<FamilyId, ProgressionFamily> = new Map(FAMILIES.map((f) => [f.id, f]));

export function getFamily(id: FamilyId): ProgressionFamily {
  const family = FAMILIES_BY_ID.get(id);
  if (!family) throw new Error(`Unknown family: ${id}`);
  return family;
}
