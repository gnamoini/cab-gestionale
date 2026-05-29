import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi, logoutViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("login redirect and logout", async ({ page }) => {
  attachConsoleGuards(page);
  const creds = adminCredentials();
  await loginViaUi(page, creds);
  await expect(page).not.toHaveURL(/\/login/);
  await logoutViaUi(page);
  await expect(page).toHaveURL(/\/login/);
});
