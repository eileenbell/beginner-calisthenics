import { ArrowRight, Dumbbell, Lock, Pause, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LATER_SKILLS, ROADMAPS } from "@/domain";
import { allPathways, CATEGORY_LABELS, shortStageName, STATUS_LABELS, type PathwayCategory, type PathwayView } from "@/features/training/pathways";
import { cn } from "@/lib/cn";
import { getTrainingSnapshot } from "@/server/training";

export const metadata: Metadata = { title: "Skill pathways" };

const FILTERS: { id: "all" | PathwayCategory; label: string }[] = [
  { id: "all", label: "All pathways" },
  { id: "push", label: CATEGORY_LABELS.push },
  { id: "pull", label: CATEGORY_LABELS.pull },
  { id: "core", label: CATEGORY_LABELS.core },
  { id: "legs", label: CATEGORY_LABELS.legs },
];

export default async function SkillsPage({ searchParams }: PageProps<"/skills">) {
  const { category } = await searchParams;
  const filter = FILTERS.find((f) => f.id === category)?.id ?? "all";
  const snapshot = await getTrainingSnapshot();
  const { account } = snapshot;
  const views = allPathways({
    states: snapshot.states,
    achieved: snapshot.achievedMilestones,
    painEvents: snapshot.painEvents,
    equipment: account.preferences.equipment,
    goals: account.preferences.goals,
    now: snapshot.now,
  }).filter((v) => filter === "all" || v.def.category === filter);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="eyebrow text-accent-primary">Skill pathways</p>
        <h1 className="font-display text-title font-bold text-white">Your calisthenics journey</h1>
        <p className="text-body text-text-secondary">Step-by-step pathways from your very first movement to strong bodyweight skills. Your position on each comes from what you&apos;ve logged.</p>
      </div>

      <nav aria-label="Pathway categories" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
          {FILTERS.map((f) => (
            <li key={f.id} className="shrink-0">
              <Link
                href={f.id === "all" ? "/skills" : `/skills?category=${f.id}`}
                aria-current={filter === f.id ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-full px-4 text-body font-semibold",
                  filter === f.id ? "bg-accent-primary text-text-on-accent" : "bg-surface-secondary text-text-secondary hover:text-text-primary",
                )}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <ul className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
        {views.map((view) => (
          <li key={view.def.id}>
            <PathwayCard view={view} />
          </li>
        ))}
      </ul>

      {filter === "all" && (
        <section aria-labelledby="long-term" className="space-y-3">
          <div className="space-y-1">
            <h2 id="long-term" className="font-display text-section font-bold text-white">
              Long-term goals
            </h2>
            <p className="text-body text-text-secondary">
              Bigger skills that take longer than one programme. FORM trains the foundations, and each roadmap shows the whole build-up and what it involves.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
            {ROADMAPS.map((roadmap) => (
              <li key={roadmap.id}>
                <Card as="article" aria-labelledby={`r-${roadmap.id}`} className="flex h-full flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {account.preferences.goals.includes(roadmap.goal) ? <Pill tone="accent">Your goal</Pill> : <Pill tone="outline">Long-term goal</Pill>}
                  </div>
                  <h3 id={`r-${roadmap.id}`} className="font-display text-card font-bold text-white">
                    {roadmap.name}
                  </h3>
                  <p className="text-body text-text-secondary">{roadmap.summary}</p>
                  <p className="text-caption text-text-secondary">{roadmap.phases.length} phases. The first one is in FORM now.</p>
                  <Link
                    href={`/skills/roadmap/${roadmap.id}`}
                    className="mt-auto flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline-offset-4 hover:underline"
                  >
                    See the build-up <ArrowRight aria-hidden className="size-4" />
                    <span className="sr-only">: {roadmap.name}</span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
          <Card tone="secondary" className="space-y-2">
            <h3 className="font-semibold">Other skills people work towards</h3>
            <p className="text-caption text-text-secondary">Advanced skills that FORM doesn&apos;t cover yet.</p>
            <ul className="space-y-1.5 text-body">
              {LATER_SKILLS.map((skill) => (
                <li key={skill.name}>
                  <span className="font-semibold text-text-primary">{skill.name}.</span> <span className="text-text-secondary">{skill.involves}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <Card tone="secondary" className="flex gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-container text-state-success">
          <Sprout className="size-5" />
        </span>
        <div className="space-y-1">
          <h2 className="font-semibold">How progression works</h2>
          <p className="text-body text-text-secondary">
            You move to the next stage after two workouts at the top of your rep range with good control, or one if you rate it too easy. Finishing a workout alone never moves you up, and
            pain always moves you to an easier option.
          </p>
        </div>
      </Card>
    </div>
  );
}

function PathwayCard({ view }: { view: PathwayView }) {
  const muted = view.status === "locked" || view.status === "needs_equipment";
  const current = view.stages.find((s) => s.status === "current");
  const prev = view.stages.find((s) => s.index === view.currentStage - 1);
  const next = view.stages.find((s) => s.status === "next");
  const StatusIcon = view.status === "locked" ? Lock : view.status === "needs_equipment" ? Dumbbell : view.status === "paused" ? Pause : null;

  return (
    <Card as="article" tone={muted ? "secondary" : "elevated"} aria-labelledby={`p-${view.def.id}`} className={cn("flex h-full flex-col gap-3", view.status === "focus" && "ring-1 ring-accent-primary/40")}>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={view.status === "focus" ? "accent" : view.status === "in_progress" || view.status === "top" ? "success" : view.status === "paused" ? "error" : "outline"}>
          {StatusIcon && <StatusIcon aria-hidden className="size-3" />}
          {STATUS_LABELS[view.status]}
        </Pill>
        {view.currentStage > 0 && (
          <span className="eyebrow text-text-secondary">
            Stage {view.currentStage} of {view.def.stages}
          </span>
        )}
      </div>
      <div>
        <h2 id={`p-${view.def.id}`} className={cn("font-display text-section font-bold", muted ? "text-text-secondary" : "text-white")}>
          {view.def.title}
        </h2>
        <p className="text-body text-text-secondary">{view.def.subtitle}</p>
      </div>

      {current && !muted ? (
        <div className="space-y-2 rounded-small bg-surface-interactive p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 font-semibold text-text-primary">
              Stage {current.index}: {current.exercise.name}
            </p>
            <span className="shrink-0 text-caption font-semibold text-accent-strong">
              {view.readiness.streak} of {view.readiness.needed}
            </span>
          </div>
          <ProgressBar value={view.readiness.streak} max={view.readiness.needed} label={`Readiness for the next stage in ${view.def.title}`} />
          <p className="text-caption text-text-secondary">
            {view.status === "top"
              ? "You've reached the last stage in this programme."
              : `${view.readiness.streak} of ${view.readiness.needed} qualifying workouts towards the next stage.`}
            {view.nextMilestone ? ` Next milestone: ${view.nextMilestone.title}.` : ""}
          </p>
        </div>
      ) : (
        <p className="rounded-small bg-surface-interactive p-3 text-body text-text-secondary">
          {view.statusReason ?? (view.currentStage === 0 ? "Not part of your current plan yet." : "")}
        </p>
      )}

      {!muted && current && (
        <div className="space-y-1">
          <p className="eyebrow text-text-secondary">Progression trajectory</p>
          <p className="flex flex-wrap items-center gap-1.5 text-caption">
            {prev && <span className="text-state-success">{shortStageName(prev.exercise.name)} ✓</span>}
            {prev && <ArrowRight aria-hidden className="size-3 text-text-secondary" />}
            <span className="rounded-[4px] bg-accent-primary/15 px-1.5 py-0.5 font-semibold text-accent-primary">{shortStageName(current.exercise.name)} (current)</span>
            {next && <ArrowRight aria-hidden className="size-3 text-text-secondary" />}
            {next && <span className="text-text-secondary">{shortStageName(next.exercise.name)}</span>}
          </p>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="sr-only">
          {view.currentStage} of {view.def.stages} stages reached
        </span>
        <ol aria-hidden className="flex gap-1.5">
          {view.stages.map((s) => (
            <li
              key={s.index}
              className={cn(
                "size-2 rounded-full",
                s.status === "done" && "bg-state-success",
                s.status === "current" && "bg-accent-primary",
                (s.status === "next" || s.status === "upcoming") && "bg-border-default",
              )}
            />
          ))}
        </ol>
        <Link href={`/skills/${view.def.id}`} className="flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline-offset-4 hover:underline">
          {muted ? "Preview pathway" : "Explore pathway"} <ArrowRight aria-hidden className="size-4" />
          <span className="sr-only">: {view.def.title}</span>
        </Link>
      </div>
    </Card>
  );
}
