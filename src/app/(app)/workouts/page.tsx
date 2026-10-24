import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Clock, History, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { EXERCISES } from "@/domain";
import { dayMonth, plural, relativeDay, TEMPLATE_TITLES, weekdayShort } from "@/features/training/format";
import { weekCounts } from "@/features/training/week";
import { cn } from "@/lib/cn";
import { listHistory } from "@/server/history";
import type { ScheduledWorkoutRow } from "@/server/rows";
import { getTrainingSnapshot } from "@/server/training";

export const metadata: Metadata = { title: "Workouts" };

type RowStatus = "done" | "today" | "missed" | "planned" | "skipped";

function rowStatus(slot: ScheduledWorkoutRow, today: string): RowStatus {
  if (slot.status === "completed") return "done";
  if (slot.status === "skipped") return "skipped";
  if (slot.scheduled_on === today) return "today";
  return slot.scheduled_on < today ? "missed" : "planned";
}

const STATUS_TEXT: Record<RowStatus, string> = {
  done: "Done",
  today: "Today",
  missed: "Not done yet",
  planned: "Planned",
  skipped: "Skipped",
};

export default async function WorkoutsPage() {
  const snapshot = await getTrainingSnapshot();
  const { account, schedule, today, week } = snapshot;
  const history = await listHistory(50);
  const sessionBySlot = new Map(history.filter((h) => h.scheduledWorkoutId).map((h) => [h.scheduledWorkoutId!, h.id]));
  const weeks = Array.from({ length: account.programme.weeks }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-title font-bold text-white">Workouts</h1>
        <p className="text-body text-text-secondary">
          {account.programme.weeks}-week programme · {plural(account.programme.days_per_week, "session")} a week · about {account.programme.session_minutes} minutes each
        </p>
      </div>

      <Link href="/exercises" className="flex min-h-16 items-center gap-3 rounded-card bg-surface-elevated p-4 hover:bg-surface-interactive">
        <BookOpen aria-hidden className="size-6 shrink-0 text-accent-primary" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-text-primary">Exercise library</span>
          <span className="block text-caption text-text-secondary">{EXERCISES.length} movements with setup, cues and easier options</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-text-secondary" />
      </Link>

      <section aria-labelledby="programme" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="programme" className="font-display text-section font-semibold text-white">
            Your programme
          </h2>
          <Link href="/profile/training" className="text-body font-semibold text-accent-strong underline-offset-4 hover:underline">
            Change days
          </Link>
        </div>
        <div className="space-y-2">
          {weeks.map((w) => {
            const rows = schedule.filter((s) => s.week === w).sort((a, b) => a.slot - b.slot);
            const counts = weekCounts(schedule, w);
            const isCurrent = w === week && !snapshot.programmeOver;
            return (
              <details key={w} open={isCurrent} className="group rounded-card bg-surface-secondary">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold text-text-primary">
                      Week {w}
                      {isCurrent && (
                        <Pill tone="success" className="px-2 py-0.5">
                          This week
                        </Pill>
                      )}
                    </span>
                    <span className="block text-caption text-text-secondary">
                      {rows[0] ? `${dayMonth(rows[0].scheduled_on)} – ${dayMonth(rows[rows.length - 1].scheduled_on)} · ` : ""}
                      {counts.completed} of {counts.planned} done
                    </span>
                  </span>
                  <ChevronDown aria-hidden className="size-5 text-text-secondary transition-transform group-open:rotate-180" />
                </summary>
                <ul className="space-y-1 px-2 pb-2">
                  {rows.map((slot) => {
                    const status = rowStatus(slot, today);
                    const sessionId = sessionBySlot.get(slot.id);
                    const body = (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full",
                            status === "done" && "bg-success-container text-state-success",
                            status === "today" && "bg-accent-primary text-text-on-accent",
                            status === "missed" && "border border-accent-strong text-accent-strong",
                            (status === "planned" || status === "skipped") && "bg-surface-interactive text-text-secondary",
                          )}
                        >
                          {status === "done" ? <Check className="size-4" /> : status === "skipped" ? <Minus className="size-4" /> : <span className="text-caption font-bold">{weekdayShort(slot.scheduled_on).charAt(0)}</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-text-primary">{TEMPLATE_TITLES[slot.template]}</span>
                          <span className="block text-caption text-text-secondary">
                            {relativeDay(slot.scheduled_on, today)} · {STATUS_TEXT[status]}
                          </span>
                        </span>
                        {sessionId && <ChevronRight aria-hidden className="size-4 text-text-secondary" />}
                      </>
                    );
                    return (
                      <li key={slot.id}>
                        {sessionId ? (
                          <Link href={`/history/${sessionId}`} className="flex min-h-14 items-center gap-3 rounded-small px-2 py-1 hover:bg-surface-interactive">
                            {body}
                          </Link>
                        ) : status === "today" || status === "missed" ? (
                          <Link href="/today" className="flex min-h-14 items-center gap-3 rounded-small px-2 py-1 hover:bg-surface-interactive">
                            {body}
                          </Link>
                        ) : (
                          <div className="flex min-h-14 items-center gap-3 px-2 py-1">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="flex items-center gap-2 font-display text-section font-semibold text-white">
          <History aria-hidden className="size-5 text-accent-strong" /> History
        </h2>
        {history.length === 0 ? (
          <Card tone="secondary" className="space-y-2 text-center">
            <p className="font-semibold">No finished workouts yet</p>
            <p className="text-body text-text-secondary">Each workout you finish shows up here with every set you logged.</p>
            <Link href="/today" className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline-offset-4 hover:underline">
              Go to today&apos;s session <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Card>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id}>
                <Link href={`/history/${h.id}`} className="flex min-h-16 items-center gap-3 rounded-card bg-surface-secondary p-3 hover:bg-surface-interactive">
                  <span className="flex w-12 shrink-0 flex-col items-center">
                    <span className="eyebrow text-text-secondary">{weekdayShort(h.date)}</span>
                    <span className="font-display text-card font-bold">{dayMonth(h.date).split(" ")[0]}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-text-primary">{h.title}</span>
                    <span className="flex flex-wrap gap-x-2 text-caption text-text-secondary">
                      <span>{dayMonth(h.date)}</span>
                      {h.week && <span>Week {h.week}</span>}
                      <span>{plural(h.sets, "set")}</span>
                      {h.reps > 0 && <span>{plural(h.reps, "rep")}</span>}
                      {h.minutes !== null && (
                        <span className="flex items-center gap-1">
                          <Clock aria-hidden className="size-3" /> {h.minutes} min
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 text-text-secondary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
