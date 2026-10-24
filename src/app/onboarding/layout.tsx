import { BackendMissing } from "@/components/backend-missing";
import { isBackendConfigured } from "@/lib/env";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  if (!isBackendConfigured()) return <BackendMissing />;
  return children;
}
