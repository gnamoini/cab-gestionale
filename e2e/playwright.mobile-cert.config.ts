import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.SMOKE_PORT ?? (process.env.SMOKE_NO_WEB_SERVER ? "3000" : "3210"));
const baseURL = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Certificazione Scheda Ingresso — progetti mobile/tablet (non nel release gate: richiede WebKit). */
export default defineConfig({
  testDir: "./smoke",
  testMatch: "**/13-lavorazioni-scheda-ingresso.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never", outputFolder: "e2e/playwright-report" }]]
    : [["list"]],
  outputDir: "e2e/test-results",
  use: {
    baseURL,
    trace: process.env.CI ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-android", use: { ...devices["Pixel 7"] } },
    /** PR ios-smoke: Chromium + viewport iPhone (WebKit headless in CI ha auth/CORS flaky). */
    {
      name: "mobile-ios-chromium",
      use: { ...devices["iPhone 14"], browserName: "chromium" },
    },
    { name: "mobile-ios", use: { ...devices["iPhone 14"] } },
    { name: "tablet-ios", use: { ...devices["iPad Pro 11"] } },
  ],
  webServer: process.env.SMOKE_NO_WEB_SERVER
    ? undefined
    : {
        command: process.env.CI ? "npm run start" : "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { ...process.env, PORT: String(PORT) },
      },
});
