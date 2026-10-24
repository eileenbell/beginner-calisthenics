import { defineConfig } from "@playwright/test";

// End-to-end tests run against the local Supabase stand-in
// (scripts/local-supabase) and a Next.js server. See docs/TEST_REPORT.md.
//
//   npm run test:e2e              uses `next dev`, reusing servers already running
//   E2E_PROD=1 npm run test:e2e   builds and runs the production server instead

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
// The local stand-in's anon key (scripts/local-supabase/keys.ts). Not a real credential.
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImZvcm0tbG9jYWwiLCJpYXQiOjE3OTI4MDAwMDAsImV4cCI6MjEwODE2MDAwMH0.FUhDiqPWNFlZbIUYf_6t7BmOIBAQKrZV9DQTtbKbGWY";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-results.json" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],
  webServer: [
    {
      command: "npm run stack:local",
      url: `${SUPABASE_URL}/__dev/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { SITE_URL: BASE_URL },
    },
    {
      command: process.env.E2E_PROD ? `npm run build && npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY, NEXT_PUBLIC_SITE_URL: BASE_URL },
    },
  ],
});
