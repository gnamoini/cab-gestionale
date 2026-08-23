import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report data completion", () => {
  test("economia charts and cross KPIs in dedicated areas", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report/economia");
    await expect(page.getByTestId("report-area-economia")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-economia-charts-panel")).toBeVisible({ timeout: 30_000 });

    await page.goto("/report/trasversali");
    await expect(page.getByText("Indicatori incrociati")).toBeVisible();
  });

  test("legacy economici section not rendered after removal", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-hub")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("#report-section-dati_economici")).toHaveCount(0);
  });
});
