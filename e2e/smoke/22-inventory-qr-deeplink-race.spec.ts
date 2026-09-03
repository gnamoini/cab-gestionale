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

test("deep-link openRicambio: lista lenta → modale e URL ripulito", async ({ page }) => {
  await loginViaUi(page, adminCredentials());
  const codice = uniqueRicambioCodice("QR-RACE");
  const created = await createRicambioLenientSmoke(page, codice);
  test.skip(!created.id, "Creazione ricambio smoke fallita");

  let releaseListDelay: (() => void) | undefined;
  const listGate = new Promise<void>((resolve) => {
    releaseListDelay = resolve;
  });

  await page.route("**/rest/v1/magazzino_ricambi**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await listGate;
    await route.continue();
  });

  const href = `/magazzino?openRicambio=${encodeURIComponent(created.id)}&source=qr`;
  const navigation = page.goto(href);

  await expect(page.getByText("Apertura ricambio", { exact: false })).toBeVisible({ timeout: 15_000 });

  releaseListDelay?.();
  await navigation;

  await expect(page.getByRole("dialog").filter({ hasText: "Scheda ricambio" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page).not.toHaveURL(/openRicambio=/, { timeout: 20_000 });
  await expect(page.getByText(codice, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
});

test("deep-link openRicambio: reload riapre modale", async ({ page }) => {
  await loginViaUi(page, adminCredentials());
  const codice = uniqueRicambioCodice("QR-RLD");
  const created = await createRicambioLenientSmoke(page, codice);
  test.skip(!created.id, "Creazione ricambio smoke fallita");

  const href = `/magazzino?openRicambio=${encodeURIComponent(created.id)}&source=qr`;
  await page.goto(href);
  await expect(page.getByRole("dialog").filter({ hasText: "Scheda ricambio" })).toBeVisible({
    timeout: 60_000,
  });

  await page.reload();
  await page.goto(href);
  await expect(page.getByRole("dialog").filter({ hasText: "Scheda ricambio" })).toBeVisible({
    timeout: 60_000,
  });
});
