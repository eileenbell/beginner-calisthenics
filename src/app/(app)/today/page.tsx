import { ArrowRight, BadgeCheck, Check, ChevronRight, Clock, Flag, Flower2, Lock, Moon, Play, Timer, Trophy, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Chip, Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SubmitButton } from "@/components/ui/submit-button";
import { ACHIEVEMENTS, getExercise, MILESTONES_BY_ID } from "@/domain";
import { ExerciseMedia } from "@/features/exercises/exercise-media";
import { allPathways, featuredPathway, shortStageName, type PathwayView } from "@/features/training/pathways";
import {
  DIFFICULTY_LABELS,
  formatPrescription,
  greeting,
  hourIn,
  mainItems,
  plural,
  relativeDay,
  sessionEquipment,
  TEMPLATE_FOCUS,
  uniqueNotices,
  weekdayLetter,
  weekdayLong,
} from "@/features/training/format";
import { missedThisWeek, weekCounts, weekTiles, type DayTile } from "@/features/training/week";
import { startWorkout } from "@/features/workout/actions";
import { cn } from "@/lib/cn";
import { displayName } from "@/server/auth";
import { getTrainingSnapshot, nextSession, planSession, type TrainingSnapshot } from "@/server/training";

export const metadata: Metadata = { title: "Today" };

const NOTICES: Record<string, { tone: "success" | "info" | "warning"; text: string }> = {
  welcome: { tone: "success", text: "Your programme is ready. Start your first session whenever you're set." },
  "password-updated": { tone: "success", text: "Your password has been updated." },
  discarded: { tone: "info", text: "Workout discarded. Nothing from it counts towards your progress." },
  "session-unavailable": { tone: "warning", text: "That session isn't available any more. Here's what's next." },
  "start-failed": { tone: "warning", text: "We couldn't start that workout. Please try again." },
  "new-block": { tone: "success", text: "Your new 12-week block starts today, carrying on from your current levels." },
};

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const { notice } = await searchParams;
  const snapshot = await getTrainingSnapshot();
  const { account, today, week, schedule } = snapshot;
  const name = displayName(account);
  const tiles = weekTiles(schedule, account.programme.started_on, week, today);
  const counts = weekCounts(schedule, week);
  const missed = missedThisWeek(schedule, week, today);
  const next = nextSession(snapshot);
  const pathways = allPathways({
    states: snapshot.states,
    achieved: snapshot.achievedMilestones,
    painEvents: snapshot.painEvents,
    equipment: account.preferences.equipment,
    goals: account.preferences.goals,
    now: snapshot.now,
  });
  const featured = featuredPathway(pathways, account.preferences.goals);
  const flash = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Pill tone="success" dot>
            {snapshot.programmeOver ? "Programme complete" : `Foundations · Week ${week} of ${account.programme.weeks}`}
          </Pill>
          {missed.length === 0 ? (
            <span className="flex items-center gap-1 eyebrow text-state-success">
              <BadgeCheck aria-hidden className="size-4" /> On track
            </span>
          ) : (
            <span className="flex items-center gap-1 eyebrow text-accent-strong">
              <Clock aria-hidden className="size-4" /> {plural(missed.length, "session")} to catch up
            </span>
          )}
        </div>
        <h1 className="font-display text-display font-bold tracking-[-0.025em] text-white">
          {greeting(hourIn(snapshot.now, account.preferences.time_zone))}, {name}
        </h1>
        <p className="text-body text-text-secondary">Consistency over intensity. Practise at your own pace today.</p>
      </div>

      {flash && <Notice tone={flash.tone}>{flash.text}</Notice>}

      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] desktop:items-start">
        <div className="space-y-6">
          <WeeklyRhythm tiles={tiles} completed={counts.completed} planned={counts.planned} />
          <SessionHero snapshot={snapshot} next={next} />
        </div>
        <div className="space-y-6">
          <MilestoneCard view={featured} />
          <RecentWin snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
}

