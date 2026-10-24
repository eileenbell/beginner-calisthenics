import type {
  DaysPerWeek,
  Equipment,
  Experience,
  ExerciseFeedback,
  FamilyId,
  FamilyState,
  Goal,
  SessionMinutes,
  SessionPlan,
  SessionTemplate,
  SkipReason,
  TrainingEnvironment,
  UserTrainingProfile,
} from "@/domain";

// Row shapes for the tables in supabase/migrations, as PostgREST returns them.

export interface ProfileRow {
  id: string;
  display_name: string | null;
  created_at: string;
}

export type OnboardingStep = "goals" | "experience" | "schedule" | "equipment" | "summary";

export interface OnboardingRow {
  user_id: string;
  current_step: OnboardingStep;
  answers: Record<string, unknown>;
  completed_at: string | null;
}

export interface PreferencesRow {
  user_id: string;
  goals: Goal[];
  experience: Experience;
  days_per_week: DaysPerWeek;
  training_days: number[];
  session_minutes: SessionMinutes;
  equipment: Equipment[];
  environment: TrainingEnvironment;
  time_zone: string;
}

export interface ProgrammeRow {
  id: string;
  user_id: string;
  started_on: string;
  weeks: number;
  days_per_week: DaysPerWeek;
  session_minutes: SessionMinutes;
  status: "active" | "archived" | "completed";
  created_at: string;
}

export interface ScheduledWorkoutRow {
  id: string;
  programme_id: string;
  week: number;
  slot: number;
  template: SessionTemplate;
  scheduled_on: string;
  status: "planned" | "completed" | "skipped";
  completed_at: string | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  scheduled_workout_id: string | null;
  template: SessionTemplate;
  title: string;
  plan: SessionPlan;
  swaps: Record<string, string>;
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  completed_at: string | null;
}

export interface SetLogRow {
  id: string;
  session_id: string;
  item_index: number;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  seconds: number | null;
  logged_at: string;
}

export interface FeedbackRow {
  session_id: string;
  item_index: number;
  exercise_id: string;
  family_id: FamilyId | null;
  difficulty: ExerciseFeedback | null;
  good_control: boolean | null;
  skipped_reason: SkipReason | null;
  decision: unknown;
  created_at: string;
}

export interface ProgressRow {
  user_id: string;
  family_id: FamilyId;
  exercise_id: string;
  target: number;
  success_streak: number;
  difficult_streak: number;
  pain_reports: string[];
  paused: boolean;
  updated_at: string;
}

export interface ProgressionEventRow {
  id: string;
  session_id: string | null;
  family_id: FamilyId;
  kind: string;
  from_exercise_id: string;
  to_exercise_id: string;
  from_target: number;
  to_target: number;
  reason: string;
  created_at: string;
}

export interface UserMilestoneRow {
  milestone_id: string;
  session_id: string | null;
  achieved_at: string;
}

export interface UserAchievementRow {
  achievement_id: string;
  earned_at: string;
}

export function toFamilyState(row: ProgressRow): FamilyState {
  return {
    familyId: row.family_id,
    exerciseId: row.exercise_id,
    target: row.target,
    successStreak: row.success_streak,
    difficultStreak: row.difficult_streak,
    painReports: row.pain_reports ?? [],
    paused: row.paused,
  };
}

export function toTrainingProfile(row: PreferencesRow): UserTrainingProfile {
  return {
    experience: row.experience,
    goals: row.goals,
    daysPerWeek: row.days_per_week,
    sessionMinutes: row.session_minutes,
    equipment: row.equipment,
    environment: row.environment,
  };
}
