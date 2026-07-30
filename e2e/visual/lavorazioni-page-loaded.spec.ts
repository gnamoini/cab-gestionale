import { test, expect } from "@playwright/test";

/**
 * Lavorazioni list — visual regression (cert tier, skip senza baseline).
 * Mask elementi dinamici; diff entro soglia progetto.
 */
test.describe("Lavorazioni page loaded", () => {
  test.skip(!process.env.LAVORAZIONI_VISUAL_BASELINE, "Set LAVORAZIONI_VISUAL_BASELINE=1 to run");

  test.use({ viewport: { width: 1440, height: 900 } });

  test("dashboard to lavorazioni table", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /lavorazioni/i }).first().click();
    await page.waitForURL("**/lavorazioni**");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /lavorazioni/i }).first()).toBeVisible();
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("lavorazioni-table-loaded.png", {
      maxDiffPixelRatio: 0.02,
      mask: [
        page.locator("time"),
        page.locator('[data-testid="gestionale-list-updated-at"]'),
      ],
    });
  });
});
