import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report P9 — no legacy surface", () => {
  test("/report is BI Center only — no legacy accordion", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });

    await expect(page.getByText("Analisi legacy")).toHaveCount(0);
    await expect(page.getByTestId("legacy-blocked-accordion")).toHaveCount(0);
    await expect(page.locator("#report-section-lavorazioni")).toHaveCount(0);
  });

  test("Executive → Advanced → domain sections", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });

    const expand = page.getByTestId("report-advanced-expand");
    if (await expand.isVisible()) {
      await expand.click();
    }

    await expect(page.getByTestId("report-lavorazioni-charts-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("report-magazzino-charts-panel")).toBeVisible({ timeout: 30_000 });
  });
});
