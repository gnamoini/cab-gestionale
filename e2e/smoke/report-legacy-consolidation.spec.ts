import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report legacy consolidation", () => {
  test("Wave A BI chart panels visible in advanced section", async ({ page }) => {
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
    await expect(page.getByTestId("report-cross-catena-section")).toBeVisible({ timeout: 30_000 });
  });
});
