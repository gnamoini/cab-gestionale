import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report Decision Center P7", () => {
  test("desktop: decision center visible on scroll", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
    await page.locator("#bi-decisions").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("report-decision-center")).toBeVisible({ timeout: 30_000 });
  });

  test("mobile: decision center section", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await page.locator("#bi-decisions").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("report-decision-center")).toBeVisible({ timeout: 45_000 });
  });
});
