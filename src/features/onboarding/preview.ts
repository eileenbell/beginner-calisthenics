import {
  buildCalendarSchedule,
  buildSessionPlan,
  initialStates,
  localDate,
  PROGRAMME_WEEKS,
  type CalendarSlot,
  type FamilyId,
  type FamilyState,
  type SessionPlan,
} from "@/domain";
import type { CompleteAnswers } from "./answers";

export interface ProgrammePreview {
  startedOn: string;
  weeks: number;
  states: FamilyState[];
  schedule: CalendarSlot[];
  firstWeek: { slot: CalendarSlot; plan: SessionPlan }[];
}

/** What the new programme will look like, computed from onboarding answers. Nothing is saved. */
export function previewProgramme(answers: CompleteAnswers, now: Date): ProgrammePreview {
  const { profile, trainingDays, timeZone, assessment } = answers;
  const startedOn = localDate(now, timeZone);
  const schedule = buildCalendarSchedule(startedOn, profile.daysPerWeek, trainingDays, PROGRAMME_WEEKS);
  const states = initialStates(profile.experience, assessment, profile.equipment);
  const stateMap = new Map<FamilyId, FamilyState>(states.map((s) => [s.familyId, s]));
  const firstWeek = schedule
    .filter((slot) => slot.week === 1)
    .map((slot) => ({
      slot,
      plan: buildSessionPlan({
        profile,
        states: stateMap,
        week: 1,
        template: slot.template,
        daysSinceLastSession: null,
        unlockedSkills: new Set(),
      }),
    }));
  return { startedOn, weeks: PROGRAMME_WEEKS, states, schedule, firstWeek };
}
