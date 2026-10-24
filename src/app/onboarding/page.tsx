import { redirect } from "next/navigation";
import { firstIncompleteStep, readAnswers, STEP_PATHS } from "@/features/onboarding/answers";
import { getAccount } from "@/server/auth";

export default async function OnboardingIndex() {
  const account = await getAccount();
  if (!account) redirect("/sign-in?next=/onboarding");
  if (account.preferences && account.programme) redirect("/today");
  redirect(STEP_PATHS[firstIncompleteStep(readAnswers(account.onboarding?.answers))]);
}
