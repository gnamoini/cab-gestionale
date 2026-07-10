import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { createRicambioLenientSmoke, uniqueRicambioCodice } from "../helpers/magazzino-ricambio";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { expect, test } from "@playwright/test";

const hasSmokeCreds = Boolean(
  process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
);

const SEED_SMOKE_CODICE = "MAGAZZINO-SEED-NOT-FOUND-001";

test.describe.configure({ mode: "serial" });

test.beforeEach(({ page }) => {
  test.skip(!hasSmokeCreds, "SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD richiesti");
  attachConsoleGuards(page);
});

test.afterAll(async () => {
  await applySmokeTeardown();
});

async function gotoMagazzinoReady(page: import("@playwright/test").Page) {
  const listLoaded = page.waitForResponse(
    (res) =>
      res.url().includes("/rest/v1/magazzino_ricambi") && res.request().method() === "GET" && res.ok(),
    { timeout: 60_000 },
  );
  await page.goto("/magazzino");
  await expect(page).toHaveURL(/\/magazzino/);
  await listLoaded.catch(() => undefined);
}

async function openNuovoRicambioModal(page: import("@playwright/test").Page) {
  const newBtn = page.getByRole("button", { name: /\+?\s*Nuovo(\s+ricambio)?/i });
  await expect(newBtn).toBeEnabled({ timeout: 60_000 });
  await newBtn.click();
  const modal = page.getByRole("dialog").filter({ hasText: "Nuovo ricambio" });
  await expect(modal).toBeVisible();
  return modal;
}

test("magazzino: nuovo ricambio lenient smoke", async ({ page }) => {
  const creds = adminCredentials();
  await loginViaUi(page, creds);
  const codice = uniqueRicambioCodice();
  await createRicambioLenientSmoke(page, codice);
});

test("magazzino: seed codice da ricerca code-like senza risultati", async ({ page }) => {
  const creds = adminCredentials();
  await loginViaUi(page, creds);
  await gotoMagazzinoReady(page);

  const search = page.getByRole("searchbox", { name: /cerca in magazzino/i });
  await search.fill(SEED_SMOKE_CODICE);
  await search.press("Enter");
  await page.waitForTimeout(400);

  const modal = await openNuovoRicambioModal(page);
  const codiceInput = modal.locator("#magazzino-ricambio-codice-oe");
  await expect(codiceInput).toHaveValue(SEED_SMOKE_CODICE, { timeout: 15_000 });
  await page.keyboard.press("Escape");
});

test("magazzino: ricerca descrittiva non precompila codice", async ({ page }) => {
  const creds = adminCredentials();
  await loginViaUi(page, creds);
  await gotoMagazzinoReady(page);

  const search = page.getByRole("searchbox", { name: /cerca in magazzino/i });
  await search.fill("filtro olio smoke");
  await search.press("Enter");
  await page.waitForTimeout(400);

  const modal = await openNuovoRicambioModal(page);
  const codiceInput = modal.locator("#magazzino-ricambio-codice-oe");
  await expect(codiceInput).toHaveValue("", { timeout: 15_000 });

  await page.keyboard.press("Escape");
});
