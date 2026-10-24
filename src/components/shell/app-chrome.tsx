"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { activeNav, NAV_ITEMS } from "./nav-items";

interface ChromeProps {
  weekLabel: string;
  initial: string;
}

/** Fixed top bar (Figma "Common header"): wordmark, programme week, page title, profile link. */
export function AppHeader({ weekLabel, initial }: ChromeProps) {
  const pathname = usePathname();
  const title = activeNav(pathname)?.title ?? "FORM";
  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-background-primary pt-[var(--safe-top)] shadow-[0_4px_16px_rgba(0,0,0,0.35)] desktop:left-60">
      <div className="mx-auto grid h-16 max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <div className="flex items-center gap-2">
          <Link href="/today" className="font-display text-[1.375rem] font-bold tracking-[-0.025em] text-white desktop:hidden">
            FORM
          </Link>
          <span className="rounded-full bg-success-container px-2 py-0.5 eyebrow text-on-success-container">{weekLabel}</span>
        </div>
        <p className="text-center font-display text-card font-bold text-text-primary">{title}</p>
        <div className="flex justify-end">
          <Link
            href="/profile"
            aria-label="Your profile"
            className="flex size-11 items-center justify-center rounded-full"
          >
            <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-white font-display text-body font-bold text-background-primary">
              {initial}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Mobile and tablet bottom navigation (Figma "Bottom nav"). */
export function BottomNav() {
  const pathname = usePathname();
  const active = activeNav(pathname);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default/60 bg-background-primary pb-[var(--safe-bottom)] desktop:hidden">
      <ul className="mx-auto flex h-20 max-w-xl items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const on = item === active;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-14 w-16 flex-col items-center justify-center gap-1 rounded-small text-[0.6875rem] font-bold uppercase tracking-[0.02em]",
                  on ? "text-accent-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={on ? 2.25 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop side rail. Same destinations as the bottom nav. */
export function SideRail() {
  const pathname = usePathname();
  const active = activeNav(pathname);
  return (
    <nav aria-label="Main" className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-border-default/60 bg-background-primary px-4 py-6 desktop:flex">
      <Link href="/today" className="px-3 pb-8 font-display text-[1.75rem] font-bold tracking-[-0.025em] text-white">
        FORM
      </Link>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const on = item === active;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-card px-3 text-body font-semibold",
                  on ? "bg-surface-elevated text-accent-primary" : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
