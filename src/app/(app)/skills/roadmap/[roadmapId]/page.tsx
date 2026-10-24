import { ArrowLeft, ArrowRight, Flag, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ROADMAPS_BY_ID, type RoadmapId } from "@/domain";
import { allPathways, STATUS_LABELS, type PathwayView } from "@/features/training/pathways";
import { cn } from "@/lib/cn";
import { getTrainingSnapshot } from "@/server/training";

export async function generateMetadata({ params }: PageProps<"/skills/roadmap/[roadmapId]">): Promise<Metadata> {
  const { roadmapId } = await params;
  return { title: ROADMAPS_BY_ID.get(roadmapId as RoadmapId)?.name ?? "Long-term goal" };
}

export default async function RoadmapPage({ params }: PageProps<"/skills/roadmap/[roadmapId]">) {
  const { roadmapId } = await params;
  const roadmap = ROADMAPS_BY_ID.get(roadmapId as RoadmapId);
  if (!roadmap) notFound();

  const snapshot = await getTrainingSnapshot();
  const { account } = snapshot;
  const views = new Map(
    allPathways({
      states: snapshot.states,
      achieved: snapshot.achievedMilestones,
      painEvents: snapshot.painEvents,
      equipment: account.preferences.equipment,
      goals: account.preferences.goals,
      now: snapshot.now,
    }).map((v) => [v.def.id as string, v]),
  );
  const isGoal = account.preferences.goals.includes(roadmap.goal);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/skills" className="-ml-1 flex min-h-11 items-center gap-1 eyebrow text-text-secondary hover:text-text-primary">
            <ArrowLeft aria-hidden className="size-4" /> All pathways
          </Link>
          {isGoal ? <Pill tone="accent">Your goal</Pill> : <Pill tone="outline">Long-term goal</Pill>}
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-title font-bold text-white">{roadmap.name}</h1>
          <p className="text-body-lg text-text-secondary">{roadmap.summary}</p>
        </div>
      </div>

      <Card className="space-y-3">
        <h2 className="eyebrow text-accent-primary">What it involves</h2>
        <p className="text-body">{roadmap.involves}</p>
        <dl className="space-y-3 rounded-small bg-surface-interactive p-3 text-body">
          <div>
            <dt className="eyebrow text-text-secondary">Equipment</dt>
            <dd>{roadmap.equipment}</dd>
          </div>
          <div>
            <dt className="eyebrow text-text-secondary">Where coaches start the skill itself</dt>
            <dd className="text-text-secondary">{roadmap.startingPoint}</dd>
          </div>
        </dl>
      </Card>

      <section aria-labelledby="build-up" className="space-y-3">
        <div className="space-y-1">
          <h2 id="build-up" className="eyebrow text-text-secondary">
            The build-up
          </h2>
          <p className="text-caption text-text-secondary">
            Phases follow each other in order. How long each takes varies a lot from person to person, so there are no time estimates here.
          </p>
        </div>
        <ol className="space-y-3">
          {roadmap.phases.map((phase, index) => {
            const inApp = phase.pathways.length > 0;
            return (
              <li key={phase.title}>
                <article aria-labelledby={`phase-${index}`} className={cn("space-y-3 rounded-card p-4", inApp ? "bg-surface-elevated ring-1 ring-accent-primary/40" : "bg-surface-secondary")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={cn("eyebrow", inApp ? "text-accent-primary" : "text-text-secondary")}>Phase {index + 1}</p>
                    {inApp ? <Pill tone="success" dot>In FORM now</Pill> : <Pill tone="outline">Not in FORM yet</Pill>}
                  </div>
                  <div className="space-y-1">
                    <h3 id={`phase-${index}`} className="font-display text-section font-bold text-white">
                      {phase.title}
                    </h3>
                    <p className="text-body text-text-secondary">{phase.summary}</p>
                  </div>
                  <ul className="space-y-2">
                    {phase.steps.map((step) => (
                      <li key={step.name} className="rounded-small bg-surface-interactive p-3">
                        <p className="font-semibold">{step.name}</p>
                        <p className="text-body text-text-secondary">{step.involves}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="flex gap-2 text-body">
                    <Flag aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-strong" />
                    <span>
                      <span className="font-semibold">Rough sign you&apos;re ready to move on: </span>
                      <span className="text-text-secondary">{phase.benchmark}</span>
                    </span>
                  </p>
                  {inApp && (
                    <ul className="space-y-2" aria-label={`FORM pathways for phase ${index + 1}`}>
                      {phase.pathways.map((id) => {
                        const view = views.get(id);
                        return view ? <PathwayLink key={id} view={view} /> : null;
                      })}
                    </ul>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="safety" className="space-y-2">
        <h2 id="safety" className="flex items-center gap-1.5 eyebrow text-text-secondary">
          <ShieldAlert aria-hidden className="size-4" /> Safety
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-body text-text-secondary">
          {roadmap.safety.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <Card tone="secondary" className="space-y-2">
        <p className="text-body text-text-secondary">
          This roadmap is based on coaching guides rather than research, and it hasn&apos;t been reviewed by a qualified professional yet. Coaches differ on
          the order and the pass marks, so treat the benchmarks as rough guides.
        </p>
        {!isGoal && (
          <Link href="/profile/training" className="flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline-offset-4 hover:underline">
            Make this one of your goals <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </Card>
    </div>
  );
}

function PathwayLink({ view }: { view: PathwayView }) {
  const where = view.currentStage > 0 ? `Stage ${view.currentStage} of ${view.def.stages}` : STATUS_LABELS[view.status];
  return (
    <li>
      <Link
        href={`/skills/${view.def.id}`}
        className="flex min-h-11 items-center justify-between gap-3 rounded-small bg-background-primary px-3 py-2 hover:bg-surface-interactive"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-text-primary">{view.def.title}</span>
          <span className="block text-caption text-text-secondary">{where}</span>
        </span>
        <ArrowRight aria-hidden className="size-4 shrink-0 text-accent-strong" />
      </Link>
    </li>
  );
}
