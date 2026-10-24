import "server-only";
import { PROGRAMME_WEEKS } from "@/domain";
import type { CompleteAnswers } from "@/features/onboarding/answers";
import { previewProgramme } from "@/features/onboarding/preview";
import type { ServerSupabase } from "./supabase";

export function preferencesPayload(answers: CompleteAnswers) {
  const { profile } = answers;
  return {
    goals: profile.goals,
    experience: profile.experience,
    days_per_week: profile.daysPerWeek,
    training_days: answers.trainingDays,
    session_minutes: profile.sessionMinutes,
    equipment: profile.equipment,
    environment: profile.environment,
    time_zone: answers.timeZone,
  };
}

/**
 * Saves preferences, a fresh 12-week schedule and starting progressions in one
 * transaction (the create_programme function). Existing progression state is
 * kept, so starting a new block never resets someone's levels.
 */
export async function createProgramme(
  supabase: ServerSupabase,
  answers: CompleteAnswers,
  { now = new Date(), completeOnboarding = false } = {},
): Promise<string> {
  const preview = previewProgramme(answers, now);
  const { data, error } = await supabase.rpc("create_programme", {
    p_preferences: preferencesPayload(answers),
    p_started_on: preview.startedOn,
    p_weeks: PROGRAMME_WEEKS,
    p_schedule: preview.schedule.map((s) => ({ week: s.week, slot: s.slot, template: s.template, scheduled_on: s.scheduledOn })),
    p_states: preview.states.map((s) => ({ family_id: s.familyId, exercise_id: s.exerciseId, target: s.target })),
    p_complete_onboarding: completeOnboarding,
  });
  if (error) throw new Error(`Could not create your programme: ${error.message}`);
  return data as string;
}
