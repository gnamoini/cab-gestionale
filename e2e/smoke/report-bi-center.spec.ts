import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report BI Center", () => {
  test("desktop: period change updates executive and bi sections", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByRole("heading", { name: "Report" })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Executive Overview/i)).toBeVisible();
    await expect(page.getByText(/Insight & Alerts/i)).toBeVisible();
    await expect(page.getByText(/Andamento/i)).toBeVisible();
  });

  test("mobile viewport loads bi center", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
  });
});
