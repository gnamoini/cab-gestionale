import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("admin reaches preventivi page", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/preventivi");
  await expect(page.getByRole("heading", { name: "Preventivi" })).toBeVisible({ timeout: 30_000 });
});
