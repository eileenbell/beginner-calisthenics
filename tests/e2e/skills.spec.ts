import { expect, test } from "@playwright/test";
import { registerAndOnboard } from "./helpers";

test("a specific skill goal shows its build-up and stays locked until the basics are in place", async ({ page }) => {
  await registerAndOnboard(page, {
    goal: "Balance in crow pose",
    minutes: "About 15 minutes",
    onPlan: async (plan) => {
      await expect(plan.getByText("5-second crow")).toBeVisible();
      await expect(plan.getByText(/unlocks once the basics are in place/)).toBeVisible();
      await expect(plan.getByText(/15-minute sessions don't have room for skill practice/)).toBeVisible();
    },
  });

  await page.goto("/skills");
  const crow = page.getByRole("article", { name: "Crow Pose" });
  await expect(crow.getByText("Locked", { exact: true })).toBeVisible();
  await expect(crow.getByText(/3 × 8 low incline push-ups and a 30-second plank/)).toBeVisible();

  await crow.getByRole("link", { name: /preview pathway/i }).click();
  await page.waitForURL("**/skills/crow_pose");
  await expect(page.getByRole("heading", { name: "What it involves" })).toBeVisible();
  for (const stage of ["Crow lean", "One-foot crow lift", "Crow pose"]) {
    await expect(page.getByRole("heading", { level: 3, name: stage, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Low incline, 3 × 8")).toBeVisible();
});

test("long-term goals have a roadmap whose first phase links to real pathways", async ({ page }) => {
  await registerAndOnboard(page, { goal: "Muscle-up", equipment: ["Pull-up bar"] });

  await page.goto("/skills");
  const card = page.getByRole("article", { name: "Muscle-up" });
  await expect(card.getByText("Your goal")).toBeVisible();
  await card.getByRole("link", { name: /see the build-up/i }).click();
  await page.waitForURL("**/skills/roadmap/muscle_up");

  await expect(page.getByRole("heading", { level: 1, name: "Muscle-up" })).toBeVisible();
  const phases = page.getByRole("article");
  await expect(phases).toHaveCount(4);
  await expect(phases.first().getByText("In FORM now")).toBeVisible();
  await expect(phases.nth(3).getByText("Not in FORM yet")).toBeVisible();
  await phases.first().getByRole("link", { name: /First Pull-Up/ }).click();
  await page.waitForURL("**/skills/first_pull_up");
  await expect(page.getByText("Focus pathway")).toBeVisible();
});

test("skill goals can be changed in training settings", async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto("/profile/training");
  await page.getByText("Do a pistol squat").click();
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.waitForURL("**/profile?notice=training-saved");
  await expect(page.getByText(/Do my first proper push-up, Do a pistol squat/)).toBeVisible();
});
