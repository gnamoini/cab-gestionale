import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("admin reaches fatturazione page", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/fatturazione");
  await expect(page.getByRole("heading", { name: "Fatturazione" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Sezioni fatturazione" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fatture" })).toBeVisible();
});

test("fatturazione tab scadenziario and deep link fattOpen", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/fatturazione?tab=scadenziario");
  await expect(page.getByRole("heading", { name: "Partite aperte" })).toBeVisible({ timeout: 30_000 });
  await page.goto("/fatturazione?nuovo=1");
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
});
