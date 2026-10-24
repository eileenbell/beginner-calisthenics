import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "warning" | "error" | "success";

const tones: Record<Tone, string> = {
  info: "bg-surface-interactive text-text-primary",
  warning: "bg-surface-interactive text-text-primary border-l-4 border-accent-strong",
  error: "bg-error-tint text-text-primary border-l-4 border-state-error",
  success: "bg-success-container/60 text-text-primary",
};

export function Notice({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children: ReactNode; className?: string }) {
  const Icon = tone === "error" ? CircleAlert : tone === "warning" ? TriangleAlert : Info;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-card p-4 text-body", tones[tone], className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", tone === "error" ? "text-state-error" : "text-accent-strong")} />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-text-secondary">{children}</div>
      </div>
    </div>
  );
}
