import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report Ask Report P8", () => {
  test("desktop: ask panel opens and accepts question", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report/ai");
    await expect(page.getByTestId("report-area-ai")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("report-ask-toolbar-button").click();
    await expect(page.getByTestId("report-ask-panel")).toBeVisible();
    await page.getByTestId("report-ask-input").fill("Quanto fatturiamo?");
    await page.getByTestId("report-ask-submit").click();
    await expect(page.getByTestId("report-ask-message").last()).toBeVisible({ timeout: 30_000 });
  });

  test("mobile: ask section visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report/ai");
    await expect(page.getByTestId("report-ask-open")).toBeVisible({ timeout: 45_000 });
  });
});
