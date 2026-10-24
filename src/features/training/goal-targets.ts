import { MILESTONES_BY_ID, roadmapForGoal, SKILLS_BY_ID, type Goal, type Milestone, type Roadmap, type SkillPath } from "@/domain";

// The long-term target shown for each onboarding goal. These are pathway
// destinations, not promises: nothing here says how long they take. Long-term
// skills point at the last foundation milestone FORM can track, plus their roadmap.

const GOAL_TARGET: Record<Goal, { skill: SkillPath["id"]; milestone: string }> = {
  first_push_up: { skill: "push_up_mastery", milestone: "push_first_floor" },
  first_pull_up: { skill: "first_pull_up", milestone: "pull_first" },
  overall_strength: { skill: "push_up_mastery", milestone: "push_first_floor" },
  core_strength: { skill: "core_hollow", milestone: "core_plank_45" },
  movement_mobility: { skill: "squat_control", milestone: "squat_tempo_3x8" },
  build_muscle: { skill: "push_up_mastery", milestone: "push_floor_5" },
  foundations: { skill: "squat_control", milestone: "squat_bw_3x12" },
  skill_l_sit: { skill: "l_sit", milestone: "lsit_first_5" },
  skill_crow: { skill: "crow_pose", milestone: "crow_first_5" },
  skill_pistol: { skill: "pistol_squat", milestone: "pistol_first" },
  skill_handstand: { skill: "handstand_prep", milestone: "hs_wall_hold_30" },
  skill_muscle_up: { skill: "first_pull_up", milestone: "pull_three" },
  skill_front_lever: { skill: "first_pull_up", milestone: "pull_three" },
};

export function goalTarget(goal: Goal): { skill: SkillPath; milestone: Milestone; roadmap: Roadmap | null } {
  const t = GOAL_TARGET[goal];
  return { skill: SKILLS_BY_ID.get(t.skill)!, milestone: MILESTONES_BY_ID.get(t.milestone)!, roadmap: roadmapForGoal(goal) };
}
