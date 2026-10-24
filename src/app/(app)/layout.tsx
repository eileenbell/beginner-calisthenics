import { BackendMissing } from "@/components/backend-missing";
import { AppHeader, BottomNav, SideRail } from "@/components/shell/app-chrome";
import { localDate, weekOf } from "@/domain";
import { isBackendConfigured } from "@/lib/env";
import { displayName, requireTrainingAccount } from "@/server/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!isBackendConfigured()) return <BackendMissing />;
  const account = await requireTrainingAccount();
  const today = localDate(new Date(), account.preferences.time_zone);
  const week = Math.max(1, weekOf(account.programme.started_on, today));
  const weekLabel = week > account.programme.weeks ? "Complete" : `Week ${week}`;
  const initial = displayName(account).charAt(0).toUpperCase() || "F";
  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded-small bg-accent-primary px-4 py-2 text-text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <SideRail />
      <AppHeader weekLabel={weekLabel} initial={initial} />
      <main
        id="main"
        className="mx-auto w-full max-w-xl px-4 pb-[calc(6rem+var(--safe-bottom))] pt-[calc(5rem+var(--safe-top))] tablet:max-w-2xl desktop:ml-60 desktop:max-w-none desktop:px-10 desktop:pb-12"
      >
        <div className="mx-auto w-full desktop:max-w-5xl">{children}</div>
      </main>
      <BottomNav />
    </>
  );
}
