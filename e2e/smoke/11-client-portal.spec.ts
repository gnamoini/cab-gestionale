import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, clientCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

/** UUID inesistente — verifica che il portale non esponga dati sensibili. */
const ALIEN_LAVORAZIONE_ID = "00000000-0000-0000-0000-000000000001";

test("admin can open client lavorazioni list", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni-clienti");
  await expect(page).toHaveURL(/lavorazioni-clienti/, { timeout: 30_000 });
});

test("client portal denies unknown lavorazione id", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto(`/lavorazioni-clienti/${ALIEN_LAVORAZIONE_ID}`);
  await expect(
    page.getByText(/non esiste o non è accessibile|non trovata|Lavorazione non trovata/i),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/00000000-0000-0000-0000-000000000001/)).not.toBeVisible();
});

test("client user cannot open alien lavorazione id", async ({ page }) => {
  const client = clientCredentials();
  const alienId = process.env.SMOKE_CLIENT_LAVORAZIONE_ALIEN_ID?.trim();
  test.skip(!client || !alienId, "SMOKE_CLIENT_* / SMOKE_CLIENT_LAVORAZIONE_ALIEN_ID not set");
  attachConsoleGuards(page);
  await loginViaUi(page, client!);
  await page.goto(`/lavorazioni-clienti/${encodeURIComponent(alienId!)}`);
  await expect(
    page.getByText(/non esiste o non è accessibile|non trovata|Lavorazione non trovata|Non hai permesso/i),
  ).toBeVisible({ timeout: 30_000 });
});
