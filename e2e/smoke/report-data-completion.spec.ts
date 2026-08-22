import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report data completion", () => {
  test("economia charts and cross KPIs in advanced BI", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("#bi-advanced")).toBeVisible();

    const expand = page.getByTestId("report-advanced-expand");
    if (await expand.isVisible()) {
      await expand.click();
    }

    await expect(page.getByTestId("report-economia-charts-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Indicatori incrociati")).toBeVisible();
  });

  test("legacy economici section not rendered after removal", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });

    const legacyDetails = page.locator("details").filter({ hasText: "Analisi legacy" });
    if (await legacyDetails.isVisible()) {
      await legacyDetails.locator("summary").click();
      await expect(page.locator("#report-section-dati_economici")).toHaveCount(0);
    }
  });
});
