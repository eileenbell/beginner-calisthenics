import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // Needs a local Postgres. See docs/TEST_REPORT.md and `npm run test:db`.
        resolve: { alias },
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/db/global-setup.ts"],
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/lib/**", "src/features/**/*.ts"],
    },
  },
});
