import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildReferenceSql, REFERENCE_MIGRATION } from "../../scripts/reference-data";

describe("reference data migration", () => {
  it("matches the exercise catalogue in src/domain/content", () => {
    // If this fails, run `npm run db:reference` and ship the regenerated SQL as a new migration.
    expect(readFileSync(REFERENCE_MIGRATION, "utf8")).toBe(buildReferenceSql());
  });
});
