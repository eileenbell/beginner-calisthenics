import { ChevronRight, Download, LogOut, Settings2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { addDays, GOALS } from "@/domain";
import { signOut } from "@/features/auth/actions";
import { GOAL_OPTIONS } from "@/features/onboarding/answers";
import { EQUIPMENT_LABELS, fullDate, plural, weekdayLong } from "@/features/training/format";
import { DeleteAccountForm, NameForm, NewBlockForm, PasswordForm } from "@/features/profile/forms";
import { displayName } from "@/server/auth";
import { getTrainingSnapshot } from "@/server/training";

export const metadata: Metadata = { title: "Profile" };

const NOTICES: Record<string, string> = {
  "training-saved": "Training settings saved. Your upcoming sessions now follow the new schedule.",
};

const ISO_DAY_DATES = ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09", "2026-01-10", "2026-01-11"];

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { notice } = await searchParams;
  const snapshot = await getTrainingSnapshot();
  const { account, schedule } = snapshot;
  const { preferences: prefs, programme } = account;
  const name = account.profile?.display_name ?? "";
  const done = schedule.filter((s) => s.status === "completed").length;
  const ends = addDays(programme.started_on, programme.weeks * 7 - 1);
  const goals = GOALS.filter((g) => prefs.goals.includes(g)).map((g) => GOAL_OPTIONS.find((o) => o.id === g)?.title ?? g);
  const kit = prefs.equipment.filter((e) => e !== "none").map((e) => EQUIPMENT_LABELS[e]);
  const flash = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-primary font-display text-title font-bold text-text-on-accent">
          {displayName(account).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-title font-bold text-white">{name || displayName(account)}</h1>
          <p className="truncate text-body text-text-secondary">{account.user.email}</p>
        </div>
      </div>

      {flash && <Notice tone="success">{flash}</Notice>}

      <section id="training" aria-labelledby="training-title" className="scroll-mt-24">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="training-title" className="font-display text-section font-semibold text-white">
              Training settings
            </h2>
            <Settings2 aria-hidden className="size-5 text-text-secondary" />
          </div>
          <dl className="grid gap-3 text-body tablet:grid-cols-2">
            <div>
              <dt className="eyebrow text-text-secondary">Goals</dt>
              <dd>{goals.join(", ")}</dd>
            </div>
            <div>
              <dt className="eyebrow text-text-secondary">Schedule</dt>
              <dd>
                {plural(prefs.days_per_week, "session")} a week, about {prefs.session_minutes} minutes
              </dd>
              <dd className="text-caption text-text-secondary">{prefs.training_days.map((d) => weekdayLong(ISO_DAY_DATES[d - 1])).join(", ")}</dd>
            </div>
            <div>
              <dt className="eyebrow text-text-secondary">Equipment</dt>
              <dd>{kit.length ? `Floor, wall and counter, plus ${kit.join(", ").toLowerCase()}` : "Floor, wall and a sturdy counter or table"}</dd>
            </div>
            <div>
              <dt className="eyebrow text-text-secondary">Time zone</dt>
              <dd>{prefs.time_zone}</dd>
            </div>
          </dl>
          <Link href="/profile/training" className="flex min-h-12 items-center justify-between rounded-card bg-surface-interactive px-4 font-semibold hover:bg-surface-secondary">
            Change goals, schedule or equipment <ChevronRight aria-hidden className="size-5" />
          </Link>
        </Card>
      </section>

      <section id="programme" aria-labelledby="programme-title" className="scroll-mt-24">
        <Card className="space-y-3">
          <h2 id="programme-title" className="font-display text-section font-semibold text-white">
            Your programme
          </h2>
          <p className="text-body text-text-secondary">
            Started {fullDate(programme.started_on)}, runs to {fullDate(ends)}. {done} of {schedule.length} sessions done.
          </p>
          <Link href="/workouts" className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline-offset-4 hover:underline">
            Review the full schedule <ChevronRight aria-hidden className="size-4" />
          </Link>
          <div className="space-y-2 border-t border-border-default pt-3">
            <h3 className="font-semibold">{snapshot.programmeOver ? "Start your next block" : "Start over with a new block"}</h3>
            <p className="text-body text-text-secondary">
              {snapshot.programmeOver
                ? "Your 12 weeks are up. A new block keeps your current levels, so you carry on from where you are."
                : "Useful after a long break. You keep your current levels, so you won't start from scratch."}
            </p>
            <NewBlockForm />
          </div>
        </Card>
      </section>

      <section aria-labelledby="account-title">
        <Card className="space-y-5">
          <h2 id="account-title" className="font-display text-section font-semibold text-white">
            Account
          </h2>
          <NameForm name={name} />
          <div className="border-t border-border-default pt-5">
            <h3 className="pb-3 font-semibold">Password</h3>
            <PasswordForm />
          </div>
        </Card>
      </section>

      <section aria-labelledby="data-title">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-5 text-accent-strong" />
            <h2 id="data-title" className="font-display text-section font-semibold text-white">
              Your data
            </h2>
          </div>
          <p className="text-body text-text-secondary">
            Download a copy of everything stored about you, or delete your account. Read{" "}
            <Link href="/privacy" className="font-semibold text-text-primary underline underline-offset-4">
              what we store
            </Link>
            .
          </p>
          <a href="/profile/export" download className="inline-flex min-h-12 items-center gap-2 rounded-card bg-surface-interactive px-4 font-semibold hover:bg-surface-secondary">
            <Download aria-hidden className="size-4" /> Download my data (JSON)
          </a>
          <div className="border-t border-border-default pt-4">
            <DeleteAccountForm />
          </div>
        </Card>
      </section>

      <form action={signOut}>
        <SubmitButton variant="ghost" size="md" className="w-full" pendingLabel="Signing out…">
          <LogOut aria-hidden className="size-4" /> Sign out
        </SubmitButton>
      </form>
    </div>
  );
}
