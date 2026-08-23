import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report Hub", () => {
  test("desktop: hub shows navigation cards", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-hub")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-hub-card-panoramica")).toBeVisible();
    await expect(page.getByTestId("report-hub-card-lavorazioni")).toBeVisible();
  });

  test("desktop: panoramica area loads executive sections", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report/panoramica");
    await expect(page.getByTestId("report-area-panoramica")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Executive Overview/i)).toBeVisible();
    await expect(page.getByText(/Insight & Alerts/i)).toBeVisible();
  });

  test("mobile viewport loads hub", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-hub")).toBeVisible({ timeout: 45_000 });
  });
});
