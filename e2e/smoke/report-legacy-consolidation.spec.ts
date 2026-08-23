import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report legacy consolidation", () => {
  test("domain chart panels visible in dedicated areas", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report/lavorazioni");
    await expect(page.getByTestId("report-area-lavorazioni")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-lavorazioni-charts-panel")).toBeVisible({ timeout: 30_000 });

    await page.goto("/report/magazzino");
    await expect(page.getByTestId("report-area-magazzino")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-magazzino-charts-panel")).toBeVisible({ timeout: 30_000 });

    await page.goto("/report/trasversali");
    await expect(page.getByTestId("report-area-trasversali")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("report-cross-catena-section")).toBeVisible({ timeout: 30_000 });
  });
});
