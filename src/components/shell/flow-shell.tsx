import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FlowShellProps {
  section: string;
  backHref?: string;
  backLabel?: string;
  right?: ReactNode;
  children: ReactNode;
  width?: "narrow" | "wide";
}

/** Header and column for the welcome, sign-in and onboarding screens (Stitch screens 7–13). */
export function FlowShell({ section, backHref, backLabel = "Back", right, children, width = "narrow" }: FlowShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-background-primary/85 pt-[var(--safe-top)] shadow-[0_1px_8px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className={cn("mx-auto flex h-14 items-center justify-between gap-2 px-4", width === "narrow" ? "max-w-xl" : "max-w-6xl")}>
          <div className="flex min-w-11 items-center">
            {backHref ? (
              <Link
                href={backHref}
                aria-label={backLabel}
                className="-ml-2 flex size-11 items-center justify-center rounded-full text-text-primary hover:text-accent-primary"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </Link>
            ) : null}
          </div>
          <p className="flex min-w-0 items-baseline gap-1.5 font-display">
            <Link href="/" className="text-card font-bold uppercase tracking-tighter text-text-primary">
              FORM
            </Link>
            <span aria-hidden className="text-card text-text-secondary/40">
              /
            </span>
            <span className="truncate text-caption font-semibold uppercase tracking-wide text-text-primary">{section}</span>
          </p>
          <div className="flex min-w-11 items-center justify-end">{right}</div>
        </div>
      </header>
      <main id="main" className={cn("mx-auto w-full flex-1 px-4 pb-[calc(2.5rem+var(--safe-bottom))] pt-4", width === "narrow" ? "max-w-xl" : "max-w-6xl")}>
        {children}
      </main>
    </div>
  );
}
