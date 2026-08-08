import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect, type Page } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

type WaterfallSummary = {
  requestCount: number;
  duplicateCount: number;
  serializedChainCount: number;
  byKind: Record<string, number>;
};

async function collectWaterfall(page: Page): Promise<WaterfallSummary | null> {
  return page.evaluate(() => {
    const w = (window as Window & { __cabNavHttpWaterfall?: WaterfallSummary }).__cabNavHttpWaterfall;
    return w ?? null;
  });
}

test.describe("mobile ios navigation perf", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
  });

  test("dashboard → mezzi → lavorazioni → magazzino without PTR UI", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto("/dashboard");
    await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 60_000 });

    await page.goto("/mezzi");
    await expect(page.locator("main")).toBeVisible({ timeout: 60_000 });

    await page.goto("/lavorazioni");
    await expect(page.locator("main").getByText("Lavorazioni", { exact: false })).toBeVisible({
      timeout: 90_000,
    });

    await page.goto("/magazzino");
    await expect(page.locator("main").getByText("Magazzino", { exact: false })).toBeVisible({
      timeout: 90_000,
    });

    await expect(page.locator("[data-pull-to-refresh]")).toHaveCount(0);
    const ptrIndicator = page.locator('[class*="pull-to-refresh"], [data-testid="pull-to-refresh"]');
    await expect(ptrIndicator).toHaveCount(0);
  });

  test("pull down at scroll top does not reload page", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/dashboard");
    await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 60_000 });

    const urlBefore = page.url();
    const main = page.locator("main.gestionale-scroll-y");
    await main.evaluate((el) => {
      el.scrollTop = 0;
    });

    const box = await main.boundingBox();
    if (!box) throw new Error("main scrollport missing");
    const startX = box.x + box.width / 2;
    const startY = box.y + 40;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 120, { steps: 8 });
    await page.mouse.up();

    await page.waitForTimeout(500);
    expect(page.url()).toBe(urlBefore);
    await expect(page.locator('[class*="pull-to-refresh"]')).toHaveCount(0);
  });

  test("navigation records HTTP waterfall when diagnostics enabled", async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      (window as unknown as { __cabForceNavDiagnostics?: boolean }).__cabForceNavDiagnostics = true;
    });

    await page.goto("/dashboard");
    await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 60_000 });
    await page.goto("/mezzi");
    await expect(page.locator("main")).toBeVisible({ timeout: 60_000 });

    const waterfall = await collectWaterfall(page);
    if (waterfall) {
      expect(waterfall.duplicateCount).toBeLessThan(5);
    }
  });
});
