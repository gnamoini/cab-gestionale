import { assertGestionalePageScrollUnlocked } from "../helpers/regression";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function ensureMainScrollable(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const main = document.querySelector("main.gestionale-scroll-y");
    if (main instanceof HTMLElement && main.scrollHeight <= main.clientHeight + 1) {
      main.style.minHeight = "200vh";
    }
  });
}

async function openMagazzinoFilterDrawer(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: "Filtri" }).click();
  await expect(page.getByRole("dialog", { name: "Filtri" })).toBeVisible();
}

async function closeMagazzinoFilterDrawer(page: import("@playwright/test").Page): Promise<void> {
  const drawer = page.getByRole("dialog", { name: "Filtri" });
  await drawer.getByRole("button", { name: "Chiudi" }).click();
  await expect(drawer).not.toBeVisible();
}

async function openMarcaRicambioSheet(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("combobox", { name: "Filtra marca ricambio" }).click();
  await expect(page.getByRole("dialog", { name: "Filtra marca ricambio" })).toBeVisible();
}

async function closeMarcaRicambioSheetWithButton(page: import("@playwright/test").Page): Promise<void> {
  const sheet = page.getByRole("dialog", { name: "Filtra marca ricambio" });
  await sheet.getByRole("button", { name: "Chiudi" }).click();
  await expect(sheet).not.toBeVisible();
}

test("mobile searchable sheet restores main scroll after close button", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");
  await ensureMainScrollable(page);

  await openMagazzinoFilterDrawer(page);
  await openMarcaRicambioSheet(page);
  await closeMarcaRicambioSheetWithButton(page);
  await closeMagazzinoFilterDrawer(page);

  await assertGestionalePageScrollUnlocked(page);
});

test("mobile searchable sheet restores main scroll after backdrop close", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");
  await ensureMainScrollable(page);

  await openMagazzinoFilterDrawer(page);
  await openMarcaRicambioSheet(page);
  await page.getByRole("button", { name: "Chiudi selettore" }).click();
  await expect(page.getByRole("dialog", { name: "Filtra marca ricambio" })).not.toBeVisible();
  await closeMagazzinoFilterDrawer(page);

  await assertGestionalePageScrollUnlocked(page);
});

test("mobile searchable sheet: three open/close cycles leave main scroll unlocked", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");
  await ensureMainScrollable(page);

  await openMagazzinoFilterDrawer(page);
  for (let i = 0; i < 3; i += 1) {
    await openMarcaRicambioSheet(page);
    await closeMarcaRicambioSheetWithButton(page);
  }
  await closeMagazzinoFilterDrawer(page);

  await assertGestionalePageScrollUnlocked(page);
});

test("mobile image upload sheet restores main scroll after close", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino");
  await ensureMainScrollable(page);

  await page.getByRole("button", { name: "+ Nuovo" }).click();
  const nuovoModal = page.getByRole("dialog", { name: "Nuovo ricambio" });
  await expect(nuovoModal).toBeVisible();

  await nuovoModal.getByRole("button", { name: "Aggiungi foto" }).click();
  const photoSheet = page.getByRole("dialog", { name: "Aggiungi foto" });
  await expect(photoSheet).toBeVisible();

  await photoSheet.getByRole("button", { name: "Chiudi" }).click();
  await expect(photoSheet).not.toBeVisible();

  await nuovoModal.getByRole("button", { name: "Chiudi" }).click();
  await expect(nuovoModal).not.toBeVisible();

  await assertGestionalePageScrollUnlocked(page);
});
