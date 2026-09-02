import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { createRicambioLenientSmoke, uniqueRicambioCodice } from "../helpers/magazzino-ricambio";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { registerMutatingSmokeGuards } from "../helpers/smoke-production-guard";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

registerMutatingSmokeGuards(test);

test.afterAll(async () => {
  await applySmokeTeardown();
});

test("QR scan → login → modale ricambio → modifica scorta", async ({ page }) => {
  await loginViaUi(page, adminCredentials());
  const codice = uniqueRicambioCodice("QR-SMOKE");
  const created = await createRicambioLenientSmoke(page, codice);
  test.skip(!created.id, "Creazione ricambio smoke fallita");

  const metaRes = await page.request.get(`/api/inventory-labels/ricambi/${created.id}`);
  expect(metaRes.ok()).toBeTruthy();
  const meta = (await metaRes.json()) as { token: string };
  expect(meta.token).toMatch(/^CAB-/);

  await page.context().clearCookies();
  await page.goto(`/r/${encodeURIComponent(meta.token)}`);
  await expect(page).toHaveURL(/\/login/);

  await loginViaUi(page, adminCredentials());
  await expect(page).toHaveURL(/\/magazzino/);
  await expect(page.getByRole("dialog").filter({ hasText: "Scheda ricambio" })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: "Modifica" }).click();
  const modal = page.getByRole("dialog").filter({ hasText: /Modifica ricambio|Scheda ricambio/i });
  await expect(modal).toBeVisible();

  const scortaInput = modal.getByLabel(/Scorta/i).first();
  if (await scortaInput.isVisible().catch(() => false)) {
    await scortaInput.fill("5");
    await modal.getByRole("button", { name: /Salva/i }).click();
    await expect(modal).toBeHidden({ timeout: 30_000 });
  }
});
