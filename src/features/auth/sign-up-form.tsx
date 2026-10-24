"use client";

import { ArrowRight, AtSign, Check, IdCard, MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { signUp, type AuthFormState } from "./actions";

export function SignUpForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(signUp, {});
  const [password, setPassword] = useState("");
  const longEnough = password.length >= PASSWORD_MIN;

  if (state.status === "check_email") {
    return (
      <div className="space-y-4">
        <Notice tone="success" title="Check your email">
          <p>
            We&apos;ve sent a confirmation link to <strong className="text-text-primary">{state.values?.email}</strong>. Open it on this
            device to finish setting up your plan.
          </p>
        </Notice>
        <p className="text-body text-text-secondary">
          Nothing arrived after a few minutes? Check your spam folder, or{" "}
          <Link href="/sign-up" className="font-semibold text-accent-primary underline underline-offset-4">
            try again
          </Link>
          .
        </p>
        <MailCheck aria-hidden className="size-10 text-accent-strong" />
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <Field
        label="Your name"
        name="name"
        autoComplete="given-name"
        defaultValue={state.values?.name}
        error={state.errors?.name}
        icon={<IdCard className="size-5" />}
        required
        maxLength={60}
      />
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
      <div className="space-y-2">
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          error={state.errors?.password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold",
            longEnough ? "bg-success-container text-state-success" : "bg-surface-interactive text-text-secondary",
          )}
        >
          <Check aria-hidden className="size-3.5" />
          {PASSWORD_MIN}+ characters
        </p>
      </div>
      <SubmitButton className="w-full" pendingLabel="Creating your account…">
        Continue to personalisation <ArrowRight aria-hidden className="size-5" />
      </SubmitButton>
      <p className="text-caption text-text-secondary">
        FORM gives general fitness guidance for healthy adults. It isn&apos;t medical advice. If you have an injury or a health condition, or
        you&apos;re pregnant, check with a health professional before you start.
      </p>
    </form>
  );
}
