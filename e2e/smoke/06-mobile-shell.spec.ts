import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("mobile shell has no horizontal overflow on main", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  const overflow = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return { ok: true };
    return { ok: main.scrollWidth <= main.clientWidth + 2 };
  });
  expect(overflow.ok).toBe(true);
});
