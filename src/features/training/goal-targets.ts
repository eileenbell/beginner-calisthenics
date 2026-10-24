import { MILESTONES_BY_ID, SKILLS_BY_ID, type Goal, type Milestone, type SkillPath } from "@/domain";

// The long-term target shown for each onboarding goal. These are pathway
// destinations, not promises: nothing here says how long they take.

const GOAL_TARGET: Record<Goal, { skill: SkillPath["id"]; milestone: string }> = {
  first_push_up: { skill: "push_up_mastery", milestone: "push_first_floor" },
  first_pull_up: { skill: "first_pull_up", milestone: "pull_first" },
  overall_strength: { skill: "push_up_mastery", milestone: "push_first_floor" },
  core_strength: { skill: "core_hollow", milestone: "core_plank_45" },
  movement_mobility: { skill: "squat_control", milestone: "squat_tempo_3x8" },
  build_muscle: { skill: "push_up_mastery", milestone: "push_floor_5" },
  foundations: { skill: "squat_control", milestone: "squat_bw_3x12" },
};

export function goalTarget(goal: Goal): { skill: SkillPath; milestone: Milestone } {
  const t = GOAL_TARGET[goal];
  return { skill: SKILLS_BY_ID.get(t.skill)!, milestone: MILESTONES_BY_ID.get(t.milestone)! };
}
