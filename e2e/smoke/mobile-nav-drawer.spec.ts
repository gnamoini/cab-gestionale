import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect, type Page } from "@playwright/test";

async function pointerSwipe(
  page: Page,
  opts: { startX: number; endX: number; startY?: number; endY?: number; target?: string },
) {
  const startY = opts.startY ?? 420;
  const endY = opts.endY ?? startY;
  await page.evaluate(
    ({ startX, endX, startY, endY, target }) => {
      const el =
        target != null
          ? (document.querySelector(target) as Element | null)
          : null;
      const touchTarget = el ?? document.body;

      const mk = (x: number, y: number, type: string) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
          buttons: type === "pointerup" ? 0 : 1,
        });

      touchTarget.dispatchEvent(mk(startX, startY, "pointerdown"));
      const dx = endX - startX;
      const dy = endY - startY;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 32));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        touchTarget.dispatchEvent(
          mk(startX + dx * t, startY + dy * t, "pointermove"),
        );
      }
      touchTarget.dispatchEvent(mk(endX, endY, "pointerup"));
    },
    {
      startX: opts.startX,
      endX: opts.endX,
      startY,
      endY,
      target: opts.target,
    },
  );
}

async function openDrawerViaHamburger(page: Page) {
  await page.getByTestId("smoke-nav-drawer-open").click();
  await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({
    timeout: 5_000,
  });
}

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
});

test("edge swipe x=0 opens drawer", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
  await pointerSwipe(page, { startX: 0, endX: 180 });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 5_000 });
});

test("edge swipe x=10 opens drawer", async ({ page }) => {
  await page.goto("/dashboard");
  await pointerSwipe(page, { startX: 10, endX: 180 });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 5_000 });
});

test("edge swipe x=23 opens drawer", async ({ page }) => {
  await page.goto("/dashboard");
  await pointerSwipe(page, { startX: 23, endX: 180 });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 5_000 });
});

test("edge swipe x=24 opens drawer (boundary inclusive)", async ({ page }) => {
  await page.goto("/dashboard");
  await pointerSwipe(page, { startX: 24, endX: 180 });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 5_000 });
});

test("edge swipe x=25 does not open drawer", async ({ page }) => {
  await page.goto("/dashboard");
  await pointerSwipe(page, { startX: 25, endX: 200 });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible({ timeout: 2_000 });
});

test("short edge swipe does not open drawer", async ({ page }) => {
  await page.goto("/dashboard");
  await pointerSwipe(page, { startX: 10, endX: 30 });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible({ timeout: 2_000 });
});

test("vertical swipe from edge does not open drawer", async ({ page }) => {
  await page.goto("/dashboard");
  await pointerSwipe(page, { startX: 10, endX: 10, startY: 200, endY: 500 });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible({ timeout: 2_000 });
});

test("swipe dismiss closes drawer", async ({ page }) => {
  await page.goto("/dashboard");
  await openDrawerViaHamburger(page);
  const panel = page.locator("#cab-mobile-nav-drawer");
  await pointerSwipe(page, { startX: 200, endX: 20, target: "#cab-mobile-nav-drawer" });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible({ timeout: 5_000 });
  await expect(panel).toHaveCount(0);
});

test("backdrop tap closes drawer", async ({ page }) => {
  await page.goto("/dashboard");
  await openDrawerViaHamburger(page);
  await page.getByRole("button", { name: "Chiudi menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
});

test("edge swipe over table cell still opens from edge zone", async ({ page }) => {
  await page.goto("/lavorazioni");
  const hasTableCell = await page.evaluate(() => document.querySelector("table td") != null);
  test.skip(!hasTableCell, "No table cell on lavorazioni page");
  await pointerSwipe(page, { startX: 5, endX: 200, target: "table td" });
  await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 5_000 });
});
