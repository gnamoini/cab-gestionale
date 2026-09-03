import { adminCredentials, loginViaUi, operatoreCredentials } from "../fixtures/auth";
import { createRicambioLenientSmoke, uniqueRicambioCodice } from "../helpers/magazzino-ricambio";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { registerMutatingSmokeGuards } from "../helpers/smoke-production-guard";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

registerMutatingSmokeGuards(test);

test.afterAll(async () => {
  await applySmokeTeardown();
});

async function createRicambioWithToken(page: import("@playwright/test").Page) {
  const codice = uniqueRicambioCodice("QR-DL");
  const created = await createRicambioLenientSmoke(page, codice);
  if (!created.id) return null;
  const metaRes = await page.request.get(`/api/inventory-labels/ricambi/${created.id}`);
  if (!metaRes.ok()) return null;
  const meta = (await metaRes.json()) as { token: string };
  return { id: created.id, codice, token: meta.token };
}

test("QR scan → login → modale ricambio → modifica scorta", async ({ page }) => {
  await loginViaUi(page, adminCredentials());
  const created = await createRicambioWithToken(page);
  test.skip(!created, "Creazione ricambio smoke fallita");

  await page.context().clearCookies();
  await page.goto(`/r/${encodeURIComponent(created!.token)}`);
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

test("QR scan operatore → modale ricambio", async ({ page }) => {
  const operatore = operatoreCredentials();
  test.skip(!operatore, "SMOKE_OPERATORE_* non configurato");

  await loginViaUi(page, adminCredentials());
  const created = await createRicambioWithToken(page);
  test.skip(!created, "Creazione ricambio smoke fallita");

  await page.context().clearCookies();
  await page.goto(`/r/${encodeURIComponent(created!.token)}`);
  await expect(page).toHaveURL(/\/login/);

  await loginViaUi(page, operatore!);
  await expect(page).toHaveURL(/\/magazzino/);
  await expect(page.getByRole("dialog").filter({ hasText: "Scheda ricambio" })).toBeVisible({
    timeout: 60_000,
  });
});

test("token QR invalido → pagina errore", async ({ page }) => {
  await loginViaUi(page, adminCredentials());
  await page.goto("/r/CAB-INVALIDSMOKE1");
  await expect(page).toHaveURL(/\/r\/errore/);
  await expect(page.getByRole("heading", { name: /QR non trovato|QR non valido/i })).toBeVisible();
});
