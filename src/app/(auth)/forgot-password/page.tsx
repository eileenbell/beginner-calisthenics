import type { Metadata } from "next";
import Link from "next/link";
import { BackendMissing } from "@/components/backend-missing";
import { FlowShell } from "@/components/shell/flow-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { isBackendConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  if (!isBackendConfigured()) return <BackendMissing />;
  return (
    <FlowShell section="Password" backHref="/sign-in" backLabel="Back to sign in">
      <div className="space-y-6 pt-2">
        <div className="space-y-2">
          <h1 className="font-display text-display font-bold tracking-tight">Reset your password</h1>
          <p className="text-body-lg text-text-secondary">Enter the email you signed up with and we&apos;ll send you a link.</p>
        </div>
        <ForgotPasswordForm />
        <p className="text-center text-body-lg text-text-secondary">
          Remembered it?{" "}
          <Link href="/sign-in" className="font-semibold text-accent-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </FlowShell>
  );
}
