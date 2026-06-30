import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("legacy /ddt redirects to preventivi", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/ddt");
  await expect(page).toHaveURL(/\/preventivi(?:\?|$)/, { timeout: 30_000 });
});

test("admin can open DDT drawer from preventivi row", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/preventivi");
  await expect(page.getByRole("heading", { name: "Preventivi" })).toBeVisible({ timeout: 30_000 });

  const ddtButton = page.getByRole("button", { name: /Genera DDT|Apri DDT/i }).first();
  const hasDdtAction = await ddtButton.isVisible().catch(() => false);
  if (!hasDdtAction) {
    test.skip(true, "Nessun preventivo con azione DDT visibile in smoke.");
    return;
  }

  await ddtButton.click();
  await expect(page.getByRole("dialog", { name: "Dettaglio DDT" })).toBeVisible({ timeout: 30_000 });

  const printBtn = page.getByRole("button", { name: "Stampa PDF" });
  if (await printBtn.isVisible().catch(() => false)) {
    await printBtn.click();
  }
});
