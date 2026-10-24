import { MILESTONES, SKILLS, type Milestone, type SkillPath } from "../content/skills";
import type { Equipment, ExerciseFeedback, FamilyId, SetResult } from "../types";
import { expandEquipment } from "./catalogue";
import { PAIN_HISTORY_DAYS } from "./progression";

export interface LoggedExercise {
  exerciseId: string;
  sets: SetResult[];
  feedback: ExerciseFeedback | null;
  goodControl: boolean | null;
}

export function meetsMilestone(milestone: Milestone, logged: LoggedExercise): boolean {
  if (logged.exerciseId !== milestone.exerciseId) return false;
  if (logged.feedback === "pain" || logged.goodControl === false) return false;
  const qualifying = logged.sets.filter((s) => {
    if (milestone.minReps !== undefined) return (s.reps ?? 0) >= milestone.minReps;
    if (milestone.minSeconds !== undefined) return (s.seconds ?? 0) >= milestone.minSeconds;
    return false;
  });
  return qualifying.length >= milestone.sets;
}

/**
 * Milestones newly achieved in a session. Milestones in a skill are earned in
 * order, but a later milestone also completes earlier ones in the same skill
 * that share the exercise (e.g. 5 floor push-ups implies the first one).
 */
export function newMilestones(session: LoggedExercise[], achieved: ReadonlySet<string>): string[] {
  const earned = new Set<string>();
  for (const milestone of MILESTONES) {
    if (achieved.has(milestone.id) || earned.has(milestone.id)) continue;
    if (session.some((logged) => meetsMilestone(milestone, logged))) {
      earned.add(milestone.id);
      for (const earlier of MILESTONES) {
        if (
          earlier.skillId === milestone.skillId &&
          earlier.exerciseId === milestone.exerciseId &&
          earlier.order < milestone.order &&
          !achieved.has(earlier.id)
        ) {
          earned.add(earlier.id);
        }
      }
    }
  }
  return [...earned];
}

export interface PainEvent {
  familyId: FamilyId;
  at: string;
}

export interface SkillReadiness {
  unlocked: boolean;
  hasEquipment: boolean;
  reason?: string;
}

export function skillReadiness(
  skill: SkillPath,
  achieved: ReadonlySet<string>,
  painEvents: PainEvent[],
  equipment: readonly Equipment[],
  now: Date,
): SkillReadiness {
  const set = expandEquipment(equipment);
  const hasEquipment = skill.equipmentAnyOf.length === 0 || skill.equipmentAnyOf.some((e) => set.has(e));
  if (!skill.gate) return { unlocked: true, hasEquipment, reason: hasEquipment ? undefined : skill.equipmentNote };
  const cutoff = now.getTime() - PAIN_HISTORY_DAYS * 86_400_000;
  const missing = skill.gate.requiredMilestones.filter((id) => !achieved.has(id));
  const recentPain = painEvents.some(
    (p) => skill.gate!.painFreeFamilies.includes(p.familyId) && new Date(p.at).getTime() >= cutoff,
  );
  const unlocked = missing.length === 0 && !recentPain;
  return { unlocked, hasEquipment, reason: unlocked ? (hasEquipment ? undefined : skill.equipmentNote) : skill.gate.explanation };
}

export function unlockedSkills(
  achieved: ReadonlySet<string>,
  painEvents: PainEvent[],
  equipment: readonly Equipment[],
  now: Date,
): Set<SkillPath["id"]> {
  return new Set(
    SKILLS.filter((s) => skillReadiness(s, achieved, painEvents, equipment, now).unlocked).map((s) => s.id),
  );
}

/** Next milestone to aim for in a skill, or null when the path is complete. */
export function nextMilestone(skill: SkillPath, achieved: ReadonlySet<string>): Milestone | null {
  return skill.milestones.find((m) => !achieved.has(m.id)) ?? null;
}

export interface AchievementFacts {
  completedSessions: number;
  /** True if any programme week has all of its planned sessions completed. */
  hasFullWeek: boolean;
  progressions: number;
  achievedMilestones: ReadonlySet<string>;
}

export function earnedAchievements(facts: AchievementFacts): string[] {
  const out: string[] = [];
  if (facts.completedSessions >= 1) out.push("first_workout");
  if (facts.hasFullWeek) out.push("first_full_week");
  if (facts.progressions >= 1) out.push("first_progression");
  if (facts.achievedMilestones.has("push_first_floor")) out.push("first_push_up");
  if (facts.achievedMilestones.has("pull_first")) out.push("first_pull_up");
  return out;
}
