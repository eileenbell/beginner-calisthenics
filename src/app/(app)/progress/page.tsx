import { ArrowRight, BadgeCheck, Check, Clock, Flag, Leaf, Minus, Moon, Pause, Play, TrendingUp, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SubmitButton } from "@/components/ui/submit-button";
import { ACHIEVEMENTS, getExercise, getFamily, localDate, MILESTONES_BY_ID } from "@/domain";
import { resumeFamily } from "@/features/training/actions";
import { dayMonth, plural, weekdayLetter, weekdayLong } from "@/features/training/format";
import { allPathways, featuredPathway } from "@/features/training/pathways";
import { cadence, improvements, parseRange, RANGES, totals, type CadenceDay } from "@/features/training/progress";
import { missedThisWeek, weekCounts } from "@/features/training/week";
import { cn } from "@/lib/cn";
import { loadProgress } from "@/server/progress";
import { getTrainingSnapshot } from "@/server/training";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const range = parseRange((await searchParams).range);
  const snapshot = await getTrainingSnapshot();
  const { account, schedule, today, week } = snapshot;
  const tz = account.preferences.time_zone;
  const data = await loadProgress(snapshot, range);
  const sum = totals(data.sets, data.workouts);
  const gains = improvements(data.sets);
  const thisWeek = weekCounts(schedule, week);
  const missed = missedThisWeek(schedule, week, today);
  const weeks = cadence(schedule, account.programme.started_on, snapshot.rawWeek, account.programme.weeks, today);
  const cadenceDone = weeks.reduce((t, w) => t + w.completed, 0);
  const cadencePlanned = weeks.reduce((t, w) => t + w.planned, 0);
  const paused = [...snapshot.states.values()].filter((s) => s.paused);
  const featured = featuredPathway(
    allPathways({
      states: snapshot.states,
      achieved: snapshot.achievedMilestones,
      painEvents: snapshot.painEvents,
      equipment: account.preferences.equipment,
      goals: account.preferences.goals,
      now: snapshot.now,
    }),
    account.preferences.goals,
  );
  const focus = featured.current;
  const focusSets = focus ? data.sets.filter((s) => s.exerciseId === focus.id) : [];
  const focusSessions = new Set(focusSets.map((s) => s.sessionId)).size;
  const focusTotal = focusSets.reduce((t, s) => t + (focus?.measure === "seconds" ? (s.seconds ?? 0) : (s.reps ?? 0)), 0);
  const progressions = data.events.filter((e) => e.kind === "progress");
  const rangeLabel = RANGES.find((r) => r.id === range)!.label.toLowerCase();

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="eyebrow text-text-secondary">Training history</p>
            <h1 className="font-display text-title font-bold text-white">Progress &amp; mastery</h1>
          </div>
          {missed.length === 0 ? (
            <Pill tone="success">
              <BadgeCheck aria-hidden className="size-3.5" /> On track
            </Pill>
          ) : (
            <Pill tone="outline">
              <Clock aria-hidden className="size-3.5" /> {missed.length} to catch up
            </Pill>
          )}
        </div>
        <nav aria-label="Time range" className="grid grid-cols-3 gap-1 rounded-full bg-surface-secondary p-1">
          {RANGES.map((r) => (
            <Link
              key={r.id}
              href={r.id === "30" ? "/progress" : `/progress?range=${r.id}`}
              aria-current={range === r.id ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-full text-body font-semibold",
                range === r.id ? "bg-accent-primary text-text-on-accent" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <dl className="grid grid-cols-3 gap-2">
          <div className="rounded-small bg-surface-secondary p-3">
            <dt className="eyebrow text-text-secondary">Workouts</dt>
            <dd className="font-display text-title font-bold text-white tabular-nums">{sum.workouts}</dd>
            <dd className="text-caption text-text-secondary">finished</dd>
          </div>
          <div className="rounded-small bg-surface-secondary p-3">
            <dt className="eyebrow text-text-secondary">This week</dt>
            <dd className="font-display text-title font-bold text-accent-primary tabular-nums">
              {thisWeek.completed} of {thisWeek.planned}
            </dd>
            <dd className="text-caption text-text-secondary">planned done</dd>
          </div>
          <div className="rounded-small bg-surface-secondary p-3">
            <dt className="eyebrow text-text-secondary">Total reps</dt>
            <dd className="font-display text-title font-bold text-white tabular-nums">{sum.reps}</dd>
            <dd className="text-caption text-text-secondary">{sum.seconds > 0 ? `+ ${sum.seconds}s held` : "self-logged"}</dd>
          </div>
        </dl>
        <p className="text-caption text-text-secondary">
          {range === "all" ? "Totals cover all time" : `Totals cover the last ${rangeLabel}`} and only count sets you logged in finished workouts.
        </p>
      </Card>

      {paused.length > 0 && (
        <section aria-labelledby="paused" className="space-y-2">
          <h2 id="paused" className="flex items-center gap-2 font-display text-section font-semibold text-white">
            <Pause aria-hidden className="size-5 text-state-error" /> Paused movements
          </h2>
          {paused.map((s) => (
            <Card key={s.familyId} tone="secondary" className="space-y-2">
              <p className="font-semibold">{getFamily(s.familyId).name}</p>
              <p className="text-body text-text-secondary">
                Paused after you reported discomfort more than once. Only resume if it has settled. If it hasn&apos;t, check in with a GP or physiotherapist first.
              </p>
              <form action={resumeFamily}>
                <input type="hidden" name="familyId" value={s.familyId} />
                <SubmitButton variant="secondary" size="md" pendingLabel="Resuming…">
                  <Play aria-hidden className="size-4" /> Resume {getExercise(s.exerciseId).name.toLowerCase()}
                </SubmitButton>
              </form>
            </Card>
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2 desktop:items-start">
        {focus && (
          <Card aria-labelledby="practice" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow text-text-secondary">Practice summary</p>
              <Pill tone="success">Week {Math.min(week, account.programme.weeks)}</Pill>
            </div>
            <h2 id="practice" className="font-display text-section font-bold text-white">
              {focus.name}
            </h2>
            {focus.surfaces && <p className="text-caption text-text-secondary">{focus.surfaces}</p>}
            <dl className="grid grid-cols-2 gap-2">
              <div className="rounded-small bg-surface-secondary p-3">
                <dt className="eyebrow text-text-secondary">Workouts</dt>
                <dd className="font-display text-section font-bold">{focusSessions}</dd>
              </div>
              <div className="rounded-small bg-surface-secondary p-3">
                <dt className="eyebrow text-text-secondary">{focus.measure === "seconds" ? "Seconds held" : "Reps logged"}</dt>
                <dd className="font-display text-section font-bold">{focusTotal}</dd>
              </div>
            </dl>
            <div className="rounded-small bg-surface-interactive p-3">
              <p className="eyebrow text-accent-strong">Current focus</p>
              <p className="text-body text-text-secondary">{focus.goodControl}</p>
            </div>
          </Card>
        )}

        <Card aria-labelledby="journey" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow text-text-secondary">Visual pathway</p>
            {featured.currentStage > 0 && (
              <Pill tone="outline">
                Stage {featured.currentStage} of {featured.def.stages}
              </Pill>
            )}
          </div>
          <h2 id="journey" className="font-display text-section font-bold text-white">
            {featured.def.title}
          </h2>
          <ol className="space-y-2">
            {featured.stages.map((s) => (
              <li key={s.index} className={cn("flex items-start gap-3 rounded-small p-2", s.status === "current" && "bg-surface-interactive")}>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-caption font-bold",
                    s.status === "done" && "bg-success-container text-state-success",
                    s.status === "current" && "bg-accent-primary text-text-on-accent",
                    (s.status === "next" || s.status === "upcoming") && "bg-surface-secondary text-text-secondary",
                  )}
                >
                  {s.status === "done" ? <Check className="size-4" /> : s.index}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    Step {s.index}: {s.exercise.name}
                  </span>
                  <span className="block text-caption text-text-secondary">
                    {s.status === "done" ? "Behind you" : s.status === "current" ? "Current focus" : s.status === "next" ? "Next" : s.index === featured.def.stages ? "Target goal" : "Future"}
                  </span>
                  {s.status === "current" && (
                    <span className="mt-1 block space-y-1">
                      <ProgressBar value={featured.readiness.streak} max={featured.readiness.needed} label="Readiness for the next step" />
                      <span className="block text-caption text-text-secondary">
                        {featured.readiness.streak} of {featured.readiness.needed} qualifying workouts towards the next step
                      </span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <Link href={`/skills/${featured.def.id}`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline-offset-4 hover:underline">
            Open pathway <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Card>
      </div>

      <section aria-labelledby="cadence">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="eyebrow text-text-secondary">4-week cadence</p>
              <h2 id="cadence" className="font-display text-section font-bold text-white">
                Weekly consistency
              </h2>
            </div>
            <span className="text-caption font-semibold text-accent-strong">
              Week {Math.min(Math.max(snapshot.rawWeek, 1), account.programme.weeks)} of {account.programme.weeks}
            </span>
          </div>
          <div className="space-y-1.5">
            {weeks.map((w) => (
              <div key={w.week} className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] items-center gap-1.5">
                <span className="text-caption text-text-secondary">Wk {w.week}</span>
                {w.days.map((d) => (
                  <CadenceCell key={d.date} day={d} />
                ))}
              </div>
            ))}
            <div aria-hidden className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] gap-1.5">
              <span />
              {weeks[0]?.days.map((d) => (
                <span key={d.date} className="text-center eyebrow text-text-secondary">
                  {weekdayLetter(d.date)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-text-secondary">
            <span>
              {cadenceDone} completed of {cadencePlanned} planned
            </span>
            <span className="flex gap-3">
              <span className="flex items-center gap-1">
                <span aria-hidden className="size-2.5 rounded-[3px] bg-accent-primary" /> Workout done
              </span>
              <span className="flex items-center gap-1">
                <Moon aria-hidden className="size-3" /> Rest
              </span>
            </span>
          </div>
        </Card>
      </section>

      <section aria-labelledby="improvements" className="space-y-2">
        <h2 id="improvements" className="flex items-center gap-2 font-display text-section font-semibold text-white">
          <TrendingUp aria-hidden className="size-5 text-accent-strong" /> Set and rep improvements
        </h2>
        {gains.length === 0 ? (
          <p className="rounded-card bg-surface-secondary p-4 text-body text-text-secondary">
            Once you&apos;ve logged the same exercise in two workouts{range === "all" ? "" : ` within the ${rangeLabel}`}, your best set from the first one and your best since show up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {gains.slice(0, 8).map((g) => {
              const unit = g.measure === "seconds" ? "s" : " reps";
              const diff = g.best - g.first;
              return (
                <li key={g.exerciseId} className="flex items-center gap-3 rounded-card bg-surface-secondary p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{g.name}</span>
                    <span className="block text-caption text-text-secondary">
                      Best set: {g.first}
                      {unit} on {dayMonth(g.firstDate)} → {g.best}
                      {unit} since · {plural(g.sessions, "workout")}
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded-[6px] px-2 py-1 eyebrow", diff > 0 ? "bg-success-container text-success-muted" : "bg-surface-interactive text-text-secondary")}>
                    {diff > 0 ? `+${diff}${unit}` : diff === 0 ? "Steady" : `${diff}${unit}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2 desktop:items-start">
        <section aria-labelledby="variations" className="space-y-2">
          <h2 id="variations" className="font-display text-section font-semibold text-white">
            Variations achieved
          </h2>
          {progressions.length === 0 ? (
            <p className="rounded-card bg-surface-secondary p-4 text-body text-text-secondary">
              No moves to a harder variation yet. That happens after consistent, controlled workouts at the top of your range.
            </p>
          ) : (
            <ul className="space-y-2">
              {progressions.map((e) => (
                <li key={e.id} className="rounded-card bg-surface-secondary p-3">
                  <span className="block font-semibold">{getExercise(e.to_exercise_id).name}</span>
                  <span className="block text-caption text-text-secondary">
                    Up from {getExercise(e.from_exercise_id).name.toLowerCase()} · {dayMonth(localDate(new Date(e.created_at), tz))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="milestones" className="space-y-2">
          <h2 id="milestones" className="font-display text-section font-semibold text-white">
            Milestones and achievements
          </h2>
          {snapshot.milestones.length === 0 && snapshot.achievements.length === 0 ? (
            <p className="rounded-card bg-surface-secondary p-4 text-body text-text-secondary">Nothing yet. Your first one arrives when you finish your first workout.</p>
          ) : (
            <ul className="space-y-2">
              {[...snapshot.milestones]
                .sort((a, b) => b.achieved_at.localeCompare(a.achieved_at))
                .map((m) => {
                  const def = MILESTONES_BY_ID.get(m.milestone_id);
                  if (!def) return null;
                  return (
                    <li key={m.milestone_id} className="flex items-start gap-3 rounded-card bg-surface-secondary p-3">
                      <Flag aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-primary" />
                      <span>
                        <span className="block font-semibold">{def.title}</span>
                        <span className="block text-caption text-text-secondary">
                          Milestone · {dayMonth(localDate(new Date(m.achieved_at), tz))}
                        </span>
                      </span>
                    </li>
                  );
                })}
              {snapshot.achievements.map((a) => {
                const def = ACHIEVEMENTS.find((d) => d.id === a.achievement_id);
                if (!def) return null;
                return (
                  <li key={a.achievement_id} className="flex items-start gap-3 rounded-card bg-surface-secondary p-3">
                    <Trophy aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-strong" />
                    <span>
                      <span className="block font-semibold">{def.title}</span>
                      <span className="block text-caption text-text-secondary">
                        Achievement · {dayMonth(localDate(new Date(a.earned_at), tz))}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Card tone="secondary" className="flex gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-container text-state-success">
          <Leaf className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="eyebrow text-accent-strong">A reminder</p>
          <p className="text-body text-text-primary">Consistency matters more than intensity. Train at your own pace, rest between sessions and keep every rep controlled.</p>
        </div>
      </Card>
    </div>
  );
}

const CADENCE_TEXT: Record<CadenceDay["kind"], string> = {
  done: "workout done",
  missed: "planned workout not done",
  planned: "workout planned",
  rest: "rest day",
  skipped: "skipped",
  outside: "",
};

function CadenceCell({ day }: { day: CadenceDay }) {
  return (
    <span
      className={cn(
        "flex aspect-square items-center justify-center rounded-small text-caption font-bold",
        day.kind === "done" && "bg-accent-primary text-text-on-accent",
        day.kind === "missed" && "border border-dashed border-accent-strong text-accent-strong",
        day.kind === "planned" && "bg-surface-interactive text-text-primary",
        day.kind === "skipped" && "bg-surface-secondary text-text-secondary",
        day.kind === "rest" && "bg-surface-secondary text-state-disabled",
        day.isToday && "ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-elevated",
      )}
    >
      <span className="sr-only">
        {weekdayLong(day.date)} {dayMonth(day.date)}: {CADENCE_TEXT[day.kind]}
        {day.isToday ? " (today)" : ""}
      </span>
      <span aria-hidden>{day.kind === "rest" ? <Moon className="size-3" /> : day.kind === "skipped" ? <Minus className="size-3" /> : day.date.slice(8).replace(/^0/, "")}</span>
    </span>
  );
}
