import { getExercise } from "../content/exercises";
import { getFamily } from "../content/families";
import { SKILLS_BY_ID, type SkillId } from "../content/skills";
import {
  isSkillGoal,
  type DaysPerWeek,
  type Equipment,
  type Exercise,
  type FamilyId,
  type FamilyState,
  type Goal,
  type PlannedItem,
  type ProgrammePhase,
  type SessionMinutes,
  type SessionPlan,
  type SessionTemplate,
  type UserTrainingProfile,
} from "../types";
import { availableAtLevel, clampToRange, expandEquipment, isAvailable, rangeOf } from "./catalogue";

export const PROGRAMME_ID = "beginner_foundations_12";
export const PROGRAMME_WEEKS = 12;
export const LIGHTER_WEEKS = [4, 8];
export const RETURNING_AFTER_DAYS = 14;

// ------------------------------------------------------------------ schedule

/** Weekday offsets from the start of the programme week (0 = first day). */
export const SUGGESTED_DAY_OFFSETS: Record<DaysPerWeek, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
};

export function weekTemplates(daysPerWeek: DaysPerWeek, week: number): SessionTemplate[] {
  if (daysPerWeek === 2) return ["A", "B"];
  if (daysPerWeek === 3) return week % 2 === 1 ? ["A", "B", "A"] : ["B", "A", "B"];
  return ["U", "L", "U", "L"];
}

export interface ScheduledSlot {
  week: number;
  slot: number;
  template: SessionTemplate;
  /** Offset in days from the programme start date. */
  dayOffset: number;
}

export function buildSchedule(daysPerWeek: DaysPerWeek, weeks = PROGRAMME_WEEKS): ScheduledSlot[] {
  const slots: ScheduledSlot[] = [];
  for (let week = 1; week <= weeks; week++) {
    weekTemplates(daysPerWeek, week).forEach((template, slot) => {
      slots.push({ week, slot, template, dayOffset: (week - 1) * 7 + SUGGESTED_DAY_OFFSETS[daysPerWeek][slot] });
    });
  }
  return slots;
}

export function phaseOf(week: number): ProgrammePhase {
  if (week <= 4) return "foundations";
  if (week <= 8) return "build";
  return "consolidate";
}

