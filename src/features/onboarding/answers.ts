import { z } from "zod";
import {
  checkTrainingDays,
  DAYS_PER_WEEK,
  ENVIRONMENTS,
  EQUIPMENT,
  EXPERIENCE,
  GOALS,
  isValidTimeZone,
  PUSH_TEST_VARIATIONS,
  SESSION_MINUTES,
  SQUAT_TEST_ANSWERS,
  TRAINING_DAYS_MESSAGES,
  type AssessmentInput,
  type DaysPerWeek,
  type Equipment,
  type Experience,
  type Goal,
  type SessionMinutes,
  type TrainingEnvironment,
  type UserTrainingProfile,
} from "@/domain";

// Onboarding answers are saved step by step as JSON (onboarding_responses.answers)
// so the flow can be resumed. These schemas validate each step on the server
// and turn the saved answers into engine inputs.

export const ONBOARDING_STEPS = ["goals", "experience", "schedule", "equipment", "summary"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export const STEP_PATHS: Record<OnboardingStepId, string> = {
  goals: "/onboarding/goals",
  experience: "/onboarding/experience",
  schedule: "/onboarding/schedule",
  equipment: "/onboarding/equipment",
  summary: "/onboarding/plan",
};

/** The goals offered in onboarding, in display order. */
export const GOAL_OPTIONS: { id: Goal; title: string; body: string }[] = [
  { id: "first_push_up", title: "Do my first proper push-up", body: "Build chest, shoulder and arm strength, starting from wall and counter-height push-ups." },
  { id: "first_pull_up", title: "Work towards my first pull-up", body: "Grip, hanging and shoulder-blade control, step by step. Needs a bar or rings for the final steps." },
  { id: "overall_strength", title: "Build overall strength", body: "Balanced pushing, pulling, legs and core across every session." },
  { id: "core_strength", title: "Improve core strength and posture", body: "Planks, dead bugs and hollow-body holds for a strong, steady trunk." },
  { id: "movement_mobility", title: "Move better", body: "Deeper, more comfortable squats and lunges, with mobility in every warm-up and cool-down." },
  { id: "foundations", title: "Just get started", body: "A steady, gentle introduction to bodyweight training. No particular target yet." },
];

/**
 * Specific skills people often aim for. The first three are trained in the
 * programme once their basics are in place; the long-term ones train the
 * foundations and show a roadmap for the rest.
 */
export const SKILL_GOAL_OPTIONS: { id: Goal; title: string; body: string; longTerm: boolean }[] = [
  { id: "skill_l_sit", title: "Hold an L-sit", body: "Press up on straight arms with your legs out in front. Starts with a foot-supported hold once your push-up and core basics are in place.", longTerm: false },
  { id: "skill_crow", title: "Balance in crow pose", body: "A first arm balance, knees resting on your arms. Starts with a supported lean once your push-ups and plank are strong enough.", longTerm: false },
  { id: "skill_pistol", title: "Do a pistol squat", body: "A full squat on one leg. Starts with a hand support, then lower and lower boxes, once your squats and split squats are solid.", longTerm: false },
  { id: "skill_handstand", title: "Freestanding handstand", body: "Wall work and learning to come down safely come first. FORM trains the foundations and shows the full build-up.", longTerm: true },
  { id: "skill_muscle_up", title: "Muscle-up", body: "Pull-ups and dips first, then the transition over the bar. Needs a bar or rings. FORM trains the foundations and shows the full build-up.", longTerm: true },
  { id: "skill_front_lever", title: "Front lever", body: "Hangs, pull-ups and core strength first, then tuck holds. Needs a bar or rings. FORM trains the foundations and shows the full build-up.", longTerm: true },
];

export const ALL_GOAL_OPTIONS = [...GOAL_OPTIONS, ...SKILL_GOAL_OPTIONS];

export const EXPERIENCE_OPTIONS: { id: Experience; title: string; body: string }[] = [
  { id: "complete_beginner", title: "Complete beginner", body: "New to exercise, or coming back after a long break." },
  { id: "some_fitness", title: "I exercise occasionally", body: "Some walking, running, classes or sport, but new to bodyweight strength training." },
  { id: "gym_new_to_calisthenics", title: "I train regularly", body: "Comfortable with gym or weight training, new to calisthenics." },
];

export const PUSH_OPTIONS: { id: (typeof PUSH_TEST_VARIATIONS)[number]; title: string }[] = [
  { id: "wall", title: "Against a wall" },
  { id: "high_incline", title: "Hands on a kitchen counter or table" },
  { id: "mid_incline", title: "Hands on a knee-height bench or sofa" },
  { id: "low_incline", title: "Hands on a low step" },
  { id: "floor", title: "On the floor, on my toes" },
];

export const SQUAT_OPTIONS: { id: (typeof SQUAT_TEST_ANSWERS)[number]; title: string }[] = [
  { id: "needs_support", title: "I need to hold on to something" },
  { id: "chair_no_hands", title: "I can sit to a chair and stand up without my hands" },
  { id: "ten_controlled", title: "10 controlled squats without support" },
  { id: "fifteen_full_depth", title: "15 deep squats with good control" },
];

export const PLANK_OPTIONS = [
  { id: "0", seconds: 0, title: "Haven't tried, or under 10 seconds" },
  { id: "15", seconds: 15, title: "10 to 30 seconds" },
  { id: "40", seconds: 40, title: "30 to 60 seconds" },
  { id: "60", seconds: 60, title: "A minute or more" },
] as const;

export const HANG_OPTIONS = [
  { id: "none", seconds: null, title: "Haven't tried, or no bar" },
  { id: "5", seconds: 5, title: "Under 10 seconds" },
  { id: "15", seconds: 15, title: "10 to 30 seconds" },
  { id: "30", seconds: 30, title: "30 seconds or more" },
] as const;

export const PULL_UP_OPTIONS = [
  { id: "0", count: 0, title: "None yet" },
  { id: "1", count: 1, title: "1 or 2" },
  { id: "3", count: 3, title: "3 or more" },
] as const;

export const CONFIDENCE_OPTIONS = [
  { id: "2", value: 2, title: "A bit nervous" },
  { id: "3", value: 3, title: "Comfortable" },
  { id: "4", value: 4, title: "Ready to go" },
] as const;

export const SESSION_OPTIONS: { minutes: SessionMinutes; title: string; body: string }[] = [
  { minutes: 15, title: "About 15 minutes", body: "Short warm-up, four main exercises, quick cool-down. No room for separate skill practice." },
  { minutes: 25, title: "About 25 minutes", body: "Full warm-up, five main exercises and a cool-down. With a specific skill goal, one of the five is skill practice." },
  { minutes: 40, title: "About 40 minutes", body: "Six main exercises, plus extra skill practice once you're ready." },
];

export const FREQUENCY_OPTIONS: { days: DaysPerWeek; title: string; body: string }[] = [
  { days: 2, title: "2 days a week", body: "Plenty of recovery between sessions. A gentle start." },
  { days: 3, title: "3 days a week", body: "A common starting point for beginners, with a rest day between sessions." },
  { days: 4, title: "4 days a week", body: "Alternating upper body and lower body sessions." },
];

export const ENVIRONMENT_OPTIONS: { id: TrainingEnvironment; title: string; body: string }[] = [
  { id: "home", title: "Home", body: "Living room, bedroom or anywhere with clear floor space." },
  { id: "gym", title: "Gym", body: "A gym or fitness studio." },
  { id: "park", title: "Outdoor park", body: "Parks with bars, benches and open space." },
  { id: "mixed", title: "A mix", body: "Some sessions at home, some out." },
];

/** "none" means floor, wall and household furniture only, which every plan assumes. */
export const EQUIPMENT_OPTIONS: { id: Exclude<Equipment, "none">; title: string; body: string }[] = [
  { id: "mat", title: "Exercise or yoga mat", body: "More comfortable for knees, wrists and floor work." },
  { id: "bands", title: "Resistance bands", body: "Lets you do rows at home and assisted pulling." },
  { id: "pullup_bar", title: "Pull-up bar", body: "A properly fixed bar for hangs and pull-up progressions." },
  { id: "low_bar", title: "Low bar for rows", body: "A sturdy bar around waist height, like a Smith machine or park bar." },
  { id: "parallel_bars", title: "Dip station or parallel bars", body: "For support holds and dip preparation later on." },
  { id: "rings", title: "Gymnastics rings", body: "Hung from a sturdy beam or bar. Works for rows and hangs." },
  { id: "gym", title: "Full gym access", body: "Covers bars, benches, bands and dip stations." },
];

// ------------------------------------------------------------------ schemas

export const goalsSchema = z.object({
  goals: z.array(z.enum(GOALS)).min(1, "Choose at least one goal.").max(3, "Choose up to three goals."),
});

const intFrom = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);

