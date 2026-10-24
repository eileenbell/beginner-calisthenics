import { expect, test } from "@playwright/test";
import { completeWorkout, logCurrentSet, markSetButton, registerAndOnboard, skipToMain, startWorkout, workoutProgress } from "./helpers";

test.describe("beginner journey", () => {
  test("someone who can only push against a wall starts on wall push-ups", async ({ page }) => {
    await registerAndOnboard(page, { push: "Against a wall", pushReps: 4 });
    await startWorkout(page);
    await page.getByRole("button", { name: "All exercises" }).click();
    const overview = page.getByRole("dialog", { name: "Today's exercises" });
    await expect(overview).toContainText("Wall push-up");
    await expect(overview).not.toContainText(/high incline push-up/i);
  });

  test("a workout saves every set, survives a refresh and ends with an honest summary", async ({ page }) => {
    await registerAndOnboard(page);
    await startWorkout(page);
    await skipToMain(page);

    await logCurrentSet(page);
    const name = await page.locator("#exercise-name").textContent();
    const done = await workoutProgress(page);

    await page.reload();
    await expect(page.locator("#exercise-name")).toHaveText(name ?? "");
    expect(await workoutProgress(page)).toBe(done);

    await completeWorkout(page, "About right");
    await expect(page.getByRole("main").getByText("Workout complete")).toBeVisible();
    await expect(page.getByText(/what changes next time/i)).toBeVisible();

    await page.getByRole("link", { name: /see your progress/i }).click();
    await page.waitForURL("**/progress**");
    const workouts = page.locator("dl > div").filter({ has: page.locator("dt", { hasText: /^Workouts$/ }) }).first();
    await expect(workouts.locator("dd").first()).toHaveText("1");

    await page.goto("/workouts");
    await expect(page.getByRole("link", { name: /full body a/i }).first()).toBeVisible();
  });

  test("the rest timer counts down, pauses with the workout and can be skipped", async ({ page }) => {
    await page.clock.install();
    await registerAndOnboard(page);
    await startWorkout(page);
    await skipToMain(page);

    await markSetButton(page).click();
    const timer = page.getByRole("timer");
    await expect(timer).toBeVisible();
    const seconds = async () => Number((await timer.getByLabel(/^Rest: \d+ seconds left$/).getAttribute("aria-label"))?.match(/\d+/)?.[0]);

    const start = await seconds();
    await page.clock.runFor(10_000);
    await expect.poll(seconds).toBeLessThanOrEqual(start - 9);

    await page.getByRole("button", { name: /^pause/i }).first().click();
    const paused = await seconds();
    await page.clock.runFor(20_000);
    expect(await seconds()).toBe(paused);
    await page.getByRole("dialog").getByRole("button", { name: /resume/i }).click();

    await page.getByRole("button", { name: /skip rest/i }).click();
    await expect(timer).toBeHidden();
    await expect(markSetButton(page)).toBeVisible();
  });

  test("an easier variation can be swapped in mid-workout", async ({ page }) => {
    await registerAndOnboard(page, { push: "Hands on a kitchen counter or table", pushReps: 6 });
    await startWorkout(page);
    await skipToMain(page);

    for (let i = 0; i < 6; i++) {
      const current = (await page.locator("#exercise-name").textContent()) ?? "";
      if (/push-up/i.test(current)) break;
      await page.getByRole("button", { name: /skip this exercise/i }).click();
      await page.getByText("Another reason").click();
      await page.getByRole("button", { name: /^skip exercise/i }).click();
      await expect(page.locator("#exercise-name")).not.toHaveText(current);
    }
    const before = await page.locator("#exercise-name").textContent();
    await page.getByRole("button", { name: /easier variation/i }).click();
    const dialog = page.getByRole("dialog", { name: "Choose a variation" });
    await dialog.getByRole("button").filter({ hasText: /push-up/i }).first().click();
    await expect(page.locator("#exercise-name")).not.toHaveText(before ?? "");
    await expect(page.getByText(/^Swapped from/)).toBeVisible();
  });

  test("reporting pain leads to an easier option next time", async ({ page }) => {
    await registerAndOnboard(page);
    await startWorkout(page);
    await completeWorkout(page, (exercise) => (/push-up/i.test(exercise) ? "Pain or discomfort" : "About right"));
    await expect(page.getByText("Easier option").first()).toBeVisible();
    await expect(page.getByText(/discomfort/i).first()).toBeVisible();
  });

  test("too easy at the top of the range moves up a variation", async ({ page }) => {
    await registerAndOnboard(page);
    await startWorkout(page);
    await completeWorkout(page, "Too easy", () => 40);
    await expect(page.getByText("Moving up").first()).toBeVisible();
    await expect(page.getByText(/moves? to a harder variation/i).first()).toBeVisible();
  });
});
