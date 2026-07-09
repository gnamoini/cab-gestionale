import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("dashboard and report load without infinite spinner", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Benvenuto nel gestionale officina.")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Settimana corrente (lun–oggi)", { exact: true })).toBeVisible({ timeout: 45_000 });
  const spinners = page.locator('[class*="animate-spin"]');
  if ((await spinners.count()) > 0) {
    await expect(spinners.first()).not.toBeVisible({ timeout: 45_000 });
  }

  await page.goto("/report");
  await expect(page.getByRole("heading", { name: "Report" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/caricamento non riuscito/i)).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "ANALISI IA" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "LAVORAZIONI" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PANORAMICA" })).toBeVisible();
});

test("dashboard passive realtime stability", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.waitForTimeout(15_000);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