export const assessmentSchema = z.object({
  pushVariation: z.enum(PUSH_TEST_VARIATIONS).nullable(),
  pushReps: intFrom(0, 100).nullable(),
  squat: z.enum(SQUAT_TEST_ANSWERS).nullable(),
  plankSeconds: intFrom(0, 600).nullable(),
  hangSeconds: intFrom(0, 600).nullable(),
  pullUps: intFrom(0, 50).nullable(),
  confidence: intFrom(1, 5).nullable(),
});
export type AssessmentAnswers = z.infer<typeof assessmentSchema>;

export const experienceSchema = z.object({
  experience: z.enum(EXPERIENCE, { message: "Choose the option that fits best." }),
  assessment: assessmentSchema.nullable(),
});

export const scheduleSchema = z
  .object({
    daysPerWeek: z.coerce
      .number()
      .refine((v) => (DAYS_PER_WEEK as readonly number[]).includes(v), "Choose 2, 3 or 4 days a week.")
      .transform((v) => v as DaysPerWeek),
    trainingDays: z.array(z.coerce.number().int().min(1).max(7)),
    sessionMinutes: z.coerce
      .number()
      .refine((v) => (SESSION_MINUTES as readonly number[]).includes(v), "Choose a session length.")
      .transform((v) => v as SessionMinutes),
    environment: z.enum(ENVIRONMENTS, { message: "Choose where you'll train." }),
    timeZone: z.string().max(64).refine(isValidTimeZone, "Unknown time zone."),
  })
  .superRefine((value, ctx) => {
    const problem = checkTrainingDays(value.daysPerWeek, value.trainingDays);
    if (problem) ctx.addIssue({ code: "custom", path: ["trainingDays"], message: TRAINING_DAYS_MESSAGES[problem] });
  });

