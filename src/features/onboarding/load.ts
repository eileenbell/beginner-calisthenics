import "server-only";
import { redirect } from "next/navigation";
import { getAccount } from "@/server/auth";
import { firstIncompleteStep, readAnswers, stepIndex, STEP_PATHS, type OnboardingStepId } from "./answers";

/** Loads onboarding answers for a step page, sending the user to the right place if this step isn't open yet. */
export async function loadStep(step: OnboardingStepId) {
  const account = await getAccount();
  if (!account) redirect("/sign-in?next=/onboarding");
  if (account.preferences && account.programme) redirect("/today");
  const answers = readAnswers(account.onboarding?.answers);
  const open = firstIncompleteStep(answers);
  if (stepIndex(step) > stepIndex(open)) redirect(STEP_PATHS[open]);
  return { account, answers };
}
