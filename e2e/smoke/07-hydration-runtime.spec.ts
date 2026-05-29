import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test("no hydration failure text on primary routes", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  for (const path of ["/dashboard", "/lavorazioni", "/magazzino"]) {
    await page.goto(path);
    await expect(page.getByText(/hydration failed/i)).not.toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Minified React error/i);
  }
});
