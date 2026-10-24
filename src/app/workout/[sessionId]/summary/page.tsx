import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackendMissing } from "@/components/backend-missing";
import { FlowShell } from "@/components/shell/flow-shell";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dayMonth, relativeDay, TEMPLATE_FOCUS, weekdayLong } from "@/features/training/format";
import { EarnedList, NextTimeList, ReportStats, SetBreakdown } from "@/features/workout/session-report";
import { isBackendConfigured } from "@/lib/env";
import { loadSessionReport } from "@/server/history";
import { getTrainingSnapshot, nextSession } from "@/server/training";

export const metadata: Metadata = { title: "Workout complete" };

function whenText(date: string, today: string): string {
  if (date === today) return "later today";
  if (date < today) return `from ${weekdayLong(date)}`;
  const rel = relativeDay(date, today);
  return rel === "Tomorrow" ? `tomorrow, ${weekdayLong(date)}` : `${weekdayLong(date)} ${dayMonth(date)}`;
}

export default async function SummaryPage({ params }: PageProps<"/workout/[sessionId]/summary">) {
  if (!isBackendConfigured()) return <BackendMissing />;
  const { sessionId } = await params;
  const report = await loadSessionReport(sessionId);
  if (!report) notFound();
  const snapshot = await getTrainingSnapshot();
  const next = nextSession(snapshot);
  const main = report.items.filter((i) => i.block === "main");
  const harder = main.filter((i) => i.decision?.kind === "progress").length;
  const higher = main.filter((i) => i.decision?.kind === "increase_target").length;
  const headline = [
    harder > 0 ? `${harder === 1 ? "One exercise moves" : `${harder} exercises move`} to a harder variation.` : null,
    higher > 0 ? `${higher === 1 ? "One exercise gets" : `${higher} exercises get`} a higher target next time.` : null,
  ].filter(Boolean);

  return (
    <FlowShell section="Workout complete">
      <div className="space-y-6">
        <div className="space-y-3 text-center">
          <span aria-hidden className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-primary text-on-accent-muted shadow-[0_0_32px_-4px_rgba(204,241,60,0.5)]">
            <CircleCheck className="size-8" />
          </span>
          <div className="space-y-1">
            <p className="eyebrow text-accent-primary">Workout complete</p>
            <h1 className="font-display text-title font-bold text-white">{report.session.title}</h1>
            <p className="text-body text-text-secondary">
              {relativeDay(report.date, snapshot.today)} · {TEMPLATE_FOCUS[report.session.template].label}
            </p>
          </div>
        </div>

        <ReportStats report={report} />

        {headline.length > 0 && (
          <Card tone="elevated" className="text-center">
            <p className="text-body-lg text-text-primary">
              {headline.join(" ")} That comes from the reps you logged with good control.
            </p>
          </Card>
        )}

        <EarnedList report={report} />
        <NextTimeList report={report} />
        <SetBreakdown report={report} />

        <Card tone="secondary" className="space-y-1">
          <p className="eyebrow text-text-secondary">Next session</p>
          {next.slot && next.kind !== "resume" ? (
            <p className="text-body-lg text-text-primary">
              {TEMPLATE_FOCUS[next.slot.template].label},{" "}
              {whenText(next.slot.scheduled_on, snapshot.today)}
              {next.kind === "catch_up" ? ". It was planned earlier this week, so do it when you can." : "."}
            </p>
          ) : (
            <p className="text-body-lg text-text-primary">That was the last planned session in this programme. You can start a new block from your profile.</p>
          )}
        </Card>

        <div className="grid gap-2 tablet:grid-cols-2">
          <LinkButton href="/today">Back to today</LinkButton>
          <LinkButton href="/progress" variant="secondary">
            See your progress
          </LinkButton>
        </div>
      </div>
    </FlowShell>
  );
}