function WeeklyRhythm({ tiles, completed, planned }: { tiles: DayTile[]; completed: number; planned: number }) {
  return (
    <Card aria-labelledby="rhythm-title" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="rhythm-title" className="eyebrow text-text-secondary">
          Weekly rhythm
        </h2>
        <p className="text-caption font-semibold text-state-success">
          {completed} of {planned} planned workouts completed
        </p>
      </div>
      <ol className="grid grid-cols-7 gap-1.5">
        {tiles.map((tile) => (
          <li key={tile.date}>
            <DayTileView tile={tile} />
          </li>
        ))}
      </ol>
    </Card>
  );
}

const DAY_STATUS: Record<DayTile["kind"], string> = {
  done: "workout completed",
  today: "workout planned today",
  today_done: "today, workout completed",
  planned: "workout planned",
  missed: "planned workout not done yet",
  rest: "rest day",
  today_rest: "today, rest day",
};

function DayTileView({ tile }: { tile: DayTile }) {
  const isToday = tile.kind.startsWith("today");
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-small p-1.5",
        isToday ? "bg-surface-interactive shadow-[0_0_16px_-4px_rgba(204,241,60,0.45)] ring-1 ring-accent-primary/60" : "bg-surface-secondary",
      )}
    >
      <span aria-hidden className={cn("eyebrow", isToday ? "text-accent-primary" : "text-text-secondary")}>
        {weekdayLetter(tile.date)}
      </span>
      <span className="sr-only">
        {weekdayLong(tile.date)}: {DAY_STATUS[tile.kind]}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-7 items-center justify-center rounded-full",
          (tile.kind === "done" || tile.kind === "today_done") && "bg-success-container text-state-success",
          tile.kind === "today" && "bg-accent-primary text-text-on-accent",
          tile.kind === "planned" && "bg-surface-elevated",
          tile.kind === "missed" && "border border-dashed border-accent-strong",
          (tile.kind === "rest" || tile.kind === "today_rest") && "bg-surface-interactive text-text-secondary",
        )}
      >
        {(tile.kind === "done" || tile.kind === "today_done") && <Check className="size-4" />}
        {tile.kind === "today" && <Play className="size-3.5 fill-current" />}
        {tile.kind === "planned" && <span className="size-1.5 rounded-full bg-state-disabled" />}
        {tile.kind === "missed" && <span className="size-1.5 rounded-full bg-accent-strong" />}
        {tile.kind === "rest" && <Moon className="size-3.5" />}
        {tile.kind === "today_rest" && <Flower2 className="size-3.5" />}
      </span>
    </div>
  );
}

const EYEBROW: Record<string, string> = {
  resume: "Workout in progress",
  today: "Today's session",
  catch_up: "Catch-up session",
  upcoming: "Next session",
};

