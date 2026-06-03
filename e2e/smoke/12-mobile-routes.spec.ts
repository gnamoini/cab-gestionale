import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

const MOBILE_ROUTES = ["/dashboard", "/lavorazioni", "/magazzino", "/dipendenti"] as const;

for (const route of MOBILE_ROUTES) {
  test(`mobile ${route} main has no horizontal overflow`, async ({ page }) => {
    attachConsoleGuards(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginViaUi(page, adminCredentials());
    await page.goto(route);

    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return { ok: false, reason: "missing-main" };
      return {
        ok: main.scrollWidth <= main.clientWidth + 2,
        scrollWidth: main.scrollWidth,
        clientWidth: main.clientWidth,
      };
    });

    expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  });
}
