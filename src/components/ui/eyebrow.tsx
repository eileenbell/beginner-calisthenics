import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Eyebrow({ className, accent, ...props }: ComponentProps<"p"> & { accent?: boolean }) {
  return <p className={cn("eyebrow", accent ? "text-accent-primary" : "text-text-secondary", className)} {...props} />;
}
