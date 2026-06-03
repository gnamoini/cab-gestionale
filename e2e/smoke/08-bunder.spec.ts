import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("admin reaches bunder page", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/bunder");
  await expect(page.getByRole("heading", { name: "Bunder" })).toBeVisible({ timeout: 30_000 });
});
