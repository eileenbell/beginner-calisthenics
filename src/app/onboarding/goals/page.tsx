import { Target } from "lucide-react";
import type { Metadata } from "next";
import { FlowShell } from "@/components/shell/flow-shell";
import { ChoiceCard } from "@/components/ui/choice";
import { Pill } from "@/components/ui/pill";
import { StepIndicator } from "@/features/auth/step-indicator";
import { saveGoals } from "@/features/onboarding/actions";
import { GOAL_OPTIONS, SKILL_GOAL_OPTIONS } from "@/features/onboarding/answers";
import { SaveAndExit } from "@/features/onboarding/exit-button";
import { loadStep } from "@/features/onboarding/load";
import { StepForm } from "@/features/onboarding/step-form";

export const metadata: Metadata = { title: "Your goals" };

export default async function GoalsStep() {
  const { answers } = await loadStep("goals");
  const selected = new Set(answers.goals ?? []);
  return (
    <FlowShell section="Your goals" right={<SaveAndExit />}>
      <div className="space-y-6">
        <StepIndicator step={2} label="Your target" />
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 eyebrow text-accent-primary">
            <Target aria-hidden className="size-4" /> Your target
          </p>
          <h1 className="font-display text-display font-bold tracking-tight">What would you like to achieve?</h1>
          <p className="text-body-lg text-text-secondary">
            Choose up to three, from either list. Your goals decide which pathways your plan highlights and what goes in skill practice.
          </p>
        </div>
        <StepForm action={saveGoals} submitLabel="Continue" footer="You can change your goals at any time from Profile.">
          <fieldset className="space-y-3">
            <legend className="sr-only">Goals (choose up to three)</legend>
            {GOAL_OPTIONS.map((goal, index) => (
              <ChoiceCard
                key={goal.id}
                type="checkbox"
                name="goals"
                value={goal.id}
                title={goal.title}
                body={goal.body}
                defaultChecked={selected.has(goal.id)}
                badge={index === 0 ? <Pill tone="success" dot>A good first goal</Pill> : undefined}
              />
            ))}
          </fieldset>
          <fieldset className="space-y-3 pt-2">
            <legend className="space-y-1 pb-3">
              <span className="block font-display text-section font-bold">Or aim for a specific move</span>
              <span className="block text-body text-text-secondary">
                Each one has its own step-by-step build-up. They count towards your three goals.
              </span>
            </legend>
            {SKILL_GOAL_OPTIONS.map((goal) => (
              <ChoiceCard
                key={goal.id}
                type="checkbox"
                name="goals"
                value={goal.id}
                title={goal.title}
                body={goal.body}
                defaultChecked={selected.has(goal.id)}
                badge={goal.longTerm ? <Pill tone="outline">Long-term goal</Pill> : undefined}
              />
            ))}
          </fieldset>
        </StepForm>
      </div>
    </FlowShell>
  );
}
