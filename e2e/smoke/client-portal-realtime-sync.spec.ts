import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, clientCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

const SYNC_WAIT_MS = 25_000;

test.describe("client portal dirty sync", () => {
  test("cold open: no stale banner after initial load", async ({ page }) => {
    const client = clientCredentials();
    test.skip(!client, "SMOKE_CLIENT_EMAIL/PASSWORD not set");

    attachConsoleGuards(page);
    await loginViaUi(page, client!);
    await page.goto("/lavorazioni-clienti");
    await expect(page).toHaveURL(/lavorazioni-clienti/, { timeout: 30_000 });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole("status", { name: "Dati aggiornati disponibili" }),
    ).not.toBeVisible();
  });

  test("two browsers: remote mutation does not auto-update list (banner lifecycle)", async ({ browser }) => {
    const client = clientCredentials();
    test.skip(!client, "SMOKE_CLIENT_EMAIL/PASSWORD not set");

    const adminContext = await browser.newContext();
    const clientContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const clientPage = await clientContext.newPage();

    attachConsoleGuards(adminPage);
    attachConsoleGuards(clientPage);

    await loginViaUi(adminPage, adminCredentials());
    await loginViaUi(clientPage, client!);

    await clientPage.goto("/lavorazioni-clienti");
    await expect(clientPage).toHaveURL(/lavorazioni-clienti/, { timeout: 30_000 });
    await expect(clientPage.getByRole("heading").first()).toBeVisible({ timeout: 30_000 });

    const initialCount = await clientPage.locator("tbody tr").count();
    const firstRowText = await clientPage.locator("tbody tr").first().textContent();

    await adminPage.goto("/lavorazioni");
    await expect(adminPage).toHaveURL(/lavorazioni/, { timeout: 30_000 });

    // ponytail: smoke — attende realtime/poll dirty senza mutazione garantita; verifica no auto-refetch lista
    await clientPage.waitForTimeout(SYNC_WAIT_MS);

    const afterCount = await clientPage.locator("tbody tr").count();
    const afterFirstRowText = await clientPage.locator("tbody tr").first().textContent();

    expect(afterCount).toBe(initialCount);
    if (firstRowText && afterFirstRowText) {
      expect(afterFirstRowText).toBe(firstRowText);
    }

    const banner = clientPage.getByRole("status", { name: "Dati aggiornati disponibili" });
    if (await banner.isVisible()) {
      await banner.getByRole("button", { name: "Aggiorna pagina" }).click();
      await clientPage.waitForLoadState("load");
      await expect(banner).not.toBeVisible({ timeout: 30_000 });
    }

    await adminContext.close();
    await clientContext.close();
  });

  test("cold open: portal loads after gestionale page visited", async ({ page }) => {
    const client = clientCredentials();
    test.skip(!client, "SMOKE_CLIENT_EMAIL/PASSWORD not set");

    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/lavorazioni");
    await expect(page).toHaveURL(/lavorazioni/, { timeout: 30_000 });

    await loginViaUi(page, client!);
    await page.goto("/lavorazioni-clienti");
    await expect(page).toHaveURL(/lavorazioni-clienti/, { timeout: 30_000 });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 30_000 });
  });
});
