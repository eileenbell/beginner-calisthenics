import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import { FlowShell } from "@/components/shell/flow-shell";
import { StepIndicator } from "@/features/auth/step-indicator";
import { saveSchedule } from "@/features/onboarding/actions";
import { SaveAndExit } from "@/features/onboarding/exit-button";
import { loadStep } from "@/features/onboarding/load";
import { ScheduleFields } from "@/features/onboarding/schedule-fields";
import { StepForm } from "@/features/onboarding/step-form";

export const metadata: Metadata = { title: "Your schedule" };

export default async function ScheduleStep() {
  const { answers } = await loadStep("schedule");
  return (
    <FlowShell section="Schedule" backHref="/onboarding/experience" right={<SaveAndExit />}>
      <div className="space-y-6">
        <StepIndicator step={4} label="Schedule" />
        <div className="space-y-2">
          <h1 className="font-display text-display font-bold tracking-tight">Let&apos;s build a routine that fits your life.</h1>
          <p className="text-body-lg text-text-secondary">Consistency beats intensity. Pick a rhythm you can keep for the next 12 weeks.</p>
        </div>
        <StepForm action={saveSchedule} submitLabel="Continue to equipment">
          <ScheduleFields
            initial={{
              daysPerWeek: answers.daysPerWeek,
              trainingDays: answers.trainingDays,
              sessionMinutes: answers.sessionMinutes,
              environment: answers.environment,
            }}
          />
          <div className="flex gap-3 rounded-card bg-surface-secondary p-4">
            <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-strong" />
            <p className="text-body text-text-secondary">
              Life happens. You can change your days or session length at any time without losing your progress.
            </p>
          </div>
        </StepForm>
      </div>
    </FlowShell>
  );
}
