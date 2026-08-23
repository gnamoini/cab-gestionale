import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report P9 — no legacy surface", () => {
  test("/report is hub only — no legacy accordion", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-hub")).toBeVisible({ timeout: 45_000 });

    await expect(page.getByText("Analisi legacy")).toHaveCount(0);
    await expect(page.getByTestId("legacy-blocked-accordion")).toHaveCount(0);
    await expect(page.locator("#report-section-lavorazioni")).toHaveCount(0);
  });

  test("hub cards navigate to domain areas", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-hub")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("report-hub-card-lavorazioni").click();
    await expect(page.getByTestId("report-area-lavorazioni")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-lavorazioni-charts-panel")).toBeVisible({ timeout: 30_000 });
  });
});
