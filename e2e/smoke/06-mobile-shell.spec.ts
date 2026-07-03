import { attachConsoleGuards } from "../helpers/console";
import { auditHorizontalOverflow } from "../helpers/horizontal-overflow";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

const OVERFLOW_VIEWPORTS = [
  { width: 390, height: 844, label: "390" },
  { width: 724, height: 900, label: "724" },
  { width: 900, height: 900, label: "900" },
  { width: 1362, height: 900, label: "1362" },
] as const;

for (const vp of OVERFLOW_VIEWPORTS) {
  test(`shell has no horizontal overflow on dashboard at ${vp.label}px`, async ({ page }) => {
    attachConsoleGuards(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await loginViaUi(page, adminCredentials());
    await page.goto("/dashboard");
    await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 30_000 });

    const overflow = await auditHorizontalOverflow(page);
    expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  });
}

test("wide viewport with narrow content column uses mobile shell tier on dashboard", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");

  await page.evaluate(() => {
    const shell = document.querySelector(".cab-app-shell");
    const col = document.querySelector(".cab-app-shell > div.flex-1");
    if (shell instanceof HTMLElement) {
      shell.style.width = "360px";
      shell.style.maxWidth = "360px";
    }
    if (col instanceof HTMLElement) {
      col.style.width = "360px";
      col.style.maxWidth = "360px";
    }
    window.dispatchEvent(new Event("resize"));
  });

  await expect
    .poll(async () => page.locator(".cab-app-shell").getAttribute("data-gestionale-shell-tier"))
    .toBe("mobile");

  await expect(page.getByTestId("smoke-nav-drawer-open")).toBeVisible();
  await expect(page.locator(".cab-sidebar")).toBeHidden();

  const kpiSection = page.locator('section[aria-label="Settimana corrente (lun–oggi)"]');
  await expect(kpiSection).toBeVisible({ timeout: 45_000 });
  const kpiGrid = kpiSection.locator(".grid").first();
  const columns = await kpiGrid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(columns.split(" ").length).toBeLessThanOrEqual(1);
});
