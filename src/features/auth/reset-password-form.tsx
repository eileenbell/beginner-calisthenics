"use client";

import { useActionState } from "react";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { setNewPassword, type AuthFormState } from "./actions";

export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(setNewPassword, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
        hint={`At least ${PASSWORD_MIN} characters.`}
        error={state.errors?.password}
      />
      <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" required error={state.errors?.confirm} />
      <SubmitButton className="w-full" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
