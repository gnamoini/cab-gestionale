import { attachConsoleGuards } from "../helpers/console";
import { auditModalHorizontalOverflow } from "../helpers/horizontal-overflow";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

const IMPORT_MODAL_VIEWPORTS = [
  { width: 390, height: 844, label: "390px mobile" },
  { width: 768, height: 1024, label: "768px tablet" },
] as const;

for (const viewport of IMPORT_MODAL_VIEWPORTS) {
  test(`import modal has no horizontal overflow at ${viewport.label}`, async ({ page }) => {
    attachConsoleGuards(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loginViaUi(page, adminCredentials());
    await page.goto("/magazzino");
    await page.getByRole("button", { name: "Importa" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 60_000 });

    const audit = await auditModalHorizontalOverflow(page);
    expect(audit.ok, JSON.stringify(audit)).toBe(true);
  });
}

test("admin sees magazzino import button", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");
  await expect(page.getByRole("button", { name: "Importa" })).toBeVisible({ timeout: 60_000 });
});

test("admin reaches clienti settings with import anagrafiche", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/impostazioni?sezione=cli-cliente");
  await expect(page.getByRole("button", { name: "Importa anagrafiche" })).toBeVisible({ timeout: 60_000 });
});

test("admin sees mezzi import button", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/mezzi");
  await expect(page.getByRole("button", { name: "Importa" })).toBeVisible({ timeout: 60_000 });
});

test("admin sees settings fornitori import", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/impostazioni?sezione=mag-fornitori");
  await expect(page.getByRole("button", { name: /Importa/i })).toBeVisible({ timeout: 60_000 });
});
