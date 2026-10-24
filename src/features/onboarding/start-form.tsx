"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { startProgramme, type StepState } from "./actions";

export function StartProgrammeForm() {
  const [state, action] = useActionState<StepState, FormData>(startProgramme, {});
  return (
    <form action={action} className="space-y-3">
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <SubmitButton className="w-full" pendingLabel="Creating your programme…">
        Start my programme <ArrowRight aria-hidden className="size-5" />
      </SubmitButton>
    </form>
  );
}
