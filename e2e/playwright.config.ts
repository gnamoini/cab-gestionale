import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.SMOKE_PORT ?? "3210");
const baseURL = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./smoke",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    trace: process.env.CI ? "on-first-retry" : "off",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  /** Certificazione mobile / smoke dedicati — vedi smoke:playwright:cert / ricambio:smoke. */
  testIgnore: [
    "**/13-lavorazioni-scheda-ingresso.spec.ts",
    "**/14-magazzino-nuovo-ricambio.spec.ts",
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
