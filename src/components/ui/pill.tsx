import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "accent" | "neutral" | "interactive" | "outline" | "error";

const tones: Record<Tone, string> = {
  success: "bg-success-container text-state-success",
  accent: "bg-accent-primary text-text-on-accent",
  neutral: "bg-surface-elevated text-text-secondary",
  interactive: "bg-surface-interactive text-text-secondary",
  outline: "border border-border-default text-text-secondary",
  error: "bg-error-tint text-state-error",
};

interface PillProps extends ComponentProps<"span"> {
  tone?: Tone;
  dot?: boolean;
}

export function Pill({ tone = "success", dot, className, children, ...props }: PillProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 eyebrow", tones[tone], className)}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent-primary" />}
      {children}
    </span>
  );
}

export function Chip({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("inline-flex items-center rounded-small bg-surface-interactive px-2 py-1 text-caption font-semibold text-text-secondary", className)}
      {...props}
    />
  );
}
