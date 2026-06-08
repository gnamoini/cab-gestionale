import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, clientCredentials, loginViaUi, operatorCredentials } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

/** UUID inesistente — verifica che il portale non esponga dati sensibili. */
const ALIEN_LAVORAZIONE_ID = "00000000-0000-0000-0000-000000000001";

test("admin can open client lavorazioni list", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni-clienti");
  await expect(page).toHaveURL(/lavorazioni-clienti/, { timeout: 30_000 });
});

test("client portal Contattaci modal shows contact links", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/lavorazioni-clienti");
  await expect(page).toHaveURL(/lavorazioni-clienti/, { timeout: 30_000 });

  await expect(page.getByTestId("smoke-contattaci-open")).toHaveCount(1);

  const openContattaci = page.getByTestId("smoke-contattaci-open");
  await expect(openContattaci).toBeVisible({ timeout: 30_000 });
  await openContattaci.click();

  const dialog = page.getByRole("dialog", { name: "Contattaci" });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText("service@autocompattatori.it")).toBeVisible();
  await expect(dialog.getByText("+39 3480712791")).toBeVisible();

  await expect(page.getByTestId("smoke-contattaci-call")).toHaveAttribute("href", "tel:+393480712791");
  await expect(page.getByTestId("smoke-contattaci-whatsapp")).toHaveAttribute(
    "href",
    "https://wa.me/393480712791",
  );
  await expect(page.getByTestId("smoke-contattaci-email")).toHaveAttribute(
    "href",
    "mailto:service@autocompattatori.it",
  );

  await expect(dialog.getByRole("button", { name: "Chiudi" })).toHaveCount(1);
  await expect(dialog.locator('[data-testid="smoke-contattaci-close"]')).toBeVisible();

  await dialog.getByTestId("smoke-contattaci-close").click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/lavorazioni-clienti/);
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

test("operator direct URL to client portal is denied", async ({ page }) => {
  const op = operatorCredentials();
  test.skip(!op, "SMOKE_OPERATOR_EMAIL/PASSWORD not set");
  attachConsoleGuards(page);
  await loginViaUi(page, op!);
  await page.goto("/lavorazioni-clienti");
  await expect(page).toHaveURL(/acesso-negato|\/dashboard/, { timeout: 30_000 });
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
