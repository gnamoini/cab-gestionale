import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.SMOKE_PORT ?? (process.env.SMOKE_NO_WEB_SERVER ? "3000" : "3210"));
const baseURL = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Certificazione Nuovo Ricambio — desktop + iOS (non nel PR chromium-only gate). */
export default defineConfig({
  testDir: "./smoke",
  testMatch: "**/14-magazzino-nuovo-ricambio.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    trace: process.env.CI ? "on-first-retry" : "off",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-ios", use: { ...devices["iPhone 14"] } },
  ],
  webServer: process.env.SMOKE_NO_WEB_SERVER
    ? undefined
    : {
        command: process.env.CI ? "npm run start" : "npm run dev",
        url: baseURL,
        reuseExistingServer: !!process.env.CI,
        timeout: 180_000,
        env: { ...process.env, PORT: String(PORT) },
      },
});
