import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { registerMutatingSmokeGuards } from "../helpers/smoke-production-guard";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

registerMutatingSmokeGuards(test);

test.afterAll(async () => {
  await applySmokeTeardown();
});

test("mezzo QR label render + scan deep-link", async ({ page }) => {
  await loginViaUi(page, adminCredentials());
  await page.goto("/mezzi");
  await expect(page.getByRole("heading", { name: /Mezzi/i })).toBeVisible({ timeout: 60_000 });

  const firstRow = page.locator('[id^="mezzo-row-"]').first();
  await expect(firstRow).toBeVisible({ timeout: 60_000 });
  const rowId = await firstRow.getAttribute("id");
  const mezzoId = rowId?.replace(/^mezzo-row-/, "") ?? "";
  test.skip(!mezzoId, "Nessun mezzo in anagrafica per smoke");

  const pdfRes = await page.request.get(
    `/api/mezzo-labels/mezzi/${encodeURIComponent(mezzoId)}/render?format=pdf`,
  );
  expect(pdfRes.ok()).toBeTruthy();
  expect(pdfRes.headers()["content-type"]).toContain("application/pdf");

  const metaRes = await page.request.get(`/api/mezzo-labels/mezzi/${encodeURIComponent(mezzoId)}`);
  expect(metaRes.ok()).toBeTruthy();
  const meta = (await metaRes.json()) as { token: string | null };
  expect(meta.token).toMatch(/^CAB-/);

  await page.goto(`/m/q/${encodeURIComponent(meta.token!)}`);
  await expect(page).toHaveURL(/\/lavorazioni\?.*createNuova=1/, { timeout: 60_000 });
  await expect(page.getByRole("dialog").filter({ hasText: /Scheda di ingresso|Nuova lavorazione/i })).toBeVisible({
    timeout: 60_000,
  });
});
