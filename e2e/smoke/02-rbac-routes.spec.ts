import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi, operatorCredentials } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("admin reaches dashboard and report", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.goto("/report");
  await expect(page.getByRole("heading", { name: "Report" })).toBeVisible({ timeout: 30_000 });
});

test("operator without report is denied", async ({ page }) => {
  const op = operatorCredentials();
  test.skip(!op, "SMOKE_OPERATOR_EMAIL/PASSWORD not set");
  attachConsoleGuards(page);
  await loginViaUi(page, op!);
  await page.goto("/report");
  await expect(page).toHaveURL(/acesso-negato|\/dashboard/, { timeout: 15_000 });
});

test("guest cannot open impostazioni when unauthenticated", async ({ page }) => {
  attachConsoleGuards(page);
  await page.goto("/impostazioni");
  await expect(page).toHaveURL(/\/login/);
});