export const equipmentSchema = z.object({
  equipment: z.array(z.enum(EQUIPMENT)).max(EQUIPMENT.length),
});

export const answersSchema = z.object({
  goals: goalsSchema.shape.goals.optional(),
  experience: experienceSchema.shape.experience.optional(),
  assessment: assessmentSchema.nullable().optional(),
  daysPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  trainingDays: z.array(z.number().int().min(1).max(7)).optional(),
  sessionMinutes: z.union([z.literal(15), z.literal(25), z.literal(40)]).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
  timeZone: z.string().optional(),
  equipment: z.array(z.enum(EQUIPMENT)).optional(),
});
export type OnboardingAnswers = z.infer<typeof answersSchema>;

/** Parse stored answers, dropping anything malformed rather than failing. */
export function readAnswers(raw: unknown): OnboardingAnswers {
  const parsed = answersSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  const out: Record<string, unknown> = {};
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  for (const key of Object.keys(answersSchema.shape) as (keyof OnboardingAnswers)[]) {
    const field = answersSchema.shape[key].safeParse(source[key]);
    if (field.success && field.data !== undefined) out[key] = field.data;
  }
  return out as OnboardingAnswers;
}

/** The first step whose answers are missing. */
export function firstIncompleteStep(answers: OnboardingAnswers): OnboardingStepId {
  if (!answers.goals?.length) return "goals";
  if (!answers.experience) return "experience";
  if (!answers.daysPerWeek || !answers.trainingDays || !answers.sessionMinutes || !answers.environment) return "schedule";
  if (!answers.equipment) return "equipment";
  return "summary";
}

export function stepIndex(step: OnboardingStepId): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function laterStep(a: OnboardingStepId, b: OnboardingStepId): OnboardingStepId {
  return stepIndex(a) >= stepIndex(b) ? a : b;
}

export function toAssessmentInput(assessment: AssessmentAnswers | null | undefined): AssessmentInput {
  if (!assessment) return {};
  return {
    push: assessment.pushVariation ? { variation: assessment.pushVariation, reps: assessment.pushReps ?? 0 } : null,
    squat: assessment.squat,
    plankSeconds: assessment.plankSeconds,
    hangSeconds: assessment.hangSeconds,
    pullUps: assessment.pullUps,
    confidence: assessment.confidence,
  };
}

export interface CompleteAnswers {
  profile: UserTrainingProfile;
  trainingDays: number[];
  timeZone: string;
  assessment: AssessmentInput;
}

/** Turns finished answers into engine inputs, or null if a step is missing. */
export function completeAnswers(answers: OnboardingAnswers): CompleteAnswers | null {
  if (firstIncompleteStep(answers) !== "summary") return null;
  const equipment: Equipment[] = Array.from(new Set<Equipment>(["none", ...(answers.equipment ?? [])]));
  return {
    profile: {
      experience: answers.experience!,
      goals: answers.goals!,
      daysPerWeek: answers.daysPerWeek!,
      sessionMinutes: answers.sessionMinutes!,
      equipment,
      environment: answers.environment!,
    },
    trainingDays: [...answers.trainingDays!].sort((a, b) => a - b),
    timeZone: answers.timeZone && isValidTimeZone(answers.timeZone) ? answers.timeZone : "Australia/Sydney",
    assessment: toAssessmentInput(answers.assessment),
  };
}
