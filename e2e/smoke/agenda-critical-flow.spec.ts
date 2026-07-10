import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi, operatorCredentials } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("Agenda — operatore", () => {
  test("apre agenda e naviga viste", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/agenda");
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tablist", { name: "Vista agenda" })).toBeVisible();
    await page.getByRole("tab", { name: "Settimana" }).click();
    await page.getByRole("tab", { name: "Mese" }).click();
    await page.getByRole("tab", { name: "Giorno" }).click();
  });

  test("crea sessione da CTA", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/agenda");
    await page.getByRole("button", { name: /Nuova sessione/i }).click();
    await expect(page.getByRole("heading", { name: "Nuova sessione" })).toBeVisible();
    await page.getByLabel(/Titolo/i).fill("E2E sessione test");
    await page.getByRole("button", { name: /Salva/i }).click();
    await expect(page.getByRole("heading", { name: "Nuova sessione" })).toBeHidden({ timeout: 15_000 });
  });
});

test.describe("Agenda — responsabile analisi", () => {
  test("apre pannello analisi", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/agenda");
    await page.getByRole("button", { name: "Analisi" }).click();
    await expect(page.getByRole("complementary", { name: "Intelligence pianificazione" })).toBeVisible();
  });
});

test.describe("Agenda — readonly", () => {
  test("operatore senza write non vede CTA attiva", async ({ page }) => {
    const op = operatorCredentials();
    test.skip(!op, "SMOKE_OPERATOR_EMAIL/PASSWORD not set");
    attachConsoleGuards(page);
    await loginViaUi(page, op!);
    await page.goto("/agenda");
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible({ timeout: 30_000 });
    const cta = page.getByRole("button", { name: /Nuova sessione/i });
    if (await cta.isVisible()) {
      await expect(cta).toBeDisabled();
    }
  });
});

test.describe("Agenda — deep link", () => {
  test("legacy insight redirect", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/agenda?view=insight&date=2026-07-03");
    await expect(page).toHaveURL(/panel=insights/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/view=insight/);
  });
});
