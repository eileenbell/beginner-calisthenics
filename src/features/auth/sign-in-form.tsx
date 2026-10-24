"use client";

import { ArrowRight, AtSign } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { signIn, type AuthFormState } from "./actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <input type="hidden" name="next" value={next ?? ""} />
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
      <PasswordField label="Password" name="password" autoComplete="current-password" required error={state.errors?.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-body font-semibold text-accent-primary underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in <ArrowRight aria-hidden className="size-5" />
      </SubmitButton>
    </form>
  );
}
