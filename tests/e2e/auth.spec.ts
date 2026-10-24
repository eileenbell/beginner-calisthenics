import { expect, test } from "@playwright/test";
import { latestEmail, PASSWORD, registerAndOnboard, signIn, signUp, uniqueEmail } from "./helpers";

test.describe("accounts", () => {
  test("signed-out visitors are sent to sign in and come back afterwards", async ({ page }) => {
    const email = await registerAndOnboard(page);
    await page.context().clearCookies();

    await page.goto("/progress?range=90");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fprogress%3Frange%3D90$/);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: /^sign in/i }).click();
    await page.waitForURL("**/progress?range=90");
  });

  test("a wrong password gets a plain explanation", async ({ page }) => {
    const email = await registerAndOnboard(page);
    await page.context().clearCookies();
    await signIn(page, email, "not-the-password-1");
    await expect(page.getByText(/don't match an account/i)).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("an account that needs email confirmation can confirm from the link", async ({ page }) => {
    const email = uniqueEmail("confirm").replace("@", "+confirm@");
    await signUp(page, email);
    await expect(page.getByText("Check your email")).toBeVisible();

    await signIn(page, email);
    await expect(page.getByText(/confirm your email first/i)).toBeVisible();

    const mail = await latestEmail(page, email);
    await page.goto(mail.link);
    await page.waitForURL("**/onboarding/**");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("a forgotten password can be reset from the emailed link", async ({ page }) => {
    const email = await registerAndOnboard(page);
    await page.context().clearCookies();

    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText("Check your email")).toBeVisible();

    const mail = await latestEmail(page, email);
    await page.goto(mail.link);
    await page.waitForURL("**/reset-password");
    const fresh = "brand-new-pass-42";
    await page.getByLabel("New password", { exact: true }).fill(fresh);
    await page.getByLabel("Confirm new password").fill(fresh);
    await page.getByRole("button", { name: /save new password/i }).click();
    await page.waitForURL("**/today?notice=password-updated");
    await expect(page.getByText("Your password has been updated.")).toBeVisible();

    await page.context().clearCookies();
    await signIn(page, email, fresh);
    await page.waitForURL("**/today");
  });
});
