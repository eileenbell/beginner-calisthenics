"use client";

import { AtSign } from "lucide-react";
import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset, type AuthFormState } from "./actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});
  if (state.status === "sent") {
    return (
      <Notice tone="success" title="Check your email">
        <p>
          If an account uses <strong className="text-text-primary">{state.values?.email}</strong>, we&apos;ve sent it a link to set a new
          password. The link works once and expires after an hour.
        </p>
      </Notice>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <Field
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.values?.email}
        error={state.errors?.email}
        icon={<AtSign className="size-5" />}
        required
      />
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
