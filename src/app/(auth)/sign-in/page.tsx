import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BackendMissing } from "@/components/backend-missing";
import { FlowShell } from "@/components/shell/flow-shell";
import { SignInForm } from "@/features/auth/sign-in-form";
import { isBackendConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-path";
import { getAccount, homePathFor } from "@/server/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if (!isBackendConfigured()) return <BackendMissing />;
  const { next } = await searchParams;
  const account = await getAccount();
  if (account) redirect(homePathFor(account));
  const nextPath = typeof next === "string" ? safeNextPath(next) : undefined;

  return (
    <FlowShell section="Sign in" backHref="/">
      <div className="space-y-6 pt-2">
        <div className="space-y-2">
          <p className="eyebrow text-accent-primary">Welcome back</p>
          <h1 className="font-display text-display font-bold tracking-tight">Sign in to FORM</h1>
          <p className="text-body-lg text-text-secondary">Your plan and logged workouts are waiting.</p>
        </div>
        <SignInForm next={nextPath} />
        <p className="text-center text-body-lg text-text-secondary">
          New to FORM?{" "}
          <Link href="/sign-up" className="font-semibold text-accent-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </FlowShell>
  );
}
