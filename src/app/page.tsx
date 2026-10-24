import { ArrowRight, Footprints, Route, ShieldCheck, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlowShell } from "@/components/shell/flow-shell";
import { LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Pill } from "@/components/ui/pill";
import { isBackendConfigured } from "@/lib/env";
import { getAccount, homePathFor } from "@/server/auth";

export const metadata: Metadata = {
  title: { absolute: "FORM · Beginner calisthenics" },
  description: "A 12-week beginner calisthenics programme that starts where you are and moves on only when you're ready.",
};

const POINTS = [
  {
    icon: Sprout,
    title: "Start where you are",
    body: "Begin with wall and counter-height push-ups and supported squats. Each exercise moves up only when your reps are controlled.",
  },
  {
    icon: Route,
    title: "Clear milestones",
    body: "Step-by-step pathways towards your first floor push-up and, if you have a bar, your first pull-up.",
  },
  {
    icon: Footprints,
    title: "Train with what you have",
    body: "Your plan is built around your equipment, including none at all. Home, gym or park all work.",
  },
];

export default async function WelcomePage({ searchParams }: PageProps<"/">) {
  const { notice } = await searchParams;
  if (isBackendConfigured()) {
    const account = await getAccount();
    if (account) redirect(homePathFor(account));
  }

  return (
    <FlowShell
      section="Welcome"
      width="wide"
      right={
        <Link href="/sign-in" className="flex min-h-11 items-center px-2 text-body font-semibold text-accent-primary">
          Sign in
        </Link>
      }
    >
      {notice === "account-deleted" && (
        <Notice tone="success" className="mb-4">
          Your account and all of its data have been deleted.
        </Notice>
      )}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2 desktop:items-center desktop:gap-14 tablet:pt-6">
        <div className="space-y-6 desktop:order-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 eyebrow text-text-secondary">
              <span aria-hidden className="size-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(204,241,60,0.6)]" />
              Foundations programme
            </p>
            <Pill tone="neutral" className="text-accent-primary">
              12 weeks · 2–4 days a week
            </Pill>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-surface-secondary shadow-xl">
            <Image
              src="/images/design/welcome-hero.jpg"
              alt="A person in a dark gym holding a push-up position on low wooden parallettes."
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 640px"
              className="object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background-primary via-background-primary/30 to-transparent" />
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-small bg-border-default/80 px-2.5 py-1.5 eyebrow text-text-primary backdrop-blur-md">Beginner friendly</span>
              <span className="rounded-small bg-border-default/80 px-2.5 py-1.5 eyebrow text-accent-primary backdrop-blur-md">No equipment needed to start</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 desktop:order-1">
          <div className="space-y-2">
            <p className="eyebrow text-accent-primary">FORM calisthenics</p>
            <h1 className="font-display text-[2.5rem] font-bold uppercase leading-[2.75rem] tracking-[-0.03em] desktop:text-[3.5rem] desktop:leading-[3.75rem]">
              Strength starts here.
            </h1>
            <p className="text-body-lg text-text-secondary">
              Your personal path from beginner movements to real bodyweight strength. Built on progression, not ego.
            </p>
          </div>
          <ul className="space-y-2">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-4 rounded-card bg-surface-secondary p-4">
                <span aria-hidden className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-small bg-border-default text-accent-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-card font-semibold uppercase tracking-tight">{title}</h2>
                  <p className="pt-0.5 text-body text-text-secondary">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-3">
            <LinkButton href="/sign-up" className="w-full">
              Get started <ArrowRight aria-hidden className="size-5" />
            </LinkButton>
            <Link
              href="/sign-in"
              className="flex min-h-14 w-full items-center justify-center rounded-card bg-surface-secondary px-4 text-center font-display text-body-lg font-semibold uppercase tracking-wide text-text-primary"
            >
              Already have an account?&nbsp;<span className="text-accent-primary underline underline-offset-4">Sign in</span>
            </Link>
          </div>
          <p className="flex items-start justify-center gap-2 text-center text-caption text-text-secondary">
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-accent-strong" />
            General fitness guidance for healthy adults, not medical advice. Check with a health professional if you have an injury or condition.
          </p>
        </div>
      </div>
    </FlowShell>
  );
}
