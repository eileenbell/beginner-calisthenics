import { expect, it } from "vitest";
import { cn } from "@/lib/cn";
it("merges conflicting utilities and keeps the custom theme scales", () => {
  expect(cn("font-display text-card font-bold text-white")).toBe("font-display text-card font-bold text-white");
  expect(cn("uppercase", "normal-case")).toBe("normal-case");
  expect(cn("px-4", "px-2")).toBe("px-2");
  expect(cn("text-body text-text-secondary", "text-caption")).toBe("text-text-secondary text-caption");
  expect(cn("rounded-full", "rounded-card")).toBe("rounded-card");
  expect(cn("tablet:grid-cols-2 grid")).toBe("tablet:grid-cols-2 grid");
});
