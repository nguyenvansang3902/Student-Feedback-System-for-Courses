import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 600000,
  expect: { timeout: 30000 },
  outputDir: "test-results/week12",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/week12/results.json" }],
  ],
  use: {
    baseURL: process.env.SFS_E2E_BASE_URL ?? "http://127.0.0.1:3007",
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
