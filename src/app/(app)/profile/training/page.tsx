import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChoiceCard } from "@/components/ui/choice";
import { Pill } from "@/components/ui/pill";
import { EQUIPMENT_OPTIONS, GOAL_OPTIONS, SKILL_GOAL_OPTIONS } from "@/features/onboarding/answers";
import { ScheduleFields } from "@/features/onboarding/schedule-fields";
import { TrainingSettingsForm } from "@/features/profile/forms";
import { requireTrainingAccount } from "@/server/auth";

export const metadata: Metadata = { title: "Training settings" };

export default async function TrainingSettingsPage() {
  const { preferences: prefs } = await requireTrainingAccount("/profile/training");
  const goals = new Set<string>(prefs.goals);
  const kit = new Set<string>(prefs.equipment);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <Link href="/profile" aria-label="Back to profile" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:text-accent-primary">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="space-y-1 pt-1">
          <h1 className="font-display text-title font-bold text-white">Training settings</h1>
          <p className="text-body text-text-secondary">
            Changes apply from today. Sessions you&apos;ve already done stay in your history, and your levels don&apos;t change.
          </p>
        </div>
      </div>

      <TrainingSettingsForm>
        <fieldset className="space-y-3">
          <legend className="eyebrow pb-2 text-text-secondary">Goals (up to three)</legend>
          {GOAL_OPTIONS.map((g) => (
            <ChoiceCard key={g.id} type="checkbox" name="goals" value={g.id} title={g.title} body={g.body} defaultChecked={goals.has(g.id)} />
          ))}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="eyebrow pb-2 text-text-secondary">Specific moves (count towards your three goals)</legend>
          {SKILL_GOAL_OPTIONS.map((g) => (
            <ChoiceCard
              key={g.id}
              type="checkbox"
              name="goals"
              value={g.id}
              title={g.title}
              body={g.body}
              defaultChecked={goals.has(g.id)}
              badge={g.longTerm ? <Pill tone="outline">Long-term goal</Pill> : undefined}
            />
          ))}
        </fieldset>

        <ScheduleFields
          initial={{
            daysPerWeek: prefs.days_per_week,
            trainingDays: prefs.training_days,
            sessionMinutes: prefs.session_minutes,
            environment: prefs.environment,
          }}
        />

        <fieldset className="space-y-3">
          <legend className="eyebrow pb-2 text-text-secondary">Equipment beyond floor, wall and counter</legend>
          {EQUIPMENT_OPTIONS.map((e) => (
            <ChoiceCard key={e.id} type="checkbox" name="equipment" value={e.id} title={e.title} body={e.body} defaultChecked={kit.has(e.id)} />
          ))}
          <p className="text-caption text-text-secondary">Only hang from a bar that&apos;s securely fixed and rated for your weight.</p>
        </fieldset>
      </TrainingSettingsForm>
    </div>
  );
}
