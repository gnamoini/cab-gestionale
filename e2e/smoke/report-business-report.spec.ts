import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report Business Report P4", () => {
  test("desktop: business report shell visible", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("business-report-shell")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/AI Business Report/i)).toBeVisible();
  });
});
