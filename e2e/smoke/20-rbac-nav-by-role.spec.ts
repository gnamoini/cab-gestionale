import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi, operatorCredentials } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function openSidebarIfMobile(page: import("@playwright/test").Page): Promise<void> {
  const drawerBtn = page.getByTestId("smoke-nav-drawer-open");
  if (await drawerBtn.isVisible().catch(() => false)) {
    await drawerBtn.click();
  }
}

test("admin sidebar shows core modules and security", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await openSidebarIfMobile(page);

  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Magazzino" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sicurezza" })).toBeVisible();

  await page.goto("/sicurezza");
  await expect(page).toHaveURL(/sicurezza/, { timeout: 30_000 });
});

test("operator sidebar shows workshop modules, not security", async ({ page }) => {
  const op = operatorCredentials();
  test.skip(!op, "SMOKE_OPERATOR_EMAIL/PASSWORD not set");

  attachConsoleGuards(page);
  await loginViaUi(page, op!);
  await page.goto("/dashboard");
  await openSidebarIfMobile(page);

  await expect(page.getByRole("link", { name: "Lavorazioni" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Magazzino" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sicurezza" })).toHaveCount(0);

  await page.goto("/sicurezza");
  await expect(page).toHaveURL(/acesso-negato|\/dashboard/, { timeout: 15_000 });
});
