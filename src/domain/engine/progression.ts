import { getExercise } from "../content/exercises";
import { getFamily } from "../content/families";
import type {
  Equipment,
  Exercise,
  ExposureResult,
  FamilyState,
  ProgressionDecision,
} from "../types";
import { clampToRange, nextEasier, nextHarder, rangeOf, stepOf } from "./catalogue";

// The adaptive progression engine.
//
// Deterministic and explainable: every call returns the new state plus a
// decision with a plain-language reason. The rules are documented in
// docs/research/EXERCISE_SCIENCE.md section 7 and docs/EXERCISE_CONTENT_REVIEW.md.
//
// Safety rules that must never be weakened:
//  - Completing a session is never, on its own, a reason to progress.
//  - Progression needs logged performance at the top of the range, confirmed
//    good control and a rating of "about right" or "too easy".
//  - Pain always moves the user to an easier option or pauses the family.

export const SUCCESS_EXPOSURES_TO_PROGRESS = 2;
export const DIFFICULT_EXPOSURES_TO_STEP_DOWN = 2;
export const PAIN_WINDOW_DAYS = 14;
export const PAIN_REPORTS_TO_PAUSE = 2;
/** Pain reports are kept this long for skill readiness gates. */
export const PAIN_HISTORY_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EngineContext {
  now: Date;
  equipment: readonly Equipment[];
}

export interface EngineResult {
  state: FamilyState;
  decision: ProgressionDecision;
}

function unit(exercise: Exercise, value: number): string {
  if (exercise.measure === "seconds") return `${value} s`;
  return `${value} rep${value === 1 ? "" : "s"}${exercise.perSide ? " each side" : ""}`;
}

function recentPain(reports: string[], now: Date, days: number): string[] {
  const cutoff = now.getTime() - days * DAY_MS;
  return reports.filter((r) => new Date(r).getTime() >= cutoff);
}

function midpoint(exercise: Exercise): number {
  const [min, max] = rangeOf(exercise);
  return clampToRange(exercise, (min + max) / 2);
}

