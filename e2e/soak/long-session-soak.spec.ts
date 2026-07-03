import { test, expect } from "@playwright/test";

/**
 * PR-8 — long-session soak gate (CI optional / manual).
 * Set SOAK_MINUTES env (default 5 in CI, 30 manual).
 */
const SOAK_MINUTES = Number(process.env.SOAK_MINUTES ?? "5");
const HEAP_DELTA_MB_LIMIT = 50;

test.describe("long-session soak", () => {
  test.skip(!process.env.SOAK_BASE_URL, "Set SOAK_BASE_URL to run soak gate");

  test(`heap delta < ${HEAP_DELTA_MB_LIMIT}MB over ${SOAK_MINUTES}m`, async ({ page }) => {
    const baseUrl = process.env.SOAK_BASE_URL!;
    await page.goto(`${baseUrl}/lavorazioni`, { waitUntil: "domcontentloaded" });

    const startHeap = await page.evaluate(() => {
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      return mem?.usedJSHeapSize ?? 0;
    });

    const endMs = Date.now() + SOAK_MINUTES * 60_000;
    while (Date.now() < endMs) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(15_000);
    }

    const endHeap = await page.evaluate(() => {
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      return mem?.usedJSHeapSize ?? 0;
    });

    if (startHeap > 0 && endHeap > 0) {
      const deltaMb = (endHeap - startHeap) / 1048576;
      expect(deltaMb).toBeLessThan(HEAP_DELTA_MB_LIMIT);
    }
  });
});
