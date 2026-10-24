"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabase, requireTrainingAccount } from "@/server/auth";
import { getTrainingSnapshot, planSession } from "@/server/training";
import { completeSession } from "@/server/workouts";
import type { SessionRow } from "@/server/rows";
import { allowedSwaps } from "./swaps";

// Every change during a workout is saved as it happens, so closing or
// refreshing the page never loses a set.

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const SAVE_FAILED = "That didn't save. Check your connection and try again.";

async function loadOwnSession(sessionId: string) {
  const account = await requireTrainingAccount();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", account.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return { account, supabase, session: data as SessionRow };
}

export async function startWorkout(formData: FormData): Promise<void> {
  const snapshot = await getTrainingSnapshot();
  if (snapshot.inProgress) redirect(`/workout/${snapshot.inProgress.id}`);
  const slotId = String(formData.get("scheduledWorkoutId") ?? "");
  const slot = snapshot.schedule.find((s) => s.id === slotId && s.status === "planned");
  if (!slot) redirect("/today?notice=session-unavailable");

  const plan = planSession(snapshot, slot.template, slot.week);
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: snapshot.account.user.id,
      scheduled_workout_id: slot.id,
      template: slot.template,
      title: plan.title,
      plan,
    })
    .select("id")
    .single();
  if (error || !data) {
    // A second tap can race the first; send them to whichever session exists.
    const existing = await supabase.from("workout_sessions").select("id").eq("user_id", snapshot.account.user.id).eq("status", "in_progress").maybeSingle();
    if (existing.data) redirect(`/workout/${existing.data.id}`);
    redirect("/today?notice=start-failed");
  }
  redirect(`/workout/${data.id}`);
}

const setSchema = z.object({
  sessionId: z.uuid(),
  itemIndex: z.number().int().min(0).max(40),
  setNumber: z.number().int().min(1).max(10),
  value: z.number().int().min(0).max(1800),
});

export async function logSet(input: z.input<typeof setSchema>): Promise<ActionResult> {
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That value isn't valid." };
  const { sessionId, itemIndex, setNumber, value } = parsed.data;
  const loaded = await loadOwnSession(sessionId);
  if (!loaded || loaded.session.status !== "in_progress") return { ok: false, error: "This workout has already finished." };
  const item = loaded.session.plan.items[itemIndex];
  if (!item || setNumber > item.sets) return { ok: false, error: "That set isn't part of this workout." };
  if (item.measure === "reps" && value > 300) return { ok: false, error: "That's more reps than we can record for one set." };

  const exerciseId = loaded.session.swaps[String(itemIndex)] ?? item.exerciseId;
  const { error } = await loaded.supabase.from("set_logs").upsert(
    {
      session_id: sessionId,
      user_id: loaded.account.user.id,
      item_index: itemIndex,
      set_number: setNumber,
      exercise_id: exerciseId,
      reps: item.measure === "reps" ? value : null,
      seconds: item.measure === "seconds" ? value : null,
      logged_at: new Date().toISOString(),
    },
    { onConflict: "session_id,item_index,set_number" },
  );
  return error ? { ok: false, error: SAVE_FAILED } : { ok: true };
}

const swapSchema = z.object({
  sessionId: z.uuid(),
  itemIndex: z.number().int().min(0).max(40),
  exerciseId: z.string().min(1).max(80),
});

export async function swapExercise(input: z.input<typeof swapSchema>): Promise<ActionResult> {
  const parsed = swapSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That swap isn't valid." };
  const { sessionId, itemIndex, exerciseId } = parsed.data;
  const loaded = await loadOwnSession(sessionId);
  if (!loaded || loaded.session.status !== "in_progress") return { ok: false, error: "This workout has already finished." };
  const item = loaded.session.plan.items[itemIndex];
  if (!item) return { ok: false, error: "That exercise isn't part of this workout." };
  const current = loaded.session.swaps[String(itemIndex)] ?? item.exerciseId;
  const allowed = allowedSwaps(item.exerciseId, current, loaded.account.preferences.equipment);
  if (exerciseId !== item.exerciseId && !allowed.some((e) => e.id === exerciseId)) {
    return { ok: false, error: "That option isn't available with your equipment." };
  }
  // Sets already logged for this exercise are cleared: the numbers belonged to a different movement.
  const swaps = { ...loaded.session.swaps, [String(itemIndex)]: exerciseId };
  if (exerciseId === item.exerciseId) delete swaps[String(itemIndex)];
  const [update, clear] = await Promise.all([
    loaded.supabase.from("workout_sessions").update({ swaps }).eq("id", sessionId),
    loaded.supabase.from("set_logs").delete().eq("session_id", sessionId).eq("item_index", itemIndex),
  ]);
  return update.error || clear.error ? { ok: false, error: SAVE_FAILED } : { ok: true };
}

const feedbackSchema = z.object({
  sessionId: z.uuid(),
  itemIndex: z.number().int().min(0).max(40),
  difficulty: z.enum(["too_easy", "about_right", "too_difficult", "could_not_finish", "pain"]).nullable(),
  goodControl: z.boolean().nullable(),
  skippedReason: z.enum(["pain", "too_hard", "no_equipment", "short_on_time", "other"]).nullable(),
});

export async function saveFeedback(input: z.input<typeof feedbackSchema>): Promise<ActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose how it felt." };
  const { sessionId, itemIndex, difficulty, goodControl, skippedReason } = parsed.data;
  const loaded = await loadOwnSession(sessionId);
  if (!loaded || loaded.session.status !== "in_progress") return { ok: false, error: "This workout has already finished." };
  const item = loaded.session.plan.items[itemIndex];
  if (!item) return { ok: false, error: "That exercise isn't part of this workout." };
  const { error } = await loaded.supabase.from("exercise_feedback").upsert(
    {
      session_id: sessionId,
      user_id: loaded.account.user.id,
      item_index: itemIndex,
      exercise_id: loaded.session.swaps[String(itemIndex)] ?? item.exerciseId,
      family_id: item.familyId,
      difficulty: skippedReason ? null : difficulty,
      good_control: skippedReason || difficulty === "pain" ? null : goodControl,
      skipped_reason: skippedReason,
    },
    { onConflict: "session_id,item_index" },
  );
  return error ? { ok: false, error: SAVE_FAILED } : { ok: true };
}

export async function finishWorkout(sessionId: string): Promise<ActionResult> {
  const id = z.uuid().safeParse(sessionId);
  if (!id.success) return { ok: false, error: "Workout not found." };
  const result = await completeSession(id.data);
  if (!result.ok) return result;
  redirect(`/workout/${id.data}/summary`);
}

export async function discardWorkout(sessionId: string): Promise<ActionResult> {
  const id = z.uuid().safeParse(sessionId);
  if (!id.success) return { ok: false, error: "Workout not found." };
  const loaded = await loadOwnSession(id.data);
  if (!loaded) return { ok: false, error: "Workout not found." };
  if (loaded.session.status === "in_progress") {
    const { error } = await loaded.supabase
      .from("workout_sessions")
      .update({ status: "abandoned", completed_at: new Date().toISOString() })
      .eq("id", id.data);
    if (error) return { ok: false, error: SAVE_FAILED };
  }
  redirect("/today?notice=discarded");
}
