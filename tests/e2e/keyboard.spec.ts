import { expect, test, type Page } from "@playwright/test";
import { registerAndOnboard, skipToMain, startWorkout, workoutProgress } from "./helpers";

async function tabTo(page: Page, name: RegExp, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim() : "";
    });
    if (name.test(label)) return;
  }
  throw new Error(`Never reached ${name} with Tab`);
}

test("the app shell starts with a working skip link", async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto("/today");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});

test("a set can be logged and dialogs closed with the keyboard alone", async ({ page }) => {
  await registerAndOnboard(page);
  await startWorkout(page);
  await skipToMain(page);

  const before = await workoutProgress(page);
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await tabTo(page, /^Mark set \d+ complete/);
  await page.keyboard.press("Enter");
  await expect.poll(() => workoutProgress(page)).toBeGreaterThan(before);

  const skipRest = page.getByRole("button", { name: /skip rest/i });
  if (await skipRest.isVisible()) {
    await skipRest.focus();
    await page.keyboard.press("Enter");
    await expect(skipRest).toBeHidden();
  }

  await tabTo(page, /^All exercises$/);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Today's exercises" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
