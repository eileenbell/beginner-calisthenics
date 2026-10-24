import type { Metadata } from "next";
import { BackendMissing } from "@/components/backend-missing";
import { FlowShell } from "@/components/shell/flow-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { isBackendConfigured } from "@/lib/env";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  if (!isBackendConfigured()) return <BackendMissing />;
  await requireUser("/reset-password");
  return (
    <FlowShell section="Password">
      <div className="space-y-6 pt-2">
        <div className="space-y-2">
          <h1 className="font-display text-display font-bold tracking-tight">Choose a new password</h1>
          <p className="text-body-lg text-text-secondary">You&apos;ll stay signed in on this device.</p>
        </div>
        <ResetPasswordForm />
      </div>
    </FlowShell>
  );
}
