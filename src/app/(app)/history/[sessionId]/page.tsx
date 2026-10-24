import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fullDate, TEMPLATE_FOCUS } from "@/features/training/format";
import { EarnedList, NextTimeList, ReportStats, SetBreakdown } from "@/features/workout/session-report";
import { loadSessionReport } from "@/server/history";

export const metadata: Metadata = { title: "Past workout" };

export default async function HistoryDetailPage({ params }: PageProps<"/history/[sessionId]">) {
  const { sessionId } = await params;
  const report = await loadSessionReport(sessionId);
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <Link href="/workouts" aria-label="Back to workouts" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:text-accent-primary">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0 space-y-1 pt-1">
          <p className="eyebrow text-text-secondary">{fullDate(report.date)}</p>
          <h1 className="font-display text-title font-bold text-white">{report.session.title}</h1>
          <p className="text-body text-text-secondary">{TEMPLATE_FOCUS[report.session.template].label}</p>
        </div>
      </div>
      <ReportStats report={report} />
      <EarnedList report={report} />
      <NextTimeList report={report} title="What changed after this workout" />
      <SetBreakdown report={report} />
    </div>
  );
}
