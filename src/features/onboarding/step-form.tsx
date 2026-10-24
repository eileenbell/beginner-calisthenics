"use client";

import { ArrowRight } from "lucide-react";
import { useActionState, type ReactNode } from "react";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { StepState } from "./actions";

interface StepFormProps {
  action: (prev: StepState, formData: FormData) => Promise<StepState>;
  submitLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  secondary?: ReactNode;
}

/** Wraps an onboarding step: server action, errors at the top, and the sticky continue button. */
export function StepForm({ action, submitLabel, children, footer, secondary }: StepFormProps) {
  const [state, formAction] = useActionState<StepState, FormData>(action, {});
  const errors = Object.values(state.errors ?? {}).filter(Boolean) as string[];
  return (
    <form action={formAction} className="space-y-6" noValidate>
      {(state.message || errors.length > 0) && (
        <Notice tone="error" title="Check this step">
          {state.message && <p>{state.message}</p>}
          {errors.length > 0 && (
            <ul className="list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}
      {children}
      <div className="sticky bottom-0 -mx-4 space-y-2 bg-gradient-to-t from-background-primary via-background-primary to-transparent px-4 pb-[calc(1rem+var(--safe-bottom))] pt-6">
        <SubmitButton className="w-full" pendingLabel="Saving…">
          {submitLabel} <ArrowRight aria-hidden className="size-5" />
        </SubmitButton>
        {secondary}
        {footer && <p className="text-center text-caption text-text-secondary">{footer}</p>}
      </div>
    </form>
  );
}
