import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "elevated" | "secondary" | "interactive" | "plain";

const tones: Record<Tone, string> = {
  elevated: "bg-surface-elevated",
  secondary: "bg-surface-secondary",
  interactive: "bg-surface-interactive",
  plain: "bg-transparent",
};

interface CardProps extends HTMLAttributes<HTMLElement> {
  tone?: Tone;
  as?: "section" | "div" | "article" | "li";
}

export function Card({ tone = "elevated", as: Tag = "section", className, ...props }: CardProps) {
  return <Tag className={cn("rounded-card p-4", tones[tone], className)} {...props} />;
}
