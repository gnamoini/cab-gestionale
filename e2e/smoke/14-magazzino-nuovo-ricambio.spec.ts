import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { createRicambioLenientSmoke, uniqueRicambioCodice } from "../helpers/magazzino-ricambio";
import { test } from "@playwright/test";

const hasSmokeCreds = Boolean(
  process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
);

test.describe.configure({ mode: "serial" });

test.beforeEach(({ page }) => {
  test.skip(!hasSmokeCreds, "SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD richiesti");
  attachConsoleGuards(page);
});

test("magazzino: nuovo ricambio lenient smoke", async ({ page }) => {
  const creds = adminCredentials();
  await loginViaUi(page, creds);
  const codice = uniqueRicambioCodice();
  await createRicambioLenientSmoke(page, codice);
});
