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

test("notifica magazzino: openRicambio apre dettaglio senza full reload", async ({ page }) => {
  const creds = adminCredentials();
  await loginViaUi(page, creds);

  const codice = uniqueRicambioCodice("NOTIF");
  const { id: ricambioId } = await createRicambioLenientSmoke(page, codice);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);

  let beforeUnloadFired = false;
  await page.evaluate(() => {
    window.addEventListener("beforeunload", () => {
      (window as unknown as { __notifBeforeUnload?: boolean }).__notifBeforeUnload = true;
    });
  });

  const href = `/magazzino?openRicambio=${encodeURIComponent(ricambioId)}&source=dashboard`;
  await page.evaluate((targetHref) => {
    const a = document.createElement("a");
    a.href = targetHref;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, href);

  await expect(page).toHaveURL(/openRicambio=/, { timeout: 20_000 });
  await expect(page.getByText(codice, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });

  const fired = await page.evaluate(
    () => (window as unknown as { __notifBeforeUnload?: boolean }).__notifBeforeUnload === true,
  );
  expect(fired).toBe(false);
});
