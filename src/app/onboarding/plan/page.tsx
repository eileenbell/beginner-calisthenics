import { ArrowRight, Flag, Gauge, Timer } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlowShell } from "@/components/shell/flow-shell";
import { Notice } from "@/components/ui/notice";
import { Pill } from "@/components/ui/pill";
import { getExercise, SUCCESS_EXPOSURES_TO_PROGRESS } from "@/domain";
import { StepIndicator } from "@/features/auth/step-indicator";
import { completeAnswers } from "@/features/onboarding/answers";
import { SaveAndExit } from "@/features/onboarding/exit-button";
import { loadStep } from "@/features/onboarding/load";
import { previewProgramme } from "@/features/onboarding/preview";
import { StartProgrammeForm } from "@/features/onboarding/start-form";
import { familyName, mainItems, relativeDay, TEMPLATE_FOCUS, uniqueNotices } from "@/features/training/format";
import { goalTarget } from "@/features/training/goal-targets";
import { displayName } from "@/server/auth";

export const metadata: Metadata = { title: "Your programme" };

export default async function PlanStep() {
  const { account, answers } = await loadStep("summary");
  const complete = completeAnswers(answers);
  if (!complete) redirect("/onboarding");
  const preview = previewProgramme(complete, new Date());
  const { profile } = complete;
  const target = goalTarget(profile.goals[0]);
  const firstPlan = preview.firstWeek[0]?.plan;
  const movements = new Map<string, { family: string; exercise: string }>();
  for (const { plan } of preview.firstWeek) {
    for (const item of mainItems(plan)) {
      if (!movements.has(item.exerciseId)) {
        movements.set(item.exerciseId, { family: familyName(item.familyId), exercise: getExercise(item.exerciseId).name });
      }
    }
  }
  const push = preview.states.find((s) => s.familyId === "push_up");
  const notices = uniqueNotices(preview.firstWeek.flatMap((w) => w.plan.notices));
  const name = displayName(account);

  return (
    <FlowShell section="Your plan" backHref="/onboarding/equipment" right={<SaveAndExit />}>
      <div className="space-y-6">
        <StepIndicator step={6} label="Your plan" />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="success" dot>
              Programme for {name}
            </Pill>
            <span className="eyebrow text-text-secondary">Phase 1</span>
          </div>
          <h1 className="font-display text-[2rem] font-bold uppercase leading-[2.375rem] tracking-[-0.02em]">Your foundations programme</h1>
          <p className="text-body-lg text-text-secondary">
            Built from your answers. You&apos;ll start push-ups at{" "}
            <strong className="text-text-primary">{push ? getExercise(push.exerciseId).name.toLowerCase() : "the wall"}</strong>, and every
            exercise moves up only when you&apos;re ready.
          </p>
        </div>

        <div className="relative h-40 overflow-hidden rounded-card bg-surface-secondary">
          <Image src="/images/design/incline-push-up-bench.png" alt="" fill sizes="(max-width: 640px) 100vw, 576px" className="object-cover grayscale-[40%]" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background-primary via-background-primary/40 to-transparent" />
        </div>

        <section aria-labelledby="overview" className="space-y-4 rounded-card bg-surface-elevated p-4">
          <h2 id="overview" className="sr-only">
            Programme overview
          </h2>
          <dl className="grid grid-cols-3 gap-2 rounded-small bg-background-primary p-4 text-center [&>div]:flex [&>div]:flex-col-reverse [&>div]:gap-1">
            <div>
              <dt className="eyebrow text-text-secondary">Weeks</dt>
              <dd className="font-display text-section font-bold">{preview.weeks}</dd>
            </div>
            <div>
              <dt className="eyebrow text-text-secondary">Sessions / wk</dt>
              <dd className="font-display text-section font-bold text-accent-primary">{profile.daysPerWeek}</dd>
            </div>
            <div>
              <dt className="eyebrow text-text-secondary">Min / session</dt>
              <dd className="font-display text-section font-bold">~{firstPlan?.estimatedMinutes ?? profile.sessionMinutes}</dd>
            </div>
          </dl>

          <div className="flex items-start gap-4 rounded-small bg-surface-secondary p-4">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-small bg-border-default text-accent-primary">
              <Flag className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow text-accent-primary">Pathway target</p>
              <p className="font-display text-section font-bold">{target.milestone.title}</p>
              <p className="text-body text-text-secondary">
                {target.skill.name} pathway. Milestones along the way are recorded as you log your sets.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-card font-semibold uppercase">Phase 1: Build your base</h3>
              <span className="text-caption font-semibold text-text-secondary">Weeks 1–4</span>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {[...movements.values()].slice(0, 6).map((m) => (
                <li key={m.exercise} className="flex min-h-20 flex-col justify-between gap-2 rounded-small bg-surface-secondary p-3">
                  <span className="eyebrow text-text-secondary">{m.family}</span>
                  <span className="text-body font-semibold">{m.exercise}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 rounded-small bg-surface-secondary p-4">
            <Gauge aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-strong" />
            <p className="text-body text-text-secondary">
              <strong className="text-text-primary">How you move up:</strong> when you reach the top of an exercise&apos;s rep range on every
              set, with good control, in {SUCCESS_EXPOSURES_TO_PROGRESS} workouts in a row, the next variation unlocks. If something feels
              too hard twice in a row, it steps back. Never rushed.
            </p>
          </div>
        </section>

        {notices.length > 0 && (
          <Notice tone="info" title="Based on your equipment">
            <ul className="list-disc space-y-1 pl-4">
              {notices.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Notice>
        )}

        <section aria-labelledby="week-one" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="week-one" className="font-display text-section font-bold uppercase">
              Week 1
            </h2>
            <span className="eyebrow text-text-secondary">{preview.firstWeek.length} workouts scheduled</span>
          </div>
          <ol className="space-y-2">
            {preview.firstWeek.map(({ slot, plan }) => (
              <li key={slot.scheduledOn} className="flex items-center gap-4 rounded-card bg-surface-secondary p-4">
                <span className="flex w-14 shrink-0 flex-col items-center rounded-small bg-surface-interactive py-1.5 text-center">
                  <span className="eyebrow text-text-secondary">Day</span>
                  <span className="font-display text-card font-bold text-accent-primary">{String(slot.slot + 1).padStart(2, "0")}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-card font-semibold">{plan.title}</p>
                  <p className="text-caption text-text-secondary">
                    {relativeDay(slot.scheduledOn, preview.startedOn)} · {TEMPLATE_FOCUS[slot.template].label}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-text-secondary">
                  <Timer aria-hidden className="size-4" />~{plan.estimatedMinutes} min
                </span>
              </li>
            ))}
          </ol>
        </section>

        <StartProgrammeForm />
        <p className="text-center">
          <Link href="/onboarding/goals" className="inline-flex min-h-11 items-center gap-1 text-caption font-semibold uppercase tracking-wide text-text-secondary underline-offset-4 hover:underline">
            Change my answers <ArrowRight aria-hidden className="size-4" />
          </Link>
        </p>
      </div>
    </FlowShell>
  );
}
