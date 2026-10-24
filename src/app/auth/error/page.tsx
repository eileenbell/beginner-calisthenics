import type { Metadata } from "next";
import { FlowShell } from "@/components/shell/flow-shell";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Link expired" };

export default function AuthErrorPage() {
  return (
    <FlowShell section="Account">
      <div className="space-y-6 pt-4">
        <h1 className="font-display text-display font-bold tracking-tight">That link didn&apos;t work</h1>
        <p className="text-body-lg text-text-secondary">
          Email links can only be used once and expire after an hour. If you were resetting your password, request a new link.
        </p>
        <div className="flex flex-col gap-3">
          <LinkButton href="/forgot-password">Request a new link</LinkButton>
          <LinkButton href="/sign-in" variant="secondary" size="md">
            Back to sign in
          </LinkButton>
        </div>
      </div>
    </FlowShell>
  );
}
