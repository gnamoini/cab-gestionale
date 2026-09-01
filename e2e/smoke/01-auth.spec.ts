import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, adminUsernameCredentials, loginViaUi, logoutViaUi } from "../fixtures/auth";
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

test("login via admin username when SMOKE_ADMIN_USERNAME is set", async ({ page }) => {
  attachConsoleGuards(page);
  const creds = adminUsernameCredentials();
  test.skip(!creds, "SMOKE_ADMIN_USERNAME and SMOKE_ADMIN_PASSWORD required");
  await loginViaUi(page, creds!);
  await expect(page).not.toHaveURL(/\/login/);
  await logoutViaUi(page);
  await expect(page).toHaveURL(/\/login/);
});

test("remember-me preference writes cab-auth-remember cookie on toggle", async ({ page }) => {
  attachConsoleGuards(page);
  await page.goto("/login");
  const rememberCheckbox = page.getByRole("checkbox", { name: /resta collegato/i });
  await rememberCheckbox.check();
  const cookiesAfterCheck = await page.context().cookies();
  const rememberCookie = cookiesAfterCheck.find((c) => c.name === "cab-auth-remember");
  expect(rememberCookie?.value).toBe("1");
  await rememberCheckbox.uncheck();
  const cookiesAfterUncheck = await page.context().cookies();
  const rememberOff = cookiesAfterUncheck.find((c) => c.name === "cab-auth-remember");
  expect(rememberOff?.value).toBe("0");
});

test("reset password page without recovery session shows guidance", async ({ page }) => {
  attachConsoleGuards(page);
  await page.goto("/login/reset-password");
  await expect(page.getByTestId("smoke-reset-password-no-session")).toBeVisible();
  await expect(page.getByRole("link", { name: /torna al login/i })).toBeVisible();
});
