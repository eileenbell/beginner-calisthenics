import { FlowShell } from "@/components/shell/flow-shell";
import { Notice } from "@/components/ui/notice";

/** Shown instead of auth or app screens when Supabase settings are missing. */
export function BackendMissing() {
  return (
    <FlowShell section="Setup needed">
      <div className="space-y-4 pt-4">
        <h1 className="font-display text-display font-bold">Connect the database to continue</h1>
        <Notice tone="warning" title="Supabase isn't configured for this deployment">
          <p>
            Accounts, programmes and workout logs are stored in Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, then redeploy. The steps are in{" "}
            <code>docs/DEPLOYMENT_GUIDE.md</code>.
          </p>
        </Notice>
      </div>
    </FlowShell>
  );
}
