import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { createRicambioLenientSmoke, uniqueRicambioCodice } from "../helpers/magazzino-ricambio";
import { test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(({ page }) => {
  attachConsoleGuards(page);
});

test("magazzino: nuovo ricambio lenient smoke", async ({ page }) => {
  const creds = adminCredentials();
  await loginViaUi(page, creds);
  const codice = uniqueRicambioCodice();
  await createRicambioLenientSmoke(page, codice);
});
