"use server";

import { revalidatePath } from "next/cache";
import { EXERCISES_BY_ID } from "@/domain";
import { getSupabase, requireUser } from "@/server/auth";

/** Bookmarks an exercise, or removes the bookmark. Works as a plain form post. */
export async function toggleSavedExercise(formData: FormData): Promise<void> {
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const save = formData.get("save") === "1";
  if (!EXERCISES_BY_ID.has(exerciseId)) return;
  const user = await requireUser();
  const supabase = await getSupabase();
  if (save) {
    await supabase.from("saved_exercises").upsert({ user_id: user.id, exercise_id: exerciseId }, { onConflict: "user_id,exercise_id", ignoreDuplicates: true });
  } else {
    await supabase.from("saved_exercises").delete().eq("user_id", user.id).eq("exercise_id", exerciseId);
  }
  revalidatePath(`/exercises/${exerciseId}`);
  revalidatePath("/exercises");
}
