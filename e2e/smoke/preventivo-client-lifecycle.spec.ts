import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("preventivi list shows stato column", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/preventivi");
  await expect(page.getByRole("heading", { name: "Preventivi" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("columnheader", { name: /Stato/i })).toBeVisible({ timeout: 15_000 });
});

test("client lavorazione detail may show preventivo section", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni-clienti");
  const firstLink = page.locator('a[href^="/lavorazioni-clienti/"]').first();
  const hasRow = await firstLink.isVisible().catch(() => false);
  if (!hasRow) {
    test.skip(true, "Nessuna lavorazione cliente in smoke.");
    return;
  }
  await firstLink.click();
  await expect(page.getByRole("heading", { name: /Preventivo|Dettaglio/i }).first()).toBeVisible({
    timeout: 30_000,
  });
});
