import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  className?: string;
  size?: "sm" | "md";
  tone?: "accent" | "success";
}

export function ProgressBar({ value, max, label, className, size = "md", tone = "accent" }: ProgressBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("w-full overflow-hidden rounded-full bg-surface-interactive", size === "md" ? "h-2" : "h-1.5", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", tone === "accent" ? "bg-accent-primary" : "bg-state-success")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
