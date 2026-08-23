import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("magazzino shows stale banner after remote magazzino change", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  await page.goto("/magazzino");
  await expect(page.getByRole("heading", { name: "Magazzino" })).toBeVisible({ timeout: 45_000 });

  await page.waitForFunction(() => Boolean(window.__CAB_E2E_DIRTY__?.markDirty));

  await page.evaluate(() => {
    window.__CAB_E2E_DIRTY__?.markDirty({
      domain: "magazzino",
      table: "magazzino_ricambi",
      entityId: "11111111-1111-4111-8111-111111111111",
      type: "create",
      source: "realtime",
    });
  });

  await expect(page.getByText("Nuovi dati disponibili")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Aggiorna pagina" })).toBeVisible();
});
