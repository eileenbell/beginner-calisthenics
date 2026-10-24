import { Dumbbell, Footprints, Grip, ShieldCheck, Smile } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FlowShell } from "@/components/shell/flow-shell";
import { ChoiceCard, ChoiceRow } from "@/components/ui/choice";
import { Stepper } from "@/components/ui/stepper";
import { StepIndicator } from "@/features/auth/step-indicator";
import { saveExperience } from "@/features/onboarding/actions";
import {
  CONFIDENCE_OPTIONS,
  EXPERIENCE_OPTIONS,
  HANG_OPTIONS,
  PLANK_OPTIONS,
  PULL_UP_OPTIONS,
  PUSH_OPTIONS,
  SQUAT_OPTIONS,
} from "@/features/onboarding/answers";
import { SaveAndExit } from "@/features/onboarding/exit-button";
import { loadStep } from "@/features/onboarding/load";
import { StepForm } from "@/features/onboarding/step-form";

export const metadata: Metadata = { title: "Where you're starting from" };

function Question({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2 rounded-card bg-surface-secondary p-4">
      <legend className="contents">
        <span className="flex items-center gap-3 pb-1">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-small bg-surface-interactive text-accent-primary">
            {icon}
          </span>
          <span className="font-display text-card font-semibold">{title}</span>
        </span>
      </legend>
      {hint && <p className="pb-1 text-caption text-text-secondary">{hint}</p>}
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

export default async function ExperienceStep() {
  const { answers } = await loadStep("experience");
  const a = answers.assessment;
  const skipButton = (
    <button
      type="submit"
      name="skipAssessment"
      value="1"
      className="flex min-h-11 w-full items-center justify-center text-body font-semibold text-text-secondary underline underline-offset-4 hover:text-text-primary"
    >
      Skip the starting-point questions
    </button>
  );

  return (
    <FlowShell section="Starting point" backHref="/onboarding/goals" right={<SaveAndExit />}>
      <div className="space-y-6">
        <StepIndicator step={3} label="Ability baseline" />
        <div className="space-y-2">
          <h1 className="font-display text-display font-bold tracking-tight">Where are you starting from?</h1>
          <p className="text-body-lg text-text-secondary">
            This sets your first exercises so day one feels manageable. Answer what you know and skip the rest. Nothing here asks you to try
            anything now.
          </p>
        </div>
        <StepForm action={saveExperience} submitLabel="Continue to schedule" secondary={skipButton} footer="If a question doesn't apply, leave it blank.">
          <fieldset className="space-y-3">
            <legend className="eyebrow pb-2 text-text-secondary">01 · Training experience</legend>
            {EXPERIENCE_OPTIONS.map((option) => (
              <ChoiceCard
                key={option.id}
                type="radio"
                name="experience"
                value={option.id}
                title={option.title}
                body={option.body}
                defaultChecked={answers.experience === option.id}
                required
              />
            ))}
          </fieldset>

          <div className="space-y-3">
            <p className="eyebrow text-text-secondary">02 · Your baseline (optional)</p>
            <Question icon={<Dumbbell className="size-4" />} title="Where can you do push-ups comfortably?" hint="Pick the lowest surface where you can do a few controlled reps.">
              {PUSH_OPTIONS.map((o) => (
                <ChoiceRow key={o.id} name="pushVariation" value={o.id} title={o.title} defaultChecked={a?.pushVariation === o.id} />
              ))}
              <div className="pt-2">
                <p className="pb-2 text-body font-semibold">How many controlled reps in one go, at that height?</p>
                <Stepper name="pushReps" label="Push-up reps" unit="reps" min={0} max={50} defaultValue={a?.pushReps ?? 5} size="md" />
              </div>
            </Question>
            <Question icon={<Footprints className="size-4" />} title="How do squats feel?">
              {SQUAT_OPTIONS.map((o) => (
                <ChoiceRow key={o.id} name="squat" value={o.id} title={o.title} defaultChecked={a?.squat === o.id} />
              ))}
            </Question>
            <Question icon={<ShieldCheck className="size-4" />} title="How long can you hold a forearm plank?">
              {PLANK_OPTIONS.map((o) => (
                <ChoiceRow key={o.id} name="plankSeconds" value={String(o.seconds)} title={o.title} defaultChecked={a?.plankSeconds != null && a.plankSeconds === o.seconds} />
              ))}
            </Question>
            <Question icon={<Grip className="size-4" />} title="Hanging from a bar" hint="Only counts if you have a bar, rings or a gym. Otherwise leave it.">
              {HANG_OPTIONS.map((o) => (
                <ChoiceRow
                  key={o.id}
                  name="hangSeconds"
                  value={o.seconds === null ? "" : String(o.seconds)}
                  title={o.title}
                  defaultChecked={o.seconds === null ? a?.hangSeconds === null && a !== undefined && a !== null : a?.hangSeconds === o.seconds}
                />
              ))}
              <p className="pt-2 text-body font-semibold">Full pull-ups, from straight arms</p>
              {PULL_UP_OPTIONS.map((o) => (
                <ChoiceRow key={o.id} name="pullUps" value={String(o.count)} title={o.title} defaultChecked={a?.pullUps === o.count} />
              ))}
            </Question>
            <Question icon={<Smile className="size-4" />} title="How do you feel about starting?" hint="If you're nervous, every exercise starts one step easier.">
              {CONFIDENCE_OPTIONS.map((o) => (
                <ChoiceRow key={o.id} name="confidence" value={String(o.value)} title={o.title} defaultChecked={a?.confidence === o.value} />
              ))}
            </Question>
          </div>

          <div className="flex gap-3 rounded-card bg-surface-secondary p-4">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-strong" />
            <p className="text-body text-text-secondary">
              No pressure. Every exercise has an easier version, and you can change these answers later from Profile.
            </p>
          </div>
        </StepForm>
      </div>
    </FlowShell>
  );
}
