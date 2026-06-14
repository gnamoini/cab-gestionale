import { test as base, expect, type Page } from "@playwright/test";

export type SmokeCredentials = {
  email: string;
  password: string;
};

export function adminCredentials(): SmokeCredentials {
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required for Playwright smoke");
  }
  return { email, password };
}

export function operatorCredentials(): SmokeCredentials | null {
  const email = process.env.SMOKE_OPERATOR_EMAIL?.trim();
  const password = process.env.SMOKE_OPERATOR_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function clientCredentials(): SmokeCredentials | null {
  const email = process.env.SMOKE_CLIENT_EMAIL?.trim();
  const password = process.env.SMOKE_CLIENT_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export async function loginViaUi(page: Page, creds: SmokeCredentials): Promise<void> {
  await expect(async () => {
    await page.goto("/login");
    await page.getByTestId("smoke-login-identifier").fill(creds.email);
    await page.getByTestId("smoke-login-password").fill(creds.password);
    await page.getByTestId("smoke-login-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 45_000,
      waitUntil: "domcontentloaded",
    });
  }).toPass({ timeout: 90_000 });

  await expect(page.getByTestId("smoke-account-menu")).toBeVisible({ timeout: 15_000 });
}

export async function logoutViaUi(page: Page): Promise<void> {
  await page.getByTestId("smoke-account-menu").click();
  await expect(page.getByTestId("smoke-logout")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("smoke-logout").click();
  await expect(page.getByTestId("smoke-logout-confirm")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("smoke-logout-confirm").click();
  await page.waitForURL(/\/login/, { timeout: 30_000 });
}

export const test = base.extend<{ adminCreds: SmokeCredentials }>({
  adminCreds: async ({}, use) => {
    await use(adminCredentials());
  },
});

export { expect } from "@playwright/test";
