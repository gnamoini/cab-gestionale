import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report Operational Context", () => {
  test("context panel and timeline expand", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-operational-context-panel")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("report-timeline-expand").click();
    await expect(page.locator("#report-timeline-v2")).toBeVisible();
  });

  test("mobile: operational context visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-operational-context-panel")).toBeVisible({ timeout: 45_000 });
  });
});
