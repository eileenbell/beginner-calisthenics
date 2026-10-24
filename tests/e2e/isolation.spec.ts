import { expect, test } from "@playwright/test";
import { completeWorkout, registerAndOnboard, startWorkout } from "./helpers";

test("one person's workouts are invisible to another", async ({ browser }) => {
  const owner = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ownerPage = await owner.newPage();
  await registerAndOnboard(ownerPage, { name: "Owner Person" });
  await startWorkout(ownerPage);
  const sessionId = ownerPage.url().split("/workout/")[1];
  await completeWorkout(ownerPage);
  await ownerPage.goto(`/history/${sessionId}`);
  await expect(ownerPage.getByRole("heading", { name: /full body a/i }).first()).toBeVisible();

  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const otherPage = await other.newPage();
  await registerAndOnboard(otherPage, { name: "Someone Else" });

  for (const path of [`/history/${sessionId}`, `/workout/${sessionId}`, `/workout/${sessionId}/summary`]) {
    const response = await otherPage.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(otherPage.getByText("Owner Person")).toHaveCount(0);
  }

  await owner.close();
  await other.close();
});
