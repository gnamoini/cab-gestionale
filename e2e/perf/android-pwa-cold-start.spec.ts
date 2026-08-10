/**
 * Android PWA cold start — ordine marks e tre bucket (proxy Playwright, non splash nativa).
 * Run: NEXT_PUBLIC_BOOT_INVESTIGATION=1 npx playwright test e2e/perf/android-pwa-cold-start.spec.ts -c e2e/perf/playwright.config.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

const OUT_DIR = join(process.cwd(), "test-results", "android-cold-start");

type ColdStartReport = {
  buckets: {
    webStartup: { durationMs: number | null };
    applicationStartup: { durationMs: number | null };
    nativeLaunchGap: { estimatedMs: number | null; confidence: string };
  };
  staticToReactSequence: {
    marks: Record<string, number | null>;
    measures: Record<string, number | null>;
  };
};

async function collectReport(page: Page): Promise<ColdStartReport | null> {
  return page.evaluate(() => {
    const r = (window as Window & { __cabColdStartReport?: ColdStartReport }).__cabColdStartReport;
    return r ?? null;
  });
}

function assertMarkOrder(marks: Record<string, number | null>, a: string, b: string): void {
  const ta = marks[a];
  const tb = marks[b];
  if (ta == null || tb == null) return;
  expect(tb).toBeGreaterThanOrEqual(ta);
}

test.describe("android pwa cold start diagnostics", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      (window as unknown as { __cabForceNavDiagnostics?: boolean }).__cabForceNavDiagnostics = true;
    });
    const creds = adminCredentials();
    if (!creds) test.skip();
    await loginViaUi(page, creds!);
  });

  test("dashboard cold navigation exposes cold start report with ordered marks", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 90_000 });

    await page.waitForFunction(
      () =>
        Boolean(
          (window as Window & { __cabColdStartReport?: { buckets: unknown } }).__cabColdStartReport?.buckets,
        ),
      { timeout: 90_000 },
    );

    const report = await collectReport(page);
    expect(report).not.toBeNull();
    if (!report) return;

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, `playwright-proxy-cold-dashboard.json`),
      JSON.stringify({ scenario: "cold-proxy", route: "/dashboard", report }, null, 2),
    );

    expect(report.buckets.webStartup).toBeDefined();
    expect(report.buckets.applicationStartup).toBeDefined();
    expect(report.buckets.nativeLaunchGap.confidence).toBeTruthy();

    const marks = report.staticToReactSequence.marks;
    assertMarkOrder(marks, "cab_static_boot_visible", "react_root_mount");
    assertMarkOrder(marks, "react_root_mount", "app_boot_screen_mount");
    assertMarkOrder(marks, "app_boot_screen_mount", "app_boot_static_hidden");

    if (marks.first_useful_ui != null && marks.cab_static_boot_visible != null) {
      expect(marks.first_useful_ui).toBeGreaterThanOrEqual(marks.cab_static_boot_visible);
    }
  });

  test("lavorazioni navigation records application startup phases", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/lavorazioni", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").getByText("Lavorazioni", { exact: false })).toBeVisible({
      timeout: 120_000,
    });

    const report = await collectReport(page);
    if (report) {
      mkdirSync(OUT_DIR, { recursive: true });
      writeFileSync(
        join(OUT_DIR, `playwright-proxy-warm-lavorazioni.json`),
        JSON.stringify({ scenario: "warm-proxy", route: "/lavorazioni", report }, null, 2),
      );
    }
    expect(report?.buckets.applicationStartup.durationMs).not.toBeNull();
  });
});
