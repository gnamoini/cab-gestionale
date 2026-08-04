import type { Page } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function saveSettingsAndWait(page: Page): Promise<void> {
  const saveBtn = page.getByRole("button", { name: /^Salva( modifiche)?$/ });
  await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
  const saveDone = page.waitForResponse(
    (res) => res.url().includes("bulk_upsert_app_settings") && res.ok(),
    { timeout: 60_000 },
  );
  await saveBtn.click();
  await expect(page.getByRole("button", { name: /Salvataggio/ })).toBeVisible({ timeout: 10_000 });
  await saveDone;
  await expect(page.getByRole("button", { name: /Salvataggio/ })).toBeHidden({ timeout: 15_000 });
}

test("impostazioni rename dialog exposes live propagation affordance", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/impostazioni?sezione=cli-cliente");
  await expect(page.getByRole("heading", { name: "Configurazione" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Clienti", { exact: false }).first()).toBeVisible({ timeout: 15_000 });
});

test("impostazioni rename opens propaga dialog and loads impact preview", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/impostazioni?sezione=cli-cliente");
  await expect(page.getByRole("heading", { name: "Configurazione" })).toBeVisible({ timeout: 30_000 });

  const editBtn = page.getByRole("button", { name: /^Modifica / }).first();
  await expect(editBtn).toBeVisible({ timeout: 15_000 });
  const ariaLabel = await editBtn.getAttribute("aria-label");
  const from = ariaLabel?.replace(/^Modifica /, "").trim() ?? "";
  expect(from.length).toBeGreaterThan(0);

  const to = `${from} E2E`;
  await editBtn.click();
  const input = page.getByRole("textbox", { name: `Modifica ${from}` });
  await expect(input).toBeVisible({ timeout: 5_000 });
  await input.fill(to);
  await input.press("Enter");

  await saveSettingsAndWait(page);

  const propagaDialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Propagare le modifiche?" }) });
  await expect(propagaDialog).toBeVisible({ timeout: 15_000 });
  await expect(propagaDialog.getByText("Impatto stimato (dati live)")).toBeVisible({ timeout: 30_000 });

  await propagaDialog.getByRole("button", { name: "Solo configurazione" }).click();
  await expect(propagaDialog).toBeHidden({ timeout: 10_000 });

  const revertBtn = page.getByRole("button", { name: `Modifica ${to}` });
  await expect(revertBtn).toBeVisible({ timeout: 10_000 });
  await revertBtn.click();
  const revertInput = page.getByRole("textbox", { name: `Modifica ${to}` });
  await revertInput.fill(from);
  await revertInput.press("Enter");
  await saveSettingsAndWait(page);

  const revertDialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Propagare le modifiche?" }) });
  if (await revertDialog.isVisible()) {
    await revertDialog.getByRole("button", { name: "Solo configurazione" }).click();
    await expect(revertDialog).toBeHidden({ timeout: 10_000 });
  }

  await expect(page.getByRole("button", { name: `Modifica ${from}` })).toBeVisible({ timeout: 15_000 });
});
