import { cn } from "@/lib/cn";

export const ONBOARDING_TOTAL_STEPS = 6;

export function StepIndicator({ step, label }: { step: number; label?: string }) {
  const total = ONBOARDING_TOTAL_STEPS;
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex min-w-0 items-center gap-1.5 whitespace-nowrap eyebrow text-accent-primary">
        <span aria-hidden className="size-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(204,241,60,0.6)]" />
        Step {String(step).padStart(2, "0")} of {String(total).padStart(2, "0")}
        {label && <span className="truncate text-text-secondary">· {label}</span>}
      </p>
      <div className="flex shrink-0 gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn("h-1 rounded-full", i < step ? "w-4 bg-accent-primary tablet:w-6" : "w-2.5 bg-surface-interactive tablet:w-4")}
          />
        ))}
      </div>
    </div>
  );
}
