import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe("tagliandi integrati SSOT", () => {
  test("lavorazioni create modal: sezione tagliando visibile", async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/lavorazioni");
    await expect(page.locator("main").getByText("Lavorazioni in corso", { exact: false })).toBeVisible({
      timeout: 60_000,
    });

    const nuovaBtn = page.getByRole("button", { name: /nuova lavorazione/i });
    if (await nuovaBtn.isVisible().catch(() => false)) {
      await nuovaBtn.click();
      await expect(page.getByText("Intervento di tagliando")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Tipo esecuzione")).toBeVisible();
    }
  });

  test("mezzi hub tagliandi: nessun pulsante registra manuale", async ({ page }) => {
    test.setTimeout(90_000);
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/mezzi");
    await expect(page.locator("main").getByText("Mezzi", { exact: false })).toBeVisible({
      timeout: 60_000,
    });

    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      const tagliandiTab = page.getByRole("button", { name: /tagliandi/i });
      if (await tagliandiTab.isVisible().catch(() => false)) {
        await tagliandiTab.click();
        await expect(page.getByText("Storico esecuzioni", { exact: false })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole("button", { name: /registra tagliando/i })).toHaveCount(0);
      }
    }
  });
});
