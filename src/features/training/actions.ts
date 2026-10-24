"use server";

import { revalidatePath } from "next/cache";
import { FAMILIES_BY_ID, type FamilyId } from "@/domain";
import { getSupabase, requireTrainingAccount } from "@/server/auth";

/** Un-pauses a movement family the engine paused after repeated pain reports. */
export async function resumeFamily(formData: FormData): Promise<void> {
  const familyId = String(formData.get("familyId") ?? "") as FamilyId;
  if (!FAMILIES_BY_ID.has(familyId)) return;
  await requireTrainingAccount();
  const supabase = await getSupabase();
  await supabase.rpc("resume_family", { p_family_id: familyId });
  revalidatePath("/progress");
  revalidatePath("/today");
  revalidatePath("/skills");
}
