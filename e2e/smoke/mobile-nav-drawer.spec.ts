import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

async function swipeOpenNavDrawer(
  page: import("@playwright/test").Page,
  opts: { startX: number; endX: number; y?: number; target?: string },
) {
  const y = opts.y ?? 420;
  await page.evaluate(
    ({ startX, endX, y, target }) => {
      const el =
        target != null
          ? (document.querySelector(target) as EventTarget | null)
          : null;
      const touchTarget = el ?? document.body;

      const mkTouch = (x: number) =>
        new Touch({
          identifier: 1,
          target: touchTarget instanceof Element ? touchTarget : document.body,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
        });

      document.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: [mkTouch(startX)],
          targetTouches: [mkTouch(startX)],
        }),
      );

      for (let x = startX + 16; x <= endX; x += 32) {
        document.dispatchEvent(
          new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [mkTouch(x)],
            targetTouches: [mkTouch(x)],
          }),
        );
      }

      document.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          cancelable: true,
          touches: [],
          changedTouches: [mkTouch(endX)],
        }),
      );
    },
    { startX: opts.startX, endX: opts.endX, y, target: opts.target },
  );
}

test("mobile nav drawer opens via left-edge swipe on dashboard", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();

  await swipeOpenNavDrawer(page, { startX: 2, endX: 180 });

  const dialog = page.getByRole("dialog", { name: "Menu principale" });
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(300);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Chiudi" }).click();
  await expect(dialog).not.toBeVisible();
});

test("mobile nav drawer opens via left-edge swipe over table cell", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni");
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();

  const hasTableCell = await page.evaluate(() => {
    const cell = document.querySelector("table td");
    return cell != null;
  });
  test.skip(!hasTableCell, "No table cell on lavorazioni page");

  await swipeOpenNavDrawer(page, {
    startX: 5,
    endX: 200,
    target: "table td",
  });

  const dialog = page.getByRole("dialog", { name: "Menu principale" });
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await dialog.getByRole("button", { name: "Chiudi" }).click();
  await expect(dialog).not.toBeVisible();
});
