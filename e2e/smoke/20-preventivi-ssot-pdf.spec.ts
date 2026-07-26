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

test("staff preventivo preview route loads shell", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/preventivi");
  await expect(page.getByRole("heading", { name: "Preventivi" })).toBeVisible({ timeout: 30_000 });

  const pdfButton = page.getByRole("button", { name: /PDF|Apri documento/i }).first();
  const hasPdf = await pdfButton.isVisible().catch(() => false);
  if (!hasPdf) {
    test.skip(true, "Nessun preventivo con azione PDF visibile in smoke.");
    return;
  }

  await pdfButton.click();
  await expect(page).toHaveURL(/\/documenti\/preventivo\/[^/]+\/preview/, { timeout: 30_000 });
  await expect(page.getByText(/Preventivo|Documento/i).first()).toBeVisible({ timeout: 15_000 });
});
