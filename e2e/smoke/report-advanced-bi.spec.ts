import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report Advanced BI P6", () => {
  test("desktop: executive through advanced analysis drill-down", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("#bi-executive")).toBeVisible();
    await page.getByTestId("primary-trend-metric-select").selectOption({ index: 0 });
    await expect(page.locator("#bi-advanced")).toBeVisible();
    const drill = page.getByTestId("primary-trend-drilldown");
    if (await drill.isVisible()) {
      await drill.click();
      await expect(page.getByTestId("report-drilldown-panel")).toBeVisible({ timeout: 15_000 });
    }
  });

  test("mobile: advanced expand", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-operational-context-panel")).toBeVisible({ timeout: 45_000 });
    const expand = page.getByTestId("report-advanced-expand");
    if (await expand.isVisible()) {
      await expand.click();
      await expect(page.locator("#bi-advanced")).toBeVisible();
    }
  });
});