function SessionHero({ snapshot, next }: { snapshot: TrainingSnapshot; next: ReturnType<typeof nextSession> }) {
  if (next.kind === "none" || (!next.slot && next.kind !== "resume")) {
    return (
      <Card className="space-y-3">
        <p className="eyebrow text-accent-primary">Programme complete</p>
        <h2 className="font-display text-title font-bold text-white">You&apos;ve finished all 12 weeks</h2>
        <p className="text-body text-text-secondary">
          Start a new block from Profile to keep going. Your current levels carry over, so you won&apos;t start from scratch.
        </p>
        <Link href="/profile#programme" className="inline-flex min-h-11 items-center gap-1 text-body font-semibold text-accent-strong">
          Start a new block <ChevronRight aria-hidden className="size-4" />
        </Link>
      </Card>
    );
  }

  const template = next.slot?.template ?? snapshot.inProgress!.template;
  const plan = planSession(snapshot, template, next.slot?.week ?? snapshot.week);
  const main = mainItems(plan);
  const first = main[0];
  const firstExercise = first ? getExercise(first.exerciseId) : null;
  const equipment = sessionEquipment(plan);
  const beginnerFriendly = main.every((i) => getExercise(i.exerciseId).difficulty <= 2);
  const notices = uniqueNotices(plan.notices);
  const when = next.slot ? relativeDay(next.slot.scheduled_on, snapshot.today) : "Today";

  return (
    <Card aria-labelledby="session-title" className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow text-accent-primary">
            {EYEBROW[next.kind]} · ~{plan.estimatedMinutes} min · {plural(main.length, "movement")}
          </p>
          <Timer aria-hidden className="size-5 text-text-secondary" />
        </div>
        <h2 id="session-title" className="font-display text-title font-bold tracking-[-0.02em] text-white">
          {next.kind === "resume" ? snapshot.inProgress!.title : plan.title}
        </h2>
        {next.kind !== "today" && next.kind !== "resume" && <p className="text-body text-text-secondary">{when}</p>}
      </div>

      {firstExercise && (
        <ExerciseMedia exerciseId={firstExercise.id} className="h-36" sizes="(max-width: 768px) 100vw, 480px">
          {firstExercise.cues[0] && (
            <span className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-small bg-background-primary/85 px-2 py-1 text-caption font-semibold text-white">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent-primary" />
              <span className="truncate">Form guide: {firstExercise.cues[0]}</span>
            </span>
          )}
        </ExerciseMedia>
      )}

      <div className="flex flex-wrap gap-2">
        <Chip>{TEMPLATE_FOCUS[template].tag}</Chip>
        {beginnerFriendly && <Chip>Beginner friendly</Chip>}
        {equipment.short !== "None" && <Chip>{equipment.short} required</Chip>}
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-small bg-surface-secondary p-2 text-center">
        <div className="space-y-0.5 py-1">
          <dt className="eyebrow text-text-secondary">Focus</dt>
          <dd className="font-display text-card font-bold leading-tight text-white">{TEMPLATE_FOCUS[template].label}</dd>
          <dd className="text-caption text-text-secondary">{plan.phase === "foundations" ? "Learn the moves" : plan.phase === "build" ? "Build reps" : "Consolidate"}</dd>
        </div>
        <div className="space-y-0.5 py-1">
          <dt className="eyebrow text-text-secondary">Equipment</dt>
          <dd className="font-display text-card font-bold leading-tight text-white">{equipment.short}</dd>
          <dd className="text-caption text-text-secondary">{equipment.detail}</dd>
        </div>
        <div className="space-y-0.5 py-1">
          <dt className="eyebrow text-text-secondary">First up</dt>
          <dd className="font-display text-card font-bold leading-tight text-accent-primary">{first ? formatPrescription(first).replace(" each side", "") : "—"}</dd>
          <dd className="text-caption text-text-secondary">{firstExercise ? firstExercise.name : ""}</dd>
        </div>
      </dl>

      {notices.length > 0 && (
        <ul className="space-y-1 text-caption text-text-secondary">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {next.kind === "resume" ? (
        <Link
          href={`/workout/${snapshot.inProgress!.id}`}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-card bg-accent-primary font-display text-card font-bold uppercase text-text-on-accent shadow-[0_0_24px_-4px_rgba(204,241,60,0.35)]"
        >
          Resume workout <ArrowRight aria-hidden className="size-5" />
        </Link>
      ) : (
        <form action={startWorkout}>
          <input type="hidden" name="scheduledWorkoutId" value={next.slot!.id} />
          <SubmitButton className="w-full rounded-card" pendingLabel="Starting…">
            {next.kind === "upcoming" ? "Start early" : "Start workout"} <ArrowRight aria-hidden className="size-5" />
          </SubmitButton>
        </form>
      )}
      {firstExercise && (
        <p className="text-center text-caption text-text-secondary">
          Starts with {firstExercise.name.toLowerCase()} · {DIFFICULTY_LABELS[firstExercise.difficulty]}
        </p>
      )}
    </Card>
  );
}

function MilestoneCard({ view }: { view: PathwayView }) {
  const current = view.current;
  return (
    <Card aria-labelledby="milestone-title" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 eyebrow text-text-secondary">
            <Workflow aria-hidden className="size-4 text-accent-primary" /> Your pathway
          </p>
          <h2 id="milestone-title" className="font-display text-section font-semibold text-white">
            {current ? current.name : view.def.title}
          </h2>
        </div>
        {view.currentStage > 0 && (
          <Pill tone="success" className="shrink-0">
            Step {view.currentStage} of {view.stages.length}
          </Pill>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-body font-semibold text-text-primary">Ready to move up</p>
          <p className="font-display text-card font-bold text-accent-primary">
            {view.readiness.streak} of {view.readiness.needed}
          </p>
        </div>
        <ProgressBar value={view.readiness.streak} max={view.readiness.needed} label="Qualifying workouts towards the next step" />
        <p className="text-caption text-text-secondary">
          Workouts in a row at the top of the range on every set, with good control.
        </p>
      </div>

      <ol className="flex items-start justify-between gap-1">
        {view.stages.map((stage) => (
          <li key={stage.index} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <span
              aria-hidden
              className={cn(
                "flex size-8 items-center justify-center rounded-full font-display text-body font-bold",
                stage.status === "done" && "bg-success-container text-state-success",
                stage.status === "current" && "bg-accent-primary text-text-on-accent shadow-[0_0_16px_-2px_rgba(204,241,60,0.6)]",
                (stage.status === "next" || stage.status === "upcoming") && "bg-border-default text-text-secondary",
              )}
            >
              {stage.status === "done" ? <Check className="size-4" /> : stage.status === "current" ? stage.index : stage.index === view.stages.length ? <Flag className="size-3.5" /> : <Lock className="size-3.5" />}
            </span>
            <span
              className={cn(
                "line-clamp-2 text-[0.6875rem] font-semibold leading-tight",
                stage.status === "current" ? "text-accent-primary" : stage.status === "done" ? "text-text-primary" : "text-text-secondary",
              )}
            >
              {stage.index}. {shortStageName(stage.exercise.name)}
            </span>
            <span className={cn("text-[0.625rem] font-bold uppercase", stage.status === "done" ? "text-accent-strong" : "text-text-secondary")}>
              {stage.status === "done" ? "Done" : stage.status === "current" ? "Current" : stage.status === "next" ? "Next" : stage.index === view.stages.length ? "Goal" : "Later"}
            </span>
            <span className="sr-only">{stage.exercise.name}</span>
          </li>
        ))}
      </ol>

      <Link href={`/skills/${view.def.id}`} className="flex min-h-11 items-center justify-between rounded-small text-body font-semibold text-white hover:text-accent-primary">
        View complete progression <ChevronRight aria-hidden className="size-5" />
      </Link>
    </Card>
  );
}

function RecentWin({ snapshot }: { snapshot: TrainingSnapshot }) {
  const achievement = snapshot.achievements[0];
  const milestone = [...snapshot.milestones].sort((a, b) => b.achieved_at.localeCompare(a.achieved_at))[0];
  let title: string;
  let body: string;
  let earned = true;
  if (milestone && (!achievement || milestone.achieved_at >= achievement.earned_at)) {
    const def = MILESTONES_BY_ID.get(milestone.milestone_id);
    title = `Milestone: ${def?.title ?? "Reached"}`;
    body = def?.description ?? "";
  } else if (achievement) {
    const def = ACHIEVEMENTS.find((a) => a.id === achievement.achievement_id);
    title = def?.title ?? "Achievement";
    body = def?.description ?? "";
  } else {
    earned = false;
    title = "Your first win is one workout away";
    body = `${plural(snapshot.completedCount, "workout")} logged so far. Finish a session to record it.`;
  }
  return (
    <Card tone="secondary" className="flex items-center gap-4">
      <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-small", earned ? "bg-success-container text-state-success" : "bg-surface-interactive text-text-secondary")}>
        <Trophy className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-card font-semibold text-white">{title}</p>
        <p className="text-caption text-text-secondary">{body}</p>
      </div>
      {earned && <BadgeCheck aria-hidden className="size-5 shrink-0 text-accent-strong" />}
    </Card>
  );
}
