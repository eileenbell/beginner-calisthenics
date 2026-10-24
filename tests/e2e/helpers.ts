import { expect, type Page } from "@playwright/test";

export const PASSWORD = "password-123";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

export function uniqueEmail(tag = "user"): string {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

export interface OnboardingOptions {
  name?: string;
  goal?: string;
  experience?: string;
  /** Push-up position from the optional assessment, or "skip" to skip the assessment. */
  push?: string | "skip";
  pushReps?: number;
  days?: "2 days a week" | "3 days a week" | "4 days a week";
  minutes?: "About 15 minutes" | "About 25 minutes" | "About 40 minutes";
  equipment?: string[];
}

export async function signUp(page: Page, email = uniqueEmail(), name = "Alex Morgan"): Promise<string> {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /continue to personalisation/i }).click();
  return email;
}

/** Registers a new user and completes onboarding, ending on Today. */
export async function registerAndOnboard(page: Page, opts: OnboardingOptions = {}): Promise<string> {
  const email = await signUp(page, uniqueEmail(), opts.name);
  await page.waitForURL("**/onboarding/goals");
  await page.getByText(opts.goal ?? "Do my first proper push-up").click();
  await page.getByRole("button", { name: /^continue/i }).click();

  await page.waitForURL("**/onboarding/experience");
  await page.getByText(opts.experience ?? "Complete beginner").click();
  if (opts.push === "skip") {
    await page.getByRole("button", { name: /skip the starting-point questions/i }).click();
  } else {
    await page.getByText(opts.push ?? "Hands on a kitchen counter or table").click();
    if (opts.pushReps !== undefined) await page.getByRole("spinbutton", { name: "Push-up reps" }).fill(String(opts.pushReps));
    await page.getByRole("button", { name: /continue to schedule/i }).click();
  }

  await page.waitForURL("**/onboarding/schedule");
  if (opts.days) await page.getByText(opts.days).click();
  if (opts.minutes) await page.getByText(opts.minutes).click();
  await page.getByRole("button", { name: /continue to equipment/i }).click();

  await page.waitForURL("**/onboarding/equipment");
  for (const item of opts.equipment ?? []) await page.getByText(item, { exact: true }).click();
  await page.getByRole("button", { name: /build my plan/i }).click();

  await page.waitForURL("**/onboarding/plan");
  await page.getByRole("button", { name: /start my programme/i }).click();
  await page.waitForURL("**/today**");
  return email;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in/i }).click();
}

export async function startWorkout(page: Page) {
  await page.goto("/today");
  await page.getByRole("button", { name: /start (workout|early)/i }).click();
  await page.waitForURL(/\/workout\/[0-9a-f-]{36}$/);
}

export const markSetButton = (page: Page) => page.getByRole("button", { name: /^(Mark set \d+ complete|Update set \d+)/ });

export async function workoutProgress(page: Page): Promise<number> {
  return Number(await page.getByRole("progressbar", { name: "Workout progress" }).getAttribute("aria-valuenow"));
}

/** Marks the current set complete and waits until the save has gone through. */
export async function logCurrentSet(page: Page) {
  const before = await workoutProgress(page);
  await markSetButton(page).click();
  await expect.poll(() => workoutProgress(page)).toBeGreaterThan(before);
}

/** Logs warm-up sets until the first main exercise is on screen. */
export async function skipToMain(page: Page) {
  for (let i = 0; i < 20; i++) {
    const label = await page.locator("header").getByText(/^(Warm-up|Exercise|Cool-down) \d+ of \d+$/).textContent();
    if (label?.startsWith("Exercise")) return;
    await logCurrentSet(page);
  }
  throw new Error("Never reached the main block");
}

export type Feeling = "Too easy" | "About right" | "Too difficult" | "Couldn't finish" | "Pain or discomfort";

/** Runs through the whole workout with the given feedback for every main exercise, then finishes. */
export async function completeWorkout(
  page: Page,
  feeling: Feeling | ((exercise: string) => Feeling) = "About right",
  reps?: (exercise: string) => number | undefined,
) {
  for (let i = 0; i < 120; i++) {
    if (await page.getByRole("heading", { name: "Every exercise done" }).isVisible()) break;
    if (await page.getByRole("heading", { name: "How did that feel?" }).isVisible()) {
      const name = (await page.locator("#exercise-name").textContent()) ?? "";
      const choice = typeof feeling === "function" ? feeling(name) : feeling;
      await page.getByText(choice, { exact: true }).click();
      if (choice !== "Pain or discomfort") await page.getByText("Yes", { exact: true }).click();
      await page.getByRole("button", { name: /save and continue/i }).click();
      await expect(page.getByRole("heading", { name: "How did that feel?" })).toBeHidden();
      continue;
    }
    const skipRest = page.getByRole("button", { name: /skip rest/i });
    if (await skipRest.isVisible()) {
      await skipRest.click();
      continue;
    }
    if (await markSetButton(page).isVisible()) {
      const value = reps?.((await page.locator("#exercise-name").textContent()) ?? "");
      const field = page.getByRole("spinbutton", { name: "Reps completed" });
      if (value !== undefined && (await field.isVisible())) await field.fill(String(value));
      await logCurrentSet(page);
      continue;
    }
    await page.waitForTimeout(200);
  }
  await page.getByRole("button", { name: /finish workout/i }).click();
  await page.waitForURL(/\/summary$/);
}

export async function latestEmail(page: Page, email: string): Promise<{ subject: string; link: string }> {
  const res = await page.request.get(`${SUPABASE_URL}/__dev/mailbox?email=${encodeURIComponent(email)}`);
  const messages = (await res.json()) as { subject: string; link: string }[];
  expect(messages.length).toBeGreaterThan(0);
  return messages[messages.length - 1];
}
