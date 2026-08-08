import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.SMOKE_PORT ?? "3210");
const baseURL = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Smoke content-reveal — Chrome desktop + iOS viewport + Android (matrice browser plan). */
export default defineConfig({
  testDir: "./smoke",
  testMatch: "**/content-reveal.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  outputDir: "e2e/test-results",
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-ios-chromium",
      use: { ...devices["iPhone 14"], browserName: "chromium" },
    },
    { name: "mobile-android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.SMOKE_NO_WEB_SERVER
    ? undefined
    : {
        command: process.env.CI ? "npm run start" : "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: !!process.env.CI,
        timeout: 180_000,
        env: { ...process.env, PORT: String(PORT) },
      },
});
