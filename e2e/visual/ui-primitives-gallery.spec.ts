import { test, expect } from "@playwright/test";

/**
 * UI primitives gallery — cert tier (skip senza baseline).
 */
test.describe("UI primitives gallery", () => {
  test.skip(!process.env.UI_PRIMITIVES_VISUAL_BASELINE, "Set UI_PRIMITIVES_VISUAL_BASELINE=1 to run");

  test.use({ viewport: { width: 1440, height: 900 } });

  test("design-system-preview ui sections", async ({ page }) => {
    await page.goto("/report/design-system-preview");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-ui-gallery="tooltip"]')).toBeVisible();
    await expect(page).toHaveScreenshot("ui-primitives-gallery.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
