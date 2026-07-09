import { test, expect } from "@playwright/test";

/**
 * Visual regression scaffold — baseline Sprint 3+.
 * Skip finché non ci sono snapshot committati.
 */
test.describe("Report Design System preview", () => {
  test.skip(!process.env.REPORT_DS_VISUAL_BASELINE, "Set REPORT_DS_VISUAL_BASELINE=1 to run visual gate");

  test.use({ viewport: { width: 1280, height: 720 } });

  test("design-system-preview page", async ({ page }) => {
    await page.goto("/report/design-system-preview");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("report-ds-preview.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