export function evaluateExposure(state: FamilyState, result: ExposureResult, ctx: EngineContext): EngineResult {
  const family = getFamily(state.familyId);
  const planned = getExercise(state.exerciseId);
  const performed = getExercise(result.exerciseId);
  const painHistory = recentPain(state.painReports, ctx.now, PAIN_HISTORY_DAYS);
  const base: FamilyState = { ...state, painReports: painHistory };

  const decide = (
    kind: ProgressionDecision["kind"],
    next: FamilyState,
    reason: string,
  ): EngineResult => ({
    state: next,
    decision: {
      kind,
      familyId: state.familyId,
      fromExerciseId: state.exerciseId,
      toExerciseId: next.exerciseId,
      fromTarget: state.target,
      toTarget: next.target,
      reason,
    },
  });

  // 1. Pain always comes first.
  if (result.feedback === "pain" || result.skipped === "pain") {
    const reports = [...painHistory, ctx.now.toISOString()];
    const inWindow = recentPain(reports, ctx.now, PAIN_WINDOW_DAYS);
    if (inWindow.length >= PAIN_REPORTS_TO_PAUSE) {
      const easier = nextEasier(performed.id, ctx.equipment);
      const resumeAt = easier ?? performed;
      return decide(
        "pain_pause",
        {
          ...base,
          exerciseId: resumeAt.id,
          target: rangeOf(resumeAt)[0],
          painReports: reports,
          paused: true,
          successStreak: 0,
          difficultStreak: 0,
        },
        `You've reported discomfort during ${family.name.toLowerCase()} work twice in two weeks, so we've paused it. ` +
          `Please speak to a GP or physiotherapist if it continues. You can resume from your Progress page when it feels right, ` +
          `and you'll restart at ${resumeAt.name.toLowerCase()}.`,
      );
    }
    const easier = nextEasier(performed.id, ctx.equipment);
    if (easier) {
      return decide(
        "pain_swap",
        {
          ...base,
          exerciseId: easier.id,
          target: rangeOf(easier)[0],
          painReports: reports,
          successStreak: 0,
          difficultStreak: 0,
        },
        `You reported discomfort, so next time you'll do ${easier.name.toLowerCase()} instead. ` +
          `If the discomfort continues, stop and get it checked by a health professional.`,
      );
    }
    return decide(
      "pain_swap",
      {
        ...base,
        exerciseId: performed.id,
        target: rangeOf(performed)[0],
        painReports: reports,
        successStreak: 0,
        difficultStreak: 0,
      },
      `You reported discomfort. This is already the easiest option, so next time we'll keep it at the lowest target. ` +
        `If it hurts again, skip it and speak to a health professional.`,
    );
  }

  // 2. The user chose an easier variation during the session.
  if (performed.familyId === state.familyId && performed.level < planned.level) {
    return decide(
      "regress",
      {
        ...base,
        exerciseId: performed.id,
        target: clampToRange(performed, result.target),
        successStreak: 0,
        difficultStreak: 0,
      },
      `You switched to ${performed.name.toLowerCase()} today, so that's where we'll pick up next time. You'll move back up once it feels comfortable.`,
    );
  }

  // 3. Skips without pain.
  if (result.skipped && result.skipped !== "too_hard") {
    return decide("no_change", base, "Skipped this time, so nothing changes.");
  }

  const [min, max] = rangeOf(performed);
  const values = result.sets
    .map((s) => (performed.measure === "reps" ? s.reps : s.seconds))
    .filter((v): v is number => typeof v === "number" && v >= 0);
  const missingSets = Math.max(0, result.prescribedSets - values.length);
  const belowMin = values.filter((v) => v < min).length + missingSets;
  const mostlyBelowMin = belowMin > result.prescribedSets / 2;
  const complete = values.length >= result.prescribedSets;
  const allAtTarget = complete && values.every((v) => v >= result.target);
  const allAtTop = complete && values.every((v) => v >= max);
  const couldNotFinish = result.feedback === "could_not_finish" || result.skipped === "too_hard";

  const target = clampToRange(performed, state.exerciseId === performed.id ? state.target : result.target);
  const working: FamilyState = { ...base, exerciseId: performed.id, target };

  const stepDown = (why: string, forceRegress: boolean): EngineResult => {
    if (!forceRegress && working.target > min) {
      const lowered = Math.max(min, working.target - stepOf(performed));
      return decide(
        "decrease_target",
        { ...working, target: lowered, successStreak: 0, difficultStreak: 0 },
        `${why} Next time we'll aim for ${unit(performed, lowered)} per set.`,
      );
    }
    const easier = nextEasier(performed.id, ctx.equipment);
    if (easier) {
      const easierTarget = midpoint(easier);
      return decide(
        "regress",
        { ...working, exerciseId: easier.id, target: easierTarget, successStreak: 0, difficultStreak: 0 },
        `${why} Next time you'll do ${easier.name.toLowerCase()} for ${unit(easier, easierTarget)} per set, then build back up.`,
      );
    }
    return decide(
      "hold",
      { ...working, target: min, successStreak: 0, difficultStreak: 0 },
      `${why} This is the starting point of the path, so we'll keep it at ${unit(performed, min)} and it will get easier with practice.`,
    );
  };

  // 4. Couldn't finish, or most sets fell short of the range.
  if (couldNotFinish || (values.length > 0 && mostlyBelowMin) || (values.length === 0 && result.skipped === "too_hard")) {
    if (mostlyBelowMin) {
      return stepDown("Most sets fell short of the target range.", true);
    }
    const streak = working.difficultStreak + 1;
    if (working.target > min) {
      return stepDown("You couldn't finish all the sets.", false);
    }
    if (streak >= DIFFICULT_EXPOSURES_TO_STEP_DOWN) {
      return stepDown("This has been hard to finish two sessions running.", true);
    }
    return decide(
      "hold",
      { ...working, successStreak: 0, difficultStreak: streak },
      "You couldn't quite finish, so we'll keep the same target next time. If it's still too hard, we'll ease off.",
    );
  }

  // 5. Too difficult but completed in range.
  if (result.feedback === "too_difficult") {
    const streak = working.difficultStreak + 1;
    if (streak >= DIFFICULT_EXPOSURES_TO_STEP_DOWN) {
      return stepDown("You've rated this too difficult two sessions running.", false);
    }
    return decide(
      "hold",
      { ...working, successStreak: 0, difficultStreak: streak },
      "Noted that it felt too hard. We'll keep things the same next time and ease off if it still feels that way.",
    );
  }

  // 6. Without feedback and confirmed control, never move up.
  if (result.feedback === null) {
    return decide("hold", { ...working, successStreak: 0 }, "No rating this time, so we kept things the same.");
  }
  if (result.goodControl !== true) {
    return decide(
      "hold",
      { ...working, successStreak: 0, difficultStreak: 0 },
      result.goodControl === false
        ? "Focus on control. We'll keep the same target until the reps feel smooth and steady."
        : "Tell us whether you kept good control and we'll know when to move you up.",
    );
  }

  // 7. About right or too easy, with good control.
  if (allAtTop) {
    const streak = working.successStreak + 1;
    const harder = nextHarder(performed.id, ctx.equipment);
    if (!harder) {
      return decide(
        "hold",
        { ...working, target: max, successStreak: streak, difficultStreak: 0 },
        `You've reached the top of the ${family.name.toLowerCase()} path in this programme. Keep it up: consistent, clean reps here are real strength.`,
      );
    }
    if (streak >= SUCCESS_EXPOSURES_TO_PROGRESS || result.feedback === "too_easy") {
      const newTarget = rangeOf(harder)[0];
      return decide(
        "progress",
        { ...working, exerciseId: harder.id, target: newTarget, successStreak: 0, difficultStreak: 0 },
        `You hit ${unit(performed, max)} on every set with good control${streak >= 2 ? " two sessions running" : " and it felt easy"}. ` +
          `Time to move up to ${harder.name.toLowerCase()}, starting at ${unit(harder, newTarget)} per set.`,
      );
    }
    return decide(
      "hold",
      { ...working, target: max, successStreak: streak, difficultStreak: 0 },
      `Top of the range with good control. One more session like this and you'll move up to ${harder.name.toLowerCase()}.`,
    );
  }

  if (allAtTarget && working.target < max) {
    const steps = result.feedback === "too_easy" ? 2 : 1;
    const raised = Math.min(max, working.target + steps * stepOf(performed));
    return decide(
      "increase_target",
      { ...working, target: raised, successStreak: 0, difficultStreak: 0 },
      `You hit ${unit(performed, working.target)} on every set with good control, so next time aim for ${unit(performed, raised)}.`,
    );
  }

  return decide(
    "hold",
    { ...working, successStreak: 0, difficultStreak: 0 },
    `Not every set reached ${unit(performed, working.target)} yet, so we'll keep the same target next time.`,
  );
}

/** Lift a pause after the user confirms they're ready to resume. */
export function resumeFamily(state: FamilyState): FamilyState {
  return { ...state, paused: false, successStreak: 0, difficultStreak: 0 };
}
