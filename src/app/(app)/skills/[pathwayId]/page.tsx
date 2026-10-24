import { ArrowLeft, ArrowRight, Check, CircleHelp, Flag, Lock, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SubmitButton } from "@/components/ui/submit-button";
import { familyExercises, localDate, MILESTONES_BY_ID, PAIN_HISTORY_DAYS, rangeOf, type Exercise } from "@/domain";
import { dayMonth, plural } from "@/features/training/format";
import { PATHWAYS, pathwayView, STATUS_LABELS, type StageView } from "@/features/training/pathways";
import { startWorkout } from "@/features/workout/actions";
import { cn } from "@/lib/cn";
import { getSupabase } from "@/server/auth";
import { getTrainingSnapshot, nextSession, planSession } from "@/server/training";

export async function generateMetadata({ params }: PageProps<"/skills/[pathwayId]">): Promise<Metadata> {
  const { pathwayId } = await params;
  return { title: PATHWAYS.find((p) => p.id === pathwayId)?.title ?? "Skill pathway" };
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

function practiceTarget(exercise: Exercise, target: number | null): string {
  const [lo, hi] = rangeOf(exercise);
  const unit = exercise.measure === "seconds" ? "seconds" : "reps";
  const side = exercise.perSide ? " each side" : "";
  return target ? `${target} ${unit}${side} per set (range ${lo}–${hi})` : `${lo}–${hi} ${unit}${side}`;
}

export default async function PathwayPage({ params }: PageProps<"/skills/[pathwayId]">) {
  const { pathwayId } = await params;
  const def = PATHWAYS.find((p) => p.id === pathwayId);
  if (!def) notFound();

  const snapshot = await getTrainingSnapshot();
  const { account } = snapshot;
  const view = pathwayView(def, {
    states: snapshot.states,
    achieved: snapshot.achievedMilestones,
    painEvents: snapshot.painEvents,
    equipment: account.preferences.equipment,
    goals: account.preferences.goals,
    now: snapshot.now,
  });
  const locked = view.status === "locked";

  // Practice log: every workout where an exercise from this family was logged.
  const supabase = await getSupabase();
  const familyIds = familyExercises(def.family).map((e) => e.id);
  const { data: logRows } = await supabase.from("set_logs").select("session_id, logged_at").eq("user_id", account.user.id).in("exercise_id", familyIds);
  const sessions = new Set((logRows ?? []).map((r: { session_id: string }) => r.session_id));
  const lastLogged = (logRows ?? []).map((r: { logged_at: string }) => r.logged_at).sort().at(-1);

  const achievedAt = new Map(snapshot.milestones.map((m) => [m.milestone_id, m.achieved_at]));
  const gate = view.skill.gate;
  const recentPain = gate
    ? snapshot.painEvents.some((p) => gate.painFreeFamilies.includes(p.familyId) && snapshot.now.getTime() - new Date(p.at).getTime() < PAIN_HISTORY_DAYS * 86_400_000)
    : false;

  const next = nextSession(snapshot);
  const practisedToday =
    next.slot && (next.kind === "today" || next.kind === "catch_up") && view.current
      ? planSession(snapshot, next.slot.template, next.slot.week).items.some((i) => i.familyId === def.family)
      : false;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/skills" className="-ml-1 flex min-h-11 items-center gap-1 eyebrow text-text-secondary hover:text-text-primary">
            <ArrowLeft aria-hidden className="size-4" /> All pathways
          </Link>
          <Pill tone={locked || view.status === "needs_equipment" ? "outline" : "success"} dot={!locked}>
            {view.currentStage > 0 ? `Stage ${view.currentStage} of ${def.stages} · ` : ""}
            {STATUS_LABELS[view.status]}
          </Pill>
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-title font-bold text-white">{def.title}</h1>
          <p className="text-body-lg text-text-secondary">{def.subtitle}</p>
        </div>
      </div>

      {view.current && view.state && !locked ? (
        <Card className="space-y-3 ring-1 ring-accent-primary/30">
          <div className="space-y-1">
            <p className="eyebrow text-accent-primary">
              Current focus · Stage {view.currentStage}
            </p>
            <h2 className="font-display text-section font-bold text-white">{view.current.name}</h2>
            <p className="text-body text-text-secondary">Practice target: {practiceTarget(view.current, view.state.target)}</p>
          </div>
          <div className="space-y-1">
            <ProgressBar value={view.readiness.streak} max={view.readiness.needed} label="Readiness for the next stage" />
            <p className="text-caption text-text-secondary">
              {view.readiness.streak} of {view.readiness.needed} qualifying workouts at the top of the range with good control
            </p>
          </div>
          {view.status === "paused" && <p className="rounded-small bg-error-tint p-3 text-body">{view.statusReason}</p>}
          <LinkButton href={`/exercises/${view.current.id}`} variant="secondary" size="md" className="w-full">
            <CircleHelp aria-hidden className="size-4" /> Technique guide for this stage
          </LinkButton>
        </Card>
      ) : (
        <Card tone="secondary" className="flex gap-3">
          <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <div className="space-y-1">
            <h2 className="font-semibold">{locked ? "Not unlocked yet" : view.status === "needs_equipment" ? "Needs equipment" : "Not in your plan yet"}</h2>
            <p className="text-body text-text-secondary">{view.statusReason ?? "This pathway joins your plan when it matches your goals and equipment."}</p>
          </div>
        </Card>
      )}

      {gate && (
        <section aria-labelledby="prereqs" className="space-y-2">
          <h2 id="prereqs" className="eyebrow text-text-secondary">
            Prerequisites
          </h2>
          <ul className="space-y-2">
            {gate.requiredMilestones.map((id) => {
              const m = MILESTONES_BY_ID.get(id)!;
              const done = snapshot.achievedMilestones.has(id);
              return (
                <li key={id} className="flex items-center gap-3 rounded-card bg-surface-secondary p-3">
                  <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", done ? "bg-success-container text-state-success" : "bg-surface-interactive text-text-secondary")}>
                    {done ? <Check className="size-4" /> : <Lock className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{m.title}</span>
                    <span className="block text-caption text-text-secondary">{done ? "Done" : "Not yet"}</span>
                  </span>
                </li>
              );
            })}
            <li className="flex items-center gap-3 rounded-card bg-surface-secondary p-3">
              <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", !recentPain ? "bg-success-container text-state-success" : "bg-error-tint text-state-error")}>
                {!recentPain ? <Check className="size-4" /> : <Lock className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">No related discomfort in the last {PAIN_HISTORY_DAYS} days</span>
                <span className="block text-caption text-text-secondary">{recentPain ? "Discomfort was reported recently, so this stays locked for now." : "Nothing reported."}</span>
              </span>
            </li>
          </ul>
          <p className="text-caption text-text-secondary">{gate.explanation}</p>
        </section>
      )}

      <section aria-labelledby="tree" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="tree" className="eyebrow text-text-secondary">
            Skill progression tree
          </h2>
          {view.currentStage > 0 && <span className="eyebrow text-accent-strong">Stage {view.currentStage} active</span>}
        </div>
        <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[1.1rem] before:top-6 before:w-0.5 before:bg-border-default">
          {view.stages.map((stage) => (
            <StageItem key={stage.index} stage={stage} total={def.stages} target={view.state?.target ?? null} readiness={view.readiness} practisedToday={practisedToday} slotId={next.slot?.id} />
          ))}
        </ol>
      </section>

      <section aria-labelledby="milestones" className="space-y-2">
        <h2 id="milestones" className="eyebrow text-text-secondary">
          Milestones
        </h2>
        <ul className="space-y-2">
          {view.milestones.map(({ milestone, achieved }) => (
            <li key={milestone.id} className={cn("flex items-start gap-3 rounded-card p-3", achieved ? "bg-surface-elevated" : "bg-surface-secondary")}>
              <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", achieved ? "bg-accent-primary text-text-on-accent" : "bg-surface-interactive text-text-secondary")}>
                {achieved ? <Flag className="size-4" /> : <Star className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{milestone.title}</span>
                <span className="block text-caption text-text-secondary">
                  {milestone.description}
                  {achieved && achievedAt.get(milestone.id) ? ` Achieved ${dayMonth(localDate(new Date(achievedAt.get(milestone.id)!), account.preferences.time_zone))}.` : ""}
                </span>
              </span>
              <span className="sr-only">{achieved ? "Achieved" : "Not yet achieved"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="log" className="space-y-2">
        <h2 id="log" className="eyebrow text-text-secondary">
          Practice log
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-card bg-surface-secondary p-3">
            <dt className="text-caption text-text-secondary">Workouts practised</dt>
            <dd className="font-display text-title font-bold text-white">{sessions.size}</dd>
          </div>
          <div className="rounded-card bg-surface-secondary p-3">
            <dt className="text-caption text-text-secondary">Last practised</dt>
            <dd className="font-display text-section font-bold text-white">{lastLogged ? dayMonth(localDate(new Date(lastLogged), account.preferences.time_zone)) : "Not yet"}</dd>
          </div>
        </dl>
        {sessions.size > 0 && <p className="text-caption text-text-secondary">Counted from {plural(sessions.size, "workout")} where you logged at least one set from this pathway.</p>}
      </section>
    </div>
  );
}

function StageItem({
  stage,
  total,
  target,
  readiness,
  practisedToday,
  slotId,
}: {
  stage: StageView;
  total: number;
  target: number | null;
  readiness: { streak: number; needed: number };
  practisedToday: boolean;
  slotId?: string;
}) {
  const e = stage.exercise;
  const isCurrent = stage.status === "current";
  const label =
    stage.status === "done" ? "Behind you" : isCurrent ? "Current practice" : stage.status === "next" ? "Next stage" : stage.index === total ? "Pathway goal" : "Future stage";
  return (
    <li className="relative flex gap-3">
      <span
        aria-hidden
        className={cn(
          "z-10 mt-3 flex size-9 shrink-0 items-center justify-center rounded-full",
          stage.status === "done" && "bg-accent-primary text-text-on-accent",
          isCurrent && "bg-accent-primary text-text-on-accent ring-4 ring-accent-primary/25",
          stage.status === "next" && "bg-surface-elevated text-text-secondary ring-1 ring-border-default",
          stage.status === "upcoming" && "bg-surface-secondary text-state-disabled",
        )}
      >
        {stage.status === "done" ? <Check className="size-4" /> : stage.status === "upcoming" || stage.status === "next" ? <Lock className="size-3.5" /> : <span className="font-bold">{stage.index}</span>}
      </span>
      <div className={cn("min-w-0 flex-1 space-y-2 rounded-card p-4", isCurrent ? "bg-surface-elevated ring-1 ring-accent-primary/40" : "bg-surface-secondary", stage.status === "upcoming" && "opacity-70")}>
        <div className="flex items-center justify-between gap-2">
          <p className={cn("eyebrow", isCurrent ? "text-accent-primary" : "text-text-secondary")}>
            Stage {stage.index} · {label}
          </p>
          {isCurrent && (
            <span className="text-caption font-semibold text-accent-strong">
              {readiness.streak}/{readiness.needed}
            </span>
          )}
        </div>
        <h3 className={cn("font-display font-semibold", isCurrent ? "text-section text-white" : "text-card text-text-primary")}>{e.name}</h3>
        <p className="text-body text-text-secondary">{firstSentence(e.why)}</p>
        {isCurrent && (
          <dl className="grid grid-cols-1 gap-3 rounded-small bg-surface-interactive p-3 text-body tablet:grid-cols-2">
            <div>
              <dt className="eyebrow text-text-secondary">Practice target</dt>
              <dd className="font-semibold">{practiceTarget(e, target)}</dd>
            </div>
            <div>
              <dt className="eyebrow text-text-secondary">Good control</dt>
              <dd className="text-text-secondary">{firstSentence(e.goodControl)}</dd>
            </div>
          </dl>
        )}
        {(stage.status === "next" || stage.status === "upcoming") && (
          <p className="text-caption text-text-secondary">Your plan moves you here once the stage before it is consistently strong and controlled.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {isCurrent && practisedToday && slotId && (
            <form action={startWorkout}>
              <input type="hidden" name="scheduledWorkoutId" value={slotId} />
              <SubmitButton size="sm" pendingLabel="Starting…" className="rounded-small">
                Start today&apos;s workout
              </SubmitButton>
            </form>
          )}
          <Link href={`/exercises/${e.id}`} className="flex min-h-11 items-center gap-1 text-body font-semibold text-accent-strong underline-offset-4 hover:underline">
            {isCurrent ? "Technique guide" : "View exercise"} <ArrowRight aria-hidden className="size-4" />
            <span className="sr-only">: {e.name}</span>
          </Link>
        </div>
      </div>
    </li>
  );
}
