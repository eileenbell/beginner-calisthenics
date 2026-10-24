"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { localDate, PROGRAMME_WEEKS, rescheduleFrom, type Equipment, type IsoDate } from "@/domain";
import { equipmentSchema, goalsSchema, scheduleSchema } from "@/features/onboarding/answers";
import { displayNameSchema, fieldErrors, formValues, type FieldErrors } from "@/lib/validation/auth";
import { getSupabase, requireTrainingAccount, requireUser } from "@/server/auth";
import { createProgramme } from "@/server/programme";
import { toTrainingProfile, type ScheduledWorkoutRow } from "@/server/rows";

export interface ProfileFormState {
  errors?: FieldErrors;
  message?: string;
  status?: "saved";
}

export async function updateDisplayName(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser("/profile");
  const parsed = displayNameSchema.safeParse(formValues(formData, ["name"]));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await getSupabase();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.name }).eq("id", user.id);
  if (error) return { message: "We couldn't save your name. Please try again." };
  revalidatePath("/", "layout");
  return { status: "saved", message: "Name saved." };
}

/**
 * Saves goals, schedule and equipment. Planned sessions from today onwards
 * are rebuilt for the new days; finished sessions and progress are kept.
 * Equipment changes apply from the next workout you start.
 */
export async function updateTrainingSettings(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const account = await requireTrainingAccount("/profile/training");
  const goals = goalsSchema.safeParse({ goals: formData.getAll("goals") });
  const schedule = scheduleSchema.safeParse({
    daysPerWeek: formData.get("daysPerWeek"),
    trainingDays: formData.getAll("trainingDays"),
    sessionMinutes: formData.get("sessionMinutes"),
    environment: formData.get("environment"),
    timeZone: formData.get("timeZone") || account.preferences.time_zone,
  });
  const equipment = equipmentSchema.safeParse({ equipment: formData.getAll("equipment") });
  const errors: FieldErrors = {
    ...(goals.success ? {} : fieldErrors(goals.error)),
    ...(schedule.success ? {} : fieldErrors(schedule.error)),
    ...(equipment.success ? {} : fieldErrors(equipment.error)),
  };
  if (!goals.success || !schedule.success || !equipment.success) return { errors };

  const supabase = await getSupabase();
  const { programme } = account;
  const { data: rows, error: loadError } = await supabase.from("scheduled_workouts").select("*").eq("programme_id", programme.id);
  if (loadError) return { message: "We couldn't load your schedule. Please try again." };

  const today = localDate(new Date(), schedule.data.timeZone) as IsoDate;
  const existing = ((rows ?? []) as ScheduledWorkoutRow[]).map((r) => ({ week: r.week, slot: r.slot, scheduledOn: r.scheduled_on, status: r.status }));
  const slots = rescheduleFrom(programme.started_on, today, schedule.data.daysPerWeek, schedule.data.trainingDays, existing, programme.weeks || PROGRAMME_WEEKS);
  const kit = Array.from(new Set<Equipment>(["none", ...equipment.data.equipment]));

  const { error } = await supabase.rpc("reschedule_programme", {
    p_preferences: {
      goals: goals.data.goals,
      experience: account.preferences.experience,
      days_per_week: schedule.data.daysPerWeek,
      training_days: [...schedule.data.trainingDays].sort((a, b) => a - b),
      session_minutes: schedule.data.sessionMinutes,
      equipment: kit,
      environment: schedule.data.environment,
      time_zone: schedule.data.timeZone,
    },
    p_from: today,
    p_schedule: slots.map((s) => ({ week: s.week, slot: s.slot, template: s.template, scheduled_on: s.scheduledOn })),
  });
  if (error) return { message: "We couldn't save your settings. Please try again." };
  revalidatePath("/", "layout");
  redirect("/profile?notice=training-saved");
}

/** Archives the current programme and starts a fresh 12 weeks from today, keeping every level. */
export async function startNewBlock(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const account = await requireTrainingAccount("/profile");
  if (formData.get("confirm") !== "on") return { errors: { confirm: "Tick the box to confirm." } };
  const supabase = await getSupabase();
  const { data: open } = await supabase.from("workout_sessions").select("id").eq("user_id", account.user.id).eq("status", "in_progress").maybeSingle();
  if (open) return { message: "Finish or discard the workout you've started first." };
  try {
    await createProgramme(supabase, {
      profile: toTrainingProfile(account.preferences),
      trainingDays: account.preferences.training_days,
      timeZone: account.preferences.time_zone,
      assessment: {},
    });
  } catch {
    return { message: "We couldn't start a new block. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect("/today?notice=new-block");
}

const deleteSchema = z.object({ confirmText: z.string().trim() });

/** Permanently deletes the account and everything stored with it. */
export async function deleteAccount(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  await requireUser("/profile");
  const parsed = deleteSchema.safeParse(formValues(formData, ["confirmText"]));
  if (!parsed.success || parsed.data.confirmText.toUpperCase() !== "DELETE") {
    return { errors: { confirmText: "Type DELETE to confirm." } };
  }
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { message: "We couldn't delete your account. Nothing was removed. Please try again." };
  await supabase.auth.signOut();
  redirect("/?notice=account-deleted");
}
