import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BackendMissing } from "@/components/backend-missing";
import { FlowShell } from "@/components/shell/flow-shell";
import { Pill } from "@/components/ui/pill";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { StepIndicator } from "@/features/auth/step-indicator";
import { isBackendConfigured } from "@/lib/env";
import { getAccount, homePathFor } from "@/server/auth";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage() {
  if (!isBackendConfigured()) return <BackendMissing />;
  const account = await getAccount();
  if (account) redirect(homePathFor(account));

  return (
    <FlowShell section="Create account" backHref="/">
      <div className="space-y-6">
        <StepIndicator step={1} />
        <div className="relative h-36 overflow-hidden rounded-card bg-surface-secondary">
          <Image src="/images/design/welcome-hero.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 576px" className="object-cover object-[50%_30%]" priority />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background-primary via-background-primary/30 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <Pill tone="success">Your plan, saved to your account</Pill>
          </div>
        </div>
        <div className="space-y-2">
          <p className="eyebrow text-accent-primary">
            Join FORM <span className="text-text-secondary">· Your account</span>
          </p>
          <h1 className="font-display text-display font-bold tracking-tight">Create your account</h1>
          <p className="text-body-lg text-text-secondary">
            Save your training plan and pick up where you left off on any device.
          </p>
        </div>
        <SignUpForm />
        <p className="text-center text-body-lg text-text-secondary">
          Already registered?{" "}
          <Link href="/sign-in" className="font-semibold text-accent-primary underline-offset-4 hover:underline">
            Sign in instead
          </Link>
        </p>
        <p className="text-center text-caption text-text-secondary">
          FORM gives general fitness guidance, not medical advice.{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            How your data is stored
          </Link>
        </p>
      </div>
    </FlowShell>
  );
}