/** Programme week from the start date, 1-based and capped at the programme length. */
export function programmeWeek(startedOn: Date, today: Date): number {
  const days = Math.floor((startOfDay(today).getTime() - startOfDay(startedOn).getTime()) / 86_400_000);
  return Math.min(PROGRAMME_WEEKS, Math.max(1, Math.floor(days / 7) + 1));
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ------------------------------------------------------------------ resolving exercises

export interface ResolvedFamily {
  exercise: Exercise;
  target: number;
  familyId: FamilyId;
  /** Set when equipment forced a substitute or fallback. */
  note?: string;
}

/**
 * The exercise a user should do next for a family, honouring their equipment.
 * Returns null if the family is paused or nothing in it is available.
 */
export function resolveFamily(
  state: FamilyState | undefined,
  familyId: FamilyId,
  equipment: readonly Equipment[],
): ResolvedFamily | null {
  if (!state || state.paused) return null;
  const set = expandEquipment(equipment);
  const current = getExercise(state.exerciseId);
  if (isAvailable(current, set)) {
    return { exercise: current, target: clampToRange(current, state.target), familyId };
  }
  for (let level = current.level; level >= 1; level--) {
    const options = availableAtLevel(familyId, level, equipment);
    if (options.length > 0) {
      const chosen = options[0];
      return {
        exercise: chosen,
        target: level === current.level ? clampToRange(chosen, state.target) : rangeOf(chosen)[0],
        familyId,
        note: `${current.name} needs equipment you haven't selected, so you'll do ${chosen.name.toLowerCase()} instead.`,
      };
    }
  }
  return null;
}

// ------------------------------------------------------------------ session templates

const TEMPLATE_SLOTS: Record<SessionTemplate, FamilyId[]> = {
  A: ["squat", "push_up", "row", "plank", "hinge", "lunge"],
  B: ["hinge", "push_up", "pull_up", "hollow", "lunge", "side_plank"],
  U: ["push_up", "row", "pull_up", "plank", "pike", "hollow"],
  L: ["squat", "hinge", "lunge", "side_plank", "hollow", "plank"],
};

export const TEMPLATE_TITLES: Record<SessionTemplate, string> = {
  A: "Full body A",
  B: "Full body B",
  U: "Upper body",
  L: "Lower body and core",
};

const PHASE_OBJECTIVES: Record<ProgrammePhase, string> = {
  foundations: "Learn each movement and build the habit. Smooth, controlled reps matter more than effort today.",
  build: "Add reps and earn harder variations. Aim to finish each set with one or two good reps left.",
  consolidate: "Lock in what you've built. Keep form crisp as the variations get harder.",
};

const MAIN_SLOTS: Record<SessionMinutes, number> = { 15: 4, 25: 5, 40: 6 };

/** Goal-driven priority for the skill practice slot. */
const GOAL_SKILL_FAMILIES: Record<Goal, FamilyId[]> = {
  first_pull_up: ["pull_up", "row"],
  first_push_up: ["plank", "push_up"],
  core_strength: ["hollow", "side_plank"],
  movement_mobility: ["handstand", "hollow"],
  overall_strength: ["dip_prep", "pike", "hollow"],
  build_muscle: ["dip_prep", "pike"],
  foundations: ["hollow", "side_plank"],
  skill_l_sit: ["l_sit", "hollow"],
  skill_crow: ["crow", "plank"],
  skill_pistol: ["pistol", "lunge"],
  // Long-term skills practise their foundations until FORM programmes the skill itself.
  skill_handstand: ["handstand", "pike", "hollow"],
  skill_muscle_up: ["pull_up", "dip_prep", "row"],
  skill_front_lever: ["pull_up", "hollow", "row"],
};

const GATED_FAMILIES: Partial<Record<FamilyId, SkillId>> = {
  handstand: "handstand_prep",
  dip_prep: "dip_prep",
  l_sit: "l_sit",
  crow: "crow_pose",
  pistol: "pistol_squat",
};

export interface BuildSessionInput {
  profile: UserTrainingProfile;
  states: ReadonlyMap<FamilyId, FamilyState>;
  week: number;
  template: SessionTemplate;
  /** Days since the last completed session, or null if this is the first. */
  daysSinceLastSession: number | null;
  /** Skills whose readiness gates are met. */
  unlockedSkills: ReadonlySet<SkillId>;
}

function baseSets(minutes: SessionMinutes, slotIndex: number): number {
  if (minutes === 15) return 2;
  if (minutes === 25) return slotIndex < 2 ? 3 : 2;
  return 3;
}

function pushLevel(states: ReadonlyMap<FamilyId, FamilyState>): number {
  const s = states.get("push_up");
  return s ? getExercise(s.exerciseId).level : 1;
}

/** Resolve a slot, following fallback families when equipment rules a family out. */
function resolveSlot(
  familyId: FamilyId,
  input: BuildSessionInput,
  used: Set<FamilyId>,
): { resolved: ResolvedFamily | null; notice?: string } {
  const { states, profile } = input;
  let id: FamilyId | undefined = familyId;
  const notices: string[] = [];
  while (id) {
    const state = states.get(id);
    if (state?.paused) {
      notices.push(
        `${getFamily(id).name} is paused after you reported discomfort. Resume it from your Progress page when you're ready.`,
      );
      return { resolved: null, notice: notices.join(" ") };
    }
    if (!used.has(id)) {
      const resolved = resolveFamily(state, id, profile.equipment);
      if (resolved) {
        return { resolved, notice: notices.length ? notices.join(" ") : undefined };
      }
    }
    const family = getFamily(id);
    if (family.equipmentNote && !used.has(id)) notices.push(family.equipmentNote);
    id = family.fallbackFamily;
  }
  return { resolved: null, notice: notices.length ? notices.join(" ") : undefined };
}

export function buildSessionPlan(input: BuildSessionInput): SessionPlan {
  const { profile, week, template, daysSinceLastSession } = input;
  const minutes = profile.sessionMinutes;
  const phase = phaseOf(week);
  const notices: string[] = [];
  const used = new Set<FamilyId>();
  const main: PlannedItem[] = [];

  const returning = daysSinceLastSession !== null && daysSinceLastSession >= RETURNING_AFTER_DAYS;
  const lighter = LIGHTER_WEEKS.includes(week);
  if (returning) {
    notices.push("Welcome back. After a break, this session has one fewer set per exercise so you can ease back in.");
  } else if (lighter) {
    notices.push(`Week ${week} is a lighter week with fewer sets, giving your body a chance to consolidate.`);
  }

  const slots = [...TEMPLATE_SLOTS[template]];
  // Pike work needs some pushing strength first; swap it for side plank until then.
  const pikeIndex = slots.indexOf("pike");
  if (pikeIndex >= 0 && pushLevel(input.states) < 3) slots[pikeIndex] = "side_plank";

  // Skill practice runs in every 40-minute session. With a specific skill goal
  // it also runs in 25-minute sessions, in place of the fifth main exercise.
  const skillGoals = profile.goals.filter(isSkillGoal);
  const shortSkillSlot = minutes === 25 && skillGoals.length > 0;

  let nextSlot = 0;
  const fillMain = (limit: number) => {
    while (nextSlot < slots.length && main.length < limit) {
      const { resolved, notice } = resolveSlot(slots[nextSlot++], input, used);
      if (notice && !notices.includes(notice)) notices.push(notice);
      if (!resolved || used.has(resolved.familyId)) continue;
      used.add(resolved.familyId);
      main.push(toPlanned(resolved, baseSets(minutes, main.length), { week, returning, lighter }));
    }
  };
  fillMain(MAIN_SLOTS[minutes] - (shortSkillSlot ? 1 : 0));

  if (minutes === 40 || shortSkillSlot) {
    // Skill goals come first. Shorter sessions only use them, so a locked skill
    // falls back to the session's own fifth exercise rather than generic core work.
    const goals = shortSkillSlot ? skillGoals : [...skillGoals, ...profile.goals.filter((g) => !isSkillGoal(g))];
    const priorities = goals.flatMap((g) => GOAL_SKILL_FAMILIES[g]).concat(shortSkillSlot ? [] : ["hollow", "side_plank"]);
    for (const familyId of priorities) {
      if (used.has(familyId)) continue;
      if (familyId === "pike" && pushLevel(input.states) < 3) continue;
      const gate = GATED_FAMILIES[familyId];
      if (gate && !input.unlockedSkills.has(gate)) continue;
      const skill = gate ? SKILLS_BY_ID.get(gate) : undefined;
      if (skill && skill.equipmentAnyOf.length && !skill.equipmentAnyOf.some((e) => expandEquipment(profile.equipment).has(e))) continue;
      const state = input.states.get(familyId);
      const resolved = resolveFamily(state, familyId, profile.equipment);
      if (!resolved) continue;
      used.add(familyId);
      // Skill practice goes first, while fresh.
      main.unshift({ ...toPlanned(resolved, 2, { week, returning, lighter }), note: "Skill practice: quality over quantity." });
      break;
    }
  }
  // A 25-minute session whose skill isn't available yet keeps its fifth exercise.
  fillMain(MAIN_SLOTS[minutes]);

  const items: PlannedItem[] = [...buildWarmup(main, minutes), ...main, ...buildCooldown(main)];
  return {
    template,
    title: TEMPLATE_TITLES[template],
    objective: PHASE_OBJECTIVES[phase],
    week,
    phase,
    items,
    notices,
    estimatedMinutes: estimateMinutes(items),
  };
}

function toPlanned(
  resolved: ResolvedFamily,
  sets: number,
  ctx: { week: number; returning: boolean; lighter: boolean },
): PlannedItem {
  const { exercise } = resolved;
  let n = ctx.week === 1 ? 2 : sets;
  if (ctx.returning) n = Math.max(1, n - 1);
  else if (ctx.lighter) n = Math.max(2, n - 1);
  const [minSets, maxSets] = exercise.dosage.sets;
  n = Math.min(maxSets, Math.max(ctx.returning ? 1 : minSets, n));
  return {
    exerciseId: exercise.id,
    familyId: resolved.familyId,
    block: "main",
    sets: n,
    measure: exercise.measure,
    perSide: exercise.perSide,
    target: resolved.target,
    range: rangeOf(exercise),
    restSeconds: exercise.dosage.restSeconds,
    note: resolved.note ?? exercise.limitationNote,
  };
}

function simple(exerciseId: string, block: "warmup" | "cooldown"): PlannedItem {
  const exercise = getExercise(exerciseId);
  const range = rangeOf(exercise);
  return {
    exerciseId,
    familyId: null,
    block,
    sets: 1,
    measure: exercise.measure,
    perSide: exercise.perSide,
    target: range[1],
    range,
    restSeconds: 0,
  };
}

const HAND_SUPPORTED: FamilyId[] = ["push_up", "plank", "pike", "handstand", "side_plank", "l_sit", "crow"];
const PUSHING: FamilyId[] = ["push_up", "pike", "handstand", "dip_prep", "l_sit", "crow"];
const LEGS: FamilyId[] = ["squat", "lunge", "pistol"];

function buildWarmup(main: PlannedItem[], minutes: SessionMinutes): PlannedItem[] {
  const families = new Set(main.map((m) => m.familyId));
  const ids = ["march_in_place", "arm_circles"];
  if ([...families].some((f) => f && HAND_SUPPORTED.includes(f))) ids.push("wrist_prep");
  ids.push("cat_cow");
  if (families.has("hinge") || families.has("squat") || families.has("pistol")) ids.push("hip_hinge_drill");
  if (minutes >= 25) ids.push("lunge_with_reach");
  if (minutes >= 25 && [...families].some((f) => f && PUSHING.includes(f))) ids.push("wall_scapular_push_up");
  return ids.map((id) => simple(id, "warmup"));
}

function buildCooldown(main: PlannedItem[]): PlannedItem[] {
  const families = new Set(main.map((m) => m.familyId));
  const ids = ["childs_pose"];
  if ([...families].some((f) => f && LEGS.includes(f))) ids.push("kneeling_hip_flexor_stretch");
  if (families.has("hinge")) ids.push("supine_hamstring_stretch");
  if ([...families].some((f) => f && PUSHING.includes(f))) ids.push("chest_opener");
  return ids.map((id) => simple(id, "cooldown"));
}

const SECONDS_PER_REP = 3.5;
const TRANSITION_SECONDS = 20;

export function estimateMinutes(items: PlannedItem[]): number {
  let seconds = 0;
  for (const item of items) {
    const sides = item.perSide ? 2 : 1;
    const work = item.measure === "reps" ? item.target * SECONDS_PER_REP : item.target;
    seconds += item.sets * work * sides + Math.max(0, item.sets - 1) * item.restSeconds + TRANSITION_SECONDS;
  }
  return Math.round(seconds / 60);
}
