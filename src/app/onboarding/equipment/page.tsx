import { Armchair, CircleCheck, Columns2, Dumbbell, Grip, Layers, Minus, ShieldCheck, Circle, Building2 } from "lucide-react";
import type { Metadata } from "next";
import { FlowShell } from "@/components/shell/flow-shell";
import { ChoiceCard } from "@/components/ui/choice";
import { StepIndicator } from "@/features/auth/step-indicator";
import { saveEquipment } from "@/features/onboarding/actions";
import { EQUIPMENT_OPTIONS } from "@/features/onboarding/answers";
import { SaveAndExit } from "@/features/onboarding/exit-button";
import { loadStep } from "@/features/onboarding/load";
import { StepForm } from "@/features/onboarding/step-form";

export const metadata: Metadata = { title: "Your equipment" };

const ICONS = {
  mat: Layers,
  bands: Dumbbell,
  pullup_bar: Grip,
  low_bar: Minus,
  parallel_bars: Columns2,
  rings: Circle,
  gym: Building2,
} as const;

export default async function EquipmentStep() {
  const { answers } = await loadStep("equipment");
  const selected = new Set(answers.equipment ?? []);
  return (
    <FlowShell section="Equipment" backHref="/onboarding/schedule" right={<SaveAndExit />}>
      <div className="space-y-6">
        <StepIndicator step={5} label="Your training setup" />
        <div className="space-y-2">
          <h1 className="font-display text-display font-bold tracking-tight">What equipment do you have?</h1>
          <p className="text-body-lg text-text-secondary">
            No equipment is fine. Every plan works with your floor, a wall and a sturdy counter or table. Tick anything extra you can use.
          </p>
        </div>
        <StepForm action={saveEquipment} submitLabel="Build my plan" footer="Your 12-week programme is built around this setup. You can update it later.">
          <div className="flex items-start gap-4 rounded-card border-l-4 border-accent-primary bg-surface-elevated p-4">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-small bg-success-container text-accent-primary">
              <CircleCheck className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="font-display text-card font-semibold">Floor, wall and a sturdy counter or table</p>
              <p className="text-body text-text-secondary">Always included. Enough for the whole push-up pathway, squats and core work.</p>
            </div>
            <Armchair aria-hidden className="ml-auto mt-1 size-5 shrink-0 text-text-secondary" />
          </div>
          <fieldset className="space-y-3">
            <legend className="eyebrow pb-2 text-text-secondary">Anything else?</legend>
            {EQUIPMENT_OPTIONS.map((option) => {
              const Icon = ICONS[option.id];
              return (
                <ChoiceCard
                  key={option.id}
                  type="checkbox"
                  name="equipment"
                  value={option.id}
                  title={option.title}
                  body={option.body}
                  icon={<Icon className="size-5" />}
                  defaultChecked={selected.has(option.id)}
                />
              );
            })}
          </fieldset>
          <div className="flex gap-3 rounded-card bg-surface-secondary p-4">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-strong" />
            <p className="text-body text-text-secondary">
              <strong className="text-text-primary">Safety first:</strong> only hang from a bar that&apos;s securely fixed and rated for your
              weight. Don&apos;t hang from door frames, shelves or improvised setups.
            </p>
          </div>
        </StepForm>
      </div>
    </FlowShell>
  );
}
