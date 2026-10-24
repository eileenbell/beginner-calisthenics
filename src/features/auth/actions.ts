"use server";

import { redirect } from "next/navigation";
import { getSupabase, requireUser } from "@/server/auth";
import { siteOrigin } from "@/server/origin";
import { safeNextPath } from "@/lib/safe-path";
import {
  changePasswordSchema,
  fieldErrors,
  forgotPasswordSchema,
  formValues,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
  type FieldErrors,
} from "@/lib/validation/auth";

export interface AuthFormState {
  errors?: FieldErrors;
  message?: string;
  status?: "check_email" | "sent" | "saved";
  values?: Record<string, string>;
}

function authErrorMessage(error: { code?: string; status?: number; message: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match an account. Check them and try again.";
    case "email_not_confirmed":
      return "Confirm your email first. The link is in the email we sent when you signed up.";
    case "user_already_exists":
    case "email_exists":
      return "An account already uses that email. Sign in instead, or reset your password.";
    case "weak_password":
      return "That password is too easy to guess. Use at least 8 characters with a mix of letters and numbers.";
    case "same_password":
      return "Choose a different password from your current one.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a minute, then try again.";
  }
  if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
  return "Something went wrong on our side. Please try again.";
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData, ["name", "email", "password"]);
  const parsed = signUpSchema.safeParse(values);
  const keep = { name: values.name, email: values.email };
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: keep };

  const supabase = await getSupabase();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { message: authErrorMessage(error), values: keep };
  if (data.session) redirect("/onboarding");
  return { status: "check_email", values: keep };
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData, ["email", "password", "next"]);
  const parsed = signInSchema.safeParse(values);
  const keep = { email: values.email };
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: keep };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: authErrorMessage(error), values: keep };
  redirect(safeNextPath(values.next));
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData, ["email"]);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await getSupabase();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Don't reveal whether the address has an account. Only rate limits are worth reporting.
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) {
    return { message: authErrorMessage(error), values };
  }
  return { status: "sent", values };
}

export async function setNewPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  await requireUser("/reset-password");
  const parsed = newPasswordSchema.safeParse(formValues(formData, ["password", "confirm"]));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: authErrorMessage(error) };
  redirect("/today?notice=password-updated");
}

export async function changePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser("/profile");
  const parsed = changePasswordSchema.safeParse(formValues(formData, ["current", "password", "confirm"]));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await getSupabase();
  // Confirm the current password before changing it.
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.current });
  if (check.error) {
    return check.error.code === "invalid_credentials"
      ? { errors: { current: "That isn't your current password." } }
      : { message: authErrorMessage(check.error) };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: authErrorMessage(error) };
  return { status: "saved", message: "Password updated." };
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
