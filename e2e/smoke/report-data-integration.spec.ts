import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report data integration", () => {
  test("desktop: hub and domain areas reachable", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-hub")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-hub-card-economia")).toBeVisible();
    await expect(page.getByTestId("report-hub-card-lavorazioni")).toBeVisible();
    await expect(page.getByTestId("report-hub-card-magazzino")).toBeVisible();
    await expect(page.getByTestId("report-hub-card-clienti")).toBeVisible();
    await expect(page.getByTestId("report-hub-card-dipendenti")).toBeVisible();

    await page.goto("/report/panoramica");
    await expect(page.getByText(/Executive Overview/i)).toBeVisible();
  });

  test("mobile: hub loads", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-hub")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("report-hub-card-economia").click();
    await expect(page.getByTestId("report-area-economia")).toBeVisible({ timeout: 45_000 });
  });
});
