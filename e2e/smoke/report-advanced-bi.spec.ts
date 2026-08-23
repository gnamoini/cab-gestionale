import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report Advanced BI P6", () => {
  test("desktop: panoramica trend drill-down", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report/panoramica");
    await expect(page.getByTestId("report-area-panoramica")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("primary-trend-metric-select").selectOption({ index: 0 });
    const drill = page.getByTestId("primary-trend-drilldown");
    if (await drill.isVisible()) {
      await drill.click();
      await expect(page.getByTestId("report-drilldown-panel")).toBeVisible({ timeout: 15_000 });
    }
  });

  test("desktop: lavorazioni area loads", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report/lavorazioni");
    await expect(page.getByTestId("report-area-lavorazioni")).toBeVisible({ timeout: 45_000 });
  });

  test("mobile: lavorazioni area", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report/lavorazioni");
    await expect(page.getByTestId("report-area-lavorazioni")).toBeVisible({ timeout: 45_000 });
  });
});
