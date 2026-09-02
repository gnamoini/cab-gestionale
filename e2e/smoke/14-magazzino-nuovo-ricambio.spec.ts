import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { createRicambioLenientSmoke, uniqueRicambioCodice } from "../helpers/magazzino-ricambio";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { registerMutatingSmokeGuards } from "../helpers/smoke-production-guard";
import { test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

registerMutatingSmokeGuards(test);

test.afterAll(async () => {
  await applySmokeTeardown();
});

test("magazzino: nuovo ricambio lenient smoke", async ({ page }) => {
  const creds = adminCredentials();
  await loginViaUi(page, creds);
  const codice = uniqueRicambioCodice();
  await createRicambioLenientSmoke(page, codice);
});
