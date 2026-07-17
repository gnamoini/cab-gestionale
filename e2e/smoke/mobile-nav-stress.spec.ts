import { assertGestionalePageScrollUnlocked } from "../helpers/regression";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("mobile nav navigation stress chain", async ({ page }) => {
  attachConsoleGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page, adminCredentials());
  await page.goto("/dashboard");

  await page.getByTestId("smoke-nav-drawer-open").click();
  const dialog = page.getByRole("dialog", { name: "Menu principale" });
  await expect(dialog).toBeVisible();

  const magazzinoLink = dialog.getByRole("link", { name: /magazzino/i }).first();
  if (await magazzinoLink.isVisible()) {
    await magazzinoLink.click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
    await assertGestionalePageScrollUnlocked(page);

    await page.goBack();
    await expect(dialog).not.toBeVisible();

    await page.goForward();
    await expect(dialog).not.toBeVisible();
    await assertGestionalePageScrollUnlocked(page);
  }

  await page.reload();
  await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
  await assertGestionalePageScrollUnlocked(page);
});
