import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("admin reaches fatturazione page", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/fatturazione");
  await expect(page.getByRole("heading", { name: "Fatturazione" })).toBeVisible({ timeout: 30_000 });
});
