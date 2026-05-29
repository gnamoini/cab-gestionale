import { assertNoBodyScrollLock } from "../helpers/regression";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("mobile drawer releases body scroll lock", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");
  await page.getByTestId("smoke-nav-drawer-open").click();
  await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible();
  await page.getByRole("button", { name: "Chiudi menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
  await assertNoBodyScrollLock(page);
});
