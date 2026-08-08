import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

const CONTENT_REVEAL_DURATION_MS = 150;
const OPACITY_TOLERANCE = 0.08;
const DURATION_TOLERANCE_MS = 80;

async function waitForContentReveal(page: import("@playwright/test").Page) {
  const reveal = page.getByTestId("content-reveal").first();
  await expect(reveal).toBeVisible({ timeout: 60_000 });
  return reveal;
}

async function sampleRevealOpacity(page: import("@playwright/test").Page, ms = 350) {
  return page.evaluate(async (durationMs) => {
    const el = document.querySelector('[data-testid="content-reveal"]');
    if (!el) return null;
    const read = () => parseFloat(getComputedStyle(el).opacity);
    const points: { t: number; opacity: number }[] = [];
    const start = performance.now();
    while (performance.now() - start < durationMs) {
      points.push({ t: performance.now() - start, opacity: read() });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return {
      points,
      finalOpacity: read(),
      runningAnimations: el.getAnimations().filter((a) => a.playState === "running").length,
    };
  }, ms);
}

test.describe("content reveal transitions", () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
  });

  test("magazzino: mount fades opacity toward 1 within ~150ms", async ({ page }) => {
    await page.goto("/magazzino");
    await expect(page.getByTestId("page-ready-toolbar")).toBeVisible({ timeout: 60_000 });
    await waitForContentReveal(page);

    const sample = await sampleRevealOpacity(page);
    expect(sample).not.toBeNull();
    if (!sample) return;

    const early = sample.points.find((p) => p.t < 40);
    const late = sample.points.find((p) => p.t >= CONTENT_REVEAL_DURATION_MS - 20);
    if (early && late) {
      expect(early.opacity).toBeLessThan(1 - OPACITY_TOLERANCE);
      expect(late.opacity).toBeGreaterThan(1 - OPACITY_TOLERANCE);
    }
    expect(sample.finalOpacity).toBeGreaterThan(1 - OPACITY_TOLERANCE);

    const settleMs = await page.evaluate(async () => {
      const el = document.querySelector('[data-testid="content-reveal"]');
      if (!el) return -1;
      const start = performance.now();
      while (performance.now() - start < 500) {
        const opacity = parseFloat(getComputedStyle(el).opacity);
        const running = el.getAnimations().some((a) => a.playState === "running");
        if (opacity >= 0.99 && !running) return performance.now() - start;
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }
      return 500;
    });
    expect(settleMs).toBeGreaterThanOrEqual(0);
    expect(settleMs).toBeLessThan(CONTENT_REVEAL_DURATION_MS + DURATION_TOLERANCE_MS + 100);
  });

  test("magazzino: refetch does not restart reveal on the same node", async ({ page }) => {
    await page.goto("/magazzino");
    await expect(page.getByTestId("page-ready-toolbar")).toBeVisible({ timeout: 60_000 });
    await waitForContentReveal(page);

    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="content-reveal"]');
      if (!el) return false;
      const opacity = parseFloat(getComputedStyle(el).opacity);
      const running = el.getAnimations().some((a) => a.playState === "running");
      return opacity >= 0.99 && !running;
    });

    const beforeRefetch = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="content-reveal"]');
      if (!el) return null;
      return {
        id: el.getAttribute("data-content-reveal-mount") ?? "stable",
        opacity: parseFloat(getComputedStyle(el).opacity),
        animationName: getComputedStyle(el).animationName,
      };
    });
    expect(beforeRefetch?.opacity).toBeGreaterThan(0.9);

    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(600);

    const afterRefetch = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="content-reveal"]');
      if (!el) return null;
      return {
        opacity: parseFloat(getComputedStyle(el).opacity),
        runningAnimations: el.getAnimations().filter((a) => a.playState === "running").length,
      };
    });

    expect(afterRefetch?.opacity).toBeGreaterThan(0.9);
    expect(afterRefetch?.runningAnimations).toBe(0);
  });

  test("rapid navigation does not leave content stuck at low opacity", async ({ page }) => {
    await page.goto("/dashboard");
    await page.goto("/magazzino");
    await page.goto("/mezzi");
    await page.waitForTimeout(400);

    const stuck = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-testid="content-reveal"], .cab-content-reveal');
      return [...nodes].some((el) => parseFloat(getComputedStyle(el).opacity) < 0.9);
    });
    expect(stuck).toBe(false);
  });

  test("dashboard: page content reveal is interactive during fade", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("page-ready-toolbar")).toBeVisible({ timeout: 60_000 });

    const pageReveal = page.locator('[data-content-reveal="page"]');
    await expect(pageReveal).toBeVisible();

    const pointerOk = await page.evaluate(() => {
      const el = document.querySelector('[data-content-reveal="page"]');
      if (!el) return false;
      const pe = getComputedStyle(el).pointerEvents;
      return pe !== "none";
    });
    expect(pointerOk).toBe(true);
  });
});
