import { ArrowDown, ArrowUp, Equal, Flag, Pause, ShieldAlert, Trophy } from "lucide-react";
import type { DecisionKind } from "@/domain";
import { Card } from "@/components/ui/card";
import { plural } from "@/features/training/format";
import { cn } from "@/lib/cn";
import type { ReportItem, SessionReport } from "@/server/history";

const FEELING_LABELS = {
  too_easy: "Too easy",
  about_right: "About right",
  too_difficult: "Too difficult",
  could_not_finish: "Couldn't finish",
  pain: "Pain reported",
} as const;

const SKIP_LABELS = {
  pain: "Skipped: pain or discomfort",
  too_hard: "Skipped: too hard today",
  no_equipment: "Skipped: equipment not available",
  short_on_time: "Not done",
  other: "Skipped",
} as const;

export const DECISION_LABELS: Record<DecisionKind, { label: string; tone: "up" | "same" | "down" | "stop" }> = {
  progress: { label: "Moving up", tone: "up" },
  increase_target: { label: "Target up", tone: "up" },
  hold: { label: "Same again", tone: "same" },
  no_change: { label: "No change", tone: "same" },
  decrease_target: { label: "Target down", tone: "down" },
  regress: { label: "Easier option", tone: "down" },
  pain_swap: { label: "Easier option", tone: "stop" },
  pain_pause: { label: "Paused", tone: "stop" },
};

const TONE_STYLES = {
  up: { icon: ArrowUp, className: "bg-success-container text-success-muted" },
  same: { icon: Equal, className: "bg-surface-interactive text-text-secondary" },
  down: { icon: ArrowDown, className: "bg-surface-interactive text-accent-strong" },
  stop: { icon: Pause, className: "bg-error-tint text-state-error" },
};

function valuesText(item: ReportItem): string {
  if (item.values.length === 0) return item.skipped ? SKIP_LABELS[item.skipped] : "No sets logged";
  const unit = item.measure === "seconds" ? "s" : item.values.length === 1 && item.values[0] === 1 ? " rep" : " reps";
  return `${item.values.join(" · ")}${unit}${item.perSide ? " each side" : ""}`;
}

export function ReportStats({ report }: { report: SessionReport }) {
  const stats = [
    { label: "Duration", value: report.minutes !== null ? `${report.minutes} min` : "—" },
    { label: "Sets", value: String(report.totals.sets) },
    { label: report.totals.reps > 0 || report.totals.seconds === 0 ? "Reps" : "Held", value: report.totals.reps > 0 || report.totals.seconds === 0 ? String(report.totals.reps) : `${report.totals.seconds}s` },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-small bg-surface-secondary p-3 text-center">
          <dt className="eyebrow text-text-secondary">{s.label}</dt>
          <dd className="font-display text-section font-bold text-white tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What the engine decided for each main exercise, with its reason. */
export function NextTimeList({ report, title = "What changes next time" }: { report: SessionReport; title?: string }) {
  const main = report.items.filter((i) => i.block === "main");
  return (
    <section aria-labelledby="next-time" className="space-y-3">
      <div className="space-y-1">
        <h2 id="next-time" className="font-display text-section font-semibold text-white">
          {title}
        </h2>
        <p className="text-body text-text-secondary">Based on the reps you logged and how each exercise felt.</p>
      </div>
      <ol className="space-y-2">
        {main.map((item) => {
          const kind = item.decision ? DECISION_LABELS[item.decision.kind] : null;
          const tone = kind ? TONE_STYLES[kind.tone] : null;
          const Icon = tone?.icon ?? Equal;
          return (
            <li key={item.itemIndex}>
              <Card tone="secondary" as="article" className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary">{item.name}</h3>
                    <p className="text-caption text-text-secondary">
                      {valuesText(item)}
                      {item.feedback ? ` · ${FEELING_LABELS[item.feedback]}` : ""}
                    </p>
                    {item.plannedName && <p className="text-caption text-text-secondary">Swapped from {item.plannedName.toLowerCase()}</p>}
                  </div>
                  {kind && tone && (
                    <span className={cn("flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1 eyebrow", tone.className)}>
                      <Icon aria-hidden className="size-3.5" /> {kind.label}
                    </span>
                  )}
                </div>
                {item.decision && <p className="text-body text-text-secondary">{item.decision.reason}</p>}
                {item.decision?.kind === "pain_pause" || item.decision?.kind === "pain_swap" ? (
                  <p className="flex gap-2 text-caption text-text-primary">
                    <ShieldAlert aria-hidden className="size-4 shrink-0 text-state-error" />
                    If pain keeps coming back, check in with a GP or physiotherapist before training that movement again.
                  </p>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function EarnedList({ report }: { report: SessionReport }) {
  if (report.milestones.length === 0 && report.achievements.length === 0) return null;
  return (
    <section aria-labelledby="earned" className="space-y-2">
      <h2 id="earned" className="font-display text-section font-semibold text-white">
        Earned this session
      </h2>
      <ul className="space-y-2">
        {report.milestones.map((m) => (
          <li key={m.id}>
            <Card tone="elevated" as="div" className="flex items-start gap-3 ring-1 ring-accent-primary/40">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-primary text-on-accent-muted">
                <Flag className="size-5" />
              </span>
              <span>
                <span className="eyebrow block text-accent-primary">Milestone</span>
                <span className="block font-semibold">{m.title}</span>
                <span className="block text-caption text-text-secondary">{m.description}</span>
              </span>
            </Card>
          </li>
        ))}
        {report.achievements.map((a) => (
          <li key={a.id}>
            <Card tone="elevated" as="div" className="flex items-start gap-3">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-interactive text-accent-strong">
                <Trophy className="size-5" />
              </span>
              <span>
                <span className="eyebrow block text-accent-strong">Achievement</span>
                <span className="block font-semibold">{a.title}</span>
                <span className="block text-caption text-text-secondary">{a.description}</span>
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Every exercise in the session, including warm-up and cool-down. */
export function SetBreakdown({ report }: { report: SessionReport }) {
  const blocks = [
    { id: "warmup", title: "Warm-up" },
    { id: "main", title: "Main exercises" },
    { id: "cooldown", title: "Cool-down" },
  ] as const;
  return (
    <section aria-labelledby="breakdown" className="space-y-3">
      <h2 id="breakdown" className="font-display text-section font-semibold text-white">
        Everything you logged
      </h2>
      {blocks.map((b) => {
        const items = report.items.filter((i) => i.block === b.id);
        if (items.length === 0) return null;
        return (
          <div key={b.id} className="space-y-1">
            <h3 className="eyebrow text-text-secondary">{b.title}</h3>
            <ul className="divide-y divide-border-default rounded-card bg-surface-secondary">
              {items.map((item) => (
                <li key={item.itemIndex} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 truncate text-body text-text-primary">{item.name}</span>
                  <span className="shrink-0 text-caption text-text-secondary tabular-nums">
                    {item.values.length > 0 ? `${plural(item.values.length, "set")} · ${valuesText(item)}` : valuesText(item)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
