import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("admin reaches dipendenti page", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/dipendenti");
  await expect(page.getByRole("heading", { name: "Dipendenti" })).toBeVisible({ timeout: 30_000 });
});
