import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.SMOKE_PORT ?? "3210");
const baseURL = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./visual",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: [["list"]],
  outputDir: "e2e/test-results-visual",
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.SMOKE_NO_WEB_SERVER
    ? undefined
    : {
        command: process.env.CI ? "npm run start" : "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { ...process.env, PORT: String(PORT) },
      },
});
