import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("dashboard stale banner disappears after navigation", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 45_000 });

  await page.waitForFunction(() => Boolean(window.__CAB_E2E_DIRTY__?.markDirty));

  await page.evaluate(() => {
    window.__CAB_E2E_DIRTY__?.markDirty({
      domain: "dashboard",
      table: "log_modifiche",
      entityId: null,
      type: "update",
      source: "realtime",
    });
  });

  await expect(page.getByText("Dashboard non aggiornata")).toBeVisible({ timeout: 10_000 });

  await page.goto("/magazzino");
  await expect(page.getByRole("heading", { name: "Magazzino" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Dashboard non aggiornata")).not.toBeVisible();
  await expect(page.getByText("Nuovi dati disponibili")).not.toBeVisible();
});
