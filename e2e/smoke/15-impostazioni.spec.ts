import type { Page } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function openParametriEconomici(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Parametri economici", exact: true }).click();
  await expect(page.locator("#config-costo-orario-default")).toBeVisible({ timeout: 15_000 });
}

async function saveSettingsAndWait(page: Page): Promise<void> {
  const saveBtn = page.getByRole("button", { name: /^Salva( modifiche)?$/ });
  await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
  await saveBtn.click();
  await expect(page.getByRole("button", { name: "Salvataggio…" })).toBeHidden({ timeout: 30_000 });
  await expect(saveBtn).toBeDisabled({ timeout: 5_000 });
}

test("admin opens impostazioni and saves parametri economici", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/impostazioni");
  await expect(page.getByRole("heading", { name: "Impostazioni" })).toBeVisible({ timeout: 30_000 });
  await openParametriEconomici(page);

  const input = page.locator("#config-costo-orario-default");
  await expect(input).toBeVisible({ timeout: 15_000 });
  const before = await input.inputValue();
  const next = before === "50" ? "51" : "50";
  await input.fill(next);
  await input.blur();

  await saveSettingsAndWait(page);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Impostazioni" })).toBeVisible({ timeout: 30_000 });
  await openParametriEconomici(page);
  await expect(page.locator("#config-costo-orario-default")).toHaveValue(next, { timeout: 30_000 });

  // Ripristina valore originale per non sporcare l'ambiente smoke
  await page.locator("#config-costo-orario-default").fill(before);
  await saveSettingsAndWait(page);
});

test("unsaved changes dialog blocks navigation away from impostazioni", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/impostazioni");
  await expect(page.getByRole("heading", { name: "Impostazioni" })).toBeVisible({ timeout: 30_000 });
  await openParametriEconomici(page);

  const input = page.locator("#config-costo-orario-default");
  await expect(input).toBeVisible({ timeout: 15_000 });
  const before = await input.inputValue();
  const draft = before === "49" ? "48.5" : "49";
  await input.fill(draft);

  await page.getByRole("link", { name: "Dashboard" }).first().click();
  const unsavedDialog = page.getByRole("dialog");
  await expect(unsavedDialog).toBeVisible({ timeout: 10_000 });
  await expect(unsavedDialog.getByRole("heading", { name: "Modifiche non salvate" })).toBeVisible();

  await page.getByRole("button", { name: "Torna indietro" }).click();
  await expect(page).toHaveURL(/\/impostazioni/);
  await expect(input).toHaveValue(draft);

  await page.getByRole("button", { name: "Annulla modifiche" }).first().click();
  const cancelDialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Annullare modifiche?" }) });
  await expect(cancelDialog).toBeVisible({ timeout: 5_000 });
  await cancelDialog.getByRole("button", { name: "Annulla modifiche" }).click();
  await expect(input).toHaveValue(before, { timeout: 10_000 });
});
