import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report data integration", () => {
  test("desktop: executive → advanced domains visible", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Executive Overview/i)).toBeVisible();
    await expect(page.getByText(/Analisi avanzate/i)).toBeVisible();
    await expect(page.getByText(/Economia/i).first()).toBeVisible();
    await expect(page.getByText(/Lavorazioni/i).first()).toBeVisible();
    await expect(page.getByText(/Magazzino/i).first()).toBeVisible();
    await expect(page.getByText(/Clienti/i).first()).toBeVisible();
    await expect(page.getByText(/Risorse/i).first()).toBeVisible();
  });

  test("mobile: advanced shell expandable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });
    const expand = page.getByTestId("report-advanced-expand");
    if (await expand.isVisible()) {
      await expand.click();
      await expect(page.getByText(/Economia/i).first()).toBeVisible();
    }
  });
});
