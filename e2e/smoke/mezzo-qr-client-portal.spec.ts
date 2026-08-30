import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, clientCredentials, loginViaUi } from "../fixtures/auth";
import { expect, test } from "@playwright/test";

const hasAdminCreds = Boolean(
  process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
);

test("cliente: QR mezzo non associato → accesso negato", async ({ page }) => {
  const client = clientCredentials();
  test.skip(!client || !hasAdminCreds, "SMOKE_CLIENT_* e SMOKE_ADMIN_* richiesti");
  attachConsoleGuards(page);

  await loginViaUi(page, adminCredentials());
  await page.goto("/mezzi");
  const firstRow = page.locator('[id^="mezzo-row-"]').first();
  await expect(firstRow).toBeVisible({ timeout: 60_000 });
  const rowId = await firstRow.getAttribute("id");
  const mezzoId = rowId?.replace(/^mezzo-row-/, "") ?? "";
  test.skip(!mezzoId, "Nessun mezzo in anagrafica");

  const metaRes = await page.request.get(`/api/mezzo-labels/mezzi/${encodeURIComponent(mezzoId)}`);
  expect(metaRes.ok()).toBeTruthy();
  const meta = (await metaRes.json()) as { token: string | null };
  test.skip(!meta.token, "Token QR assente");

  await page.goto("/login");
  await loginViaUi(page, client!);
  await page.goto(`/m/q/${encodeURIComponent(meta.token!)}`);

  await expect(page).toHaveURL(/lavorazioni-clienti|m\/q\/errore/, { timeout: 60_000 });
  const url = page.url();
  if (url.includes("/m/q/errore")) {
    await expect(page.getByText(/Accesso non consentito|non consentito/i)).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(page.getByText(/Mezzo non accessibile/i)).toBeVisible({ timeout: 60_000 });
  }
});

test("cliente: QR mezzo associato → portale filtrato", async ({ page }) => {
  const client = clientCredentials();
  const token = process.env.SMOKE_CLIENT_MEZZO_QR_TOKEN?.trim();
  test.skip(!client || !token, "SMOKE_CLIENT_* e SMOKE_CLIENT_MEZZO_QR_TOKEN richiesti");
  attachConsoleGuards(page);

  await loginViaUi(page, client!);
  await page.goto(`/m/q/${encodeURIComponent(token!)}`);
  await expect(page).toHaveURL(/lavorazioni-clienti\?.*mezzoToken=/, { timeout: 60_000 });
  await expect(page.getByText(/Lavorazioni per mezzo/i)).toBeVisible({ timeout: 60_000 });
});
