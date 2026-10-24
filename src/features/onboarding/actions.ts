"use server";

import { redirect } from "next/navigation";
import { getSupabase, requireUser } from "@/server/auth";
import { createProgramme } from "@/server/programme";
import type { OnboardingRow } from "@/server/rows";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import {
  assessmentSchema,
  completeAnswers,
  equipmentSchema,
  experienceSchema,
  goalsSchema,
  laterStep,
  readAnswers,
  scheduleSchema,
  STEP_PATHS,
  type OnboardingAnswers,
  type OnboardingStepId,
} from "./answers";

export interface StepState {
  errors?: FieldErrors;
  message?: string;
}

async function loadOnboarding() {
  const user = await requireUser("/onboarding");
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("onboarding_responses")
    .select("user_id, current_step, answers, completed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { user, supabase, row: data as OnboardingRow | null };
}

async function saveStep(patch: Partial<OnboardingAnswers>, next: OnboardingStepId): Promise<StepState> {
  const { user, supabase, row } = await loadOnboarding();
  const answers = { ...readAnswers(row?.answers), ...patch };
  const current = (row?.current_step ?? "goals") as OnboardingStepId;
  const { error } = await supabase
    .from("onboarding_responses")
    .upsert({ user_id: user.id, answers, current_step: laterStep(current, next) }, { onConflict: "user_id" });
  if (error) return { message: "We couldn't save that. Check your connection and try again." };
  redirect(STEP_PATHS[next]);
}

const values = (formData: FormData, key: string) => formData.getAll(key).map(String).filter(Boolean);
const optional = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return v === null || v === "" ? null : String(v);
};

export async function saveGoals(_prev: StepState, formData: FormData): Promise<StepState> {
  const parsed = goalsSchema.safeParse({ goals: values(formData, "goals") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  return saveStep({ goals: parsed.data.goals }, "experience");
}

export async function saveExperience(_prev: StepState, formData: FormData): Promise<StepState> {
  const skipped = formData.get("skipAssessment") === "1";
  const assessment = skipped
    ? null
    : {
        pushVariation: optional(formData, "pushVariation"),
        pushReps: optional(formData, "pushReps"),
        squat: optional(formData, "squat"),
        plankSeconds: optional(formData, "plankSeconds"),
        hangSeconds: optional(formData, "hangSeconds"),
        pullUps: optional(formData, "pullUps"),
        confidence: optional(formData, "confidence"),
      };
  const parsed = experienceSchema.safeParse({
    experience: formData.get("experience") ?? undefined,
    assessment: assessment ? assessmentSchema.parse(sanitiseAssessment(assessment)) : null,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  return saveStep({ experience: parsed.data.experience, assessment: parsed.data.assessment }, "schedule");
}

/** Drop unparseable values instead of failing the whole step: every test is optional. */
function sanitiseAssessment(raw: Record<string, string | null>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = assessmentSchema.shape[key as keyof typeof assessmentSchema.shape];
    const parsed = field.safeParse(value);
    out[key] = parsed.success ? parsed.data : null;
  }
  return out;
}

export async function saveSchedule(_prev: StepState, formData: FormData): Promise<StepState> {
  const parsed = scheduleSchema.safeParse({
    daysPerWeek: formData.get("daysPerWeek"),
    trainingDays: values(formData, "trainingDays"),
    sessionMinutes: formData.get("sessionMinutes"),
    environment: formData.get("environment") ?? undefined,
    timeZone: String(formData.get("timeZone") || "Australia/Sydney"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  return saveStep(parsed.data, "equipment");
}

export async function saveEquipment(_prev: StepState, formData: FormData): Promise<StepState> {
  const parsed = equipmentSchema.safeParse({ equipment: ["none", ...values(formData, "equipment")] });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  return saveStep({ equipment: Array.from(new Set(parsed.data.equipment)) }, "summary");
}

export async function startProgramme(): Promise<StepState> {
  const { supabase, row } = await loadOnboarding();
  const complete = completeAnswers(readAnswers(row?.answers));
  if (!complete) redirect("/onboarding");
  try {
    await createProgramme(supabase, complete, { completeOnboarding: true });
  } catch {
    return { message: "We couldn't create your programme. Please try again." };
  }
  redirect("/today?notice=welcome");
}
