/**
 * Smoke: probe page reachable and exposes required data-probe-id cells.
 * Does NOT replicate Windows installed PWA compositor — layout smoke only.
 *
 * Run: NEXT_PUBLIC_PWA_RENDER_AUDIT=1 npx playwright test e2e/diag/pwa-render-probe.spec.ts
 */
import { test, expect } from "@playwright/test";

test.describe("pwa render probe", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_PWA_RENDER_AUDIT !== "1",
      "Set NEXT_PUBLIC_PWA_RENDER_AUDIT=1 to run probe smoke",
    );
  });

  test("probe page exposes 12 audit cells", async ({ page }) => {
    await page.goto("/sicurezza/pwa-render-probe");
    await expect(page.getByText("Audit rendering PWA")).toBeVisible();

    const ids = [
      "toolbar-blur",
      "toast-glass",
      "modal-blur",
      "svg-bar-gradient",
      "svg-line-glow",
      "opacity-transform",
      "clip-opacity",
      "mask-gradient",
      "radial-gradient",
      "pulse-skeleton",
      "svg-plain",
      "html-solid",
    ];

    for (const id of ids) {
      await expect(page.locator(`[data-probe-id="${id}"]`)).toBeVisible();
    }
  });
});
