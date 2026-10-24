import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { registerAndOnboard, startWorkout } from "./helpers";

// WCAG 2.2 AA checks with axe, plus a check that nothing scrolls sideways,
// at phone, tablet and desktop widths.

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const PUBLIC_PAGES = ["/", "/sign-in", "/sign-up", "/forgot-password", "/privacy"];
const APP_PAGES = [
  "/today",
  "/workouts",
  "/exercises",
  "/exercises/wall_push_up",
  "/skills",
  "/skills/push_up_mastery",
  "/skills/crow_pose",
  "/skills/roadmap/muscle_up",
  "/progress",
  "/profile",
  "/profile/training",
];

async function audit(page: Page, path: string, problems: string[]) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // @axe-core/playwright is typed against a slightly older playwright-core Page.
  const builder = new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] });
  const results = await builder.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  for (const v of results.violations) {
    const nodes = v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} [${n.any[0]?.message ?? n.failureSummary ?? ""}]`);
    problems.push(`${path}: ${v.id} (${v.impact}) ${nodes.join("; ")}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) problems.push(`${path}: scrolls sideways by ${overflow}px`);
}

for (const vp of VIEWPORTS) {
  test(`accessibility and layout at ${vp.name} width`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const problems: string[] = [];

    for (const path of PUBLIC_PAGES) await audit(page, path, problems);

    await registerAndOnboard(page);
    for (const path of APP_PAGES) await audit(page, path, problems);

    await startWorkout(page);
    await audit(page, page.url().replace(/^https?:\/\/[^/]+/, ""), problems);

    expect(problems, problems.join("\n")).toEqual([]);
  });
}
