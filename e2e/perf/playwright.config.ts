import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.SMOKE_PORT ?? "3210");
const baseURL = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Opt-in perf audit — not part of default smoke CI. */
export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 45_000 },
  reporter: [["list"]],
  outputDir: "../test-results/perf-playwright",
  use: {
    baseURL,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PERF_NO_WEB_SERVER
    ? undefined
    : {
        command: process.env.PERF_USE_DEV ? "npm run dev" : "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { ...process.env, PORT: String(PORT) },
      },
});
