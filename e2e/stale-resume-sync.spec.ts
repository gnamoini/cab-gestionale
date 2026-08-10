import { attachConsoleGuards } from "./helpers/console";
import { adminCredentials, loginViaUi } from "./fixtures/auth";
import { test, expect } from "@playwright/test";

test("magazzino resume shows banner after simulated drift dirty", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  await page.goto("/magazzino");
  await expect(page.getByRole("heading", { name: "Magazzino" })).toBeVisible({ timeout: 45_000 });

  await page.waitForFunction(() => Boolean(window.__CAB_E2E_DIRTY__?.markDirty));

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await page.evaluate(() => {
    window.__CAB_E2E_DIRTY__?.markDirty({
      domain: "magazzino",
      table: "magazzino_ricambi",
      entityId: null,
      type: "update",
      source: "realtime",
    });
  });

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(page.getByText("Magazzino aggiornato")).toBeVisible({ timeout: 10_000 });
});
