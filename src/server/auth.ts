import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "./supabase";
import type { OnboardingRow, PreferencesRow, ProfileRow, ProgrammeRow } from "./rows";

/** One Supabase client per request, shared by everything that renders it. */
export const getSupabase = cache(createSupabaseServerClient);

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * The signed-in user, verified with Supabase Auth (getClaims checks the JWT
 * signature, or asks the Auth server when it can't verify locally).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  return user;
}

export interface AccountContext {
  user: SessionUser;
  profile: ProfileRow | null;
  onboarding: OnboardingRow | null;
  preferences: PreferencesRow | null;
  programme: ProgrammeRow | null;
}

/** Everything the app shell needs about the signed-in user, loaded once per request. */
export const getAccount = cache(async (): Promise<AccountContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await getSupabase();
  const [profile, onboarding, preferences, programme] = await Promise.all([
    supabase.from("profiles").select("id, display_name, created_at").eq("id", user.id).maybeSingle(),
    supabase.from("onboarding_responses").select("user_id, current_step, answers, completed_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("training_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("programmes").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
  ]);
  for (const result of [profile, onboarding, preferences, programme]) {
    if (result.error) throw new Error(`Could not load your account: ${result.error.message}`);
  }
  return {
    user,
    profile: profile.data as ProfileRow | null,
    onboarding: onboarding.data as OnboardingRow | null,
    preferences: preferences.data as PreferencesRow | null,
    programme: programme.data as ProgrammeRow | null,
  };
});

export interface TrainingAccount extends AccountContext {
  preferences: PreferencesRow;
  programme: ProgrammeRow;
}

/** For pages inside the app: signed in, onboarded, with an active programme. */
export async function requireTrainingAccount(next?: string): Promise<TrainingAccount> {
  const account = await getAccount();
  if (!account) redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  if (!account.preferences || !account.programme) redirect("/onboarding");
  return account as TrainingAccount;
}

/** Where a signed-in user should land. */
export function homePathFor(account: AccountContext): string {
  return account.preferences && account.programme ? "/today" : "/onboarding";
}

export function displayName(account: AccountContext): string {
  const name = account.profile?.display_name?.trim();
  if (name) return name.split(/\s+/)[0];
  return account.user.email.split("@")[0] || "there";
}
