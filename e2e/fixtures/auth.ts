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

/** Alias env: SMOKE_OPERATORE_* (italiano) o SMOKE_OPERATOR_* */
export function operatoreCredentials(): SmokeCredentials | null {
  const email = (process.env.SMOKE_OPERATORE_EMAIL ?? process.env.SMOKE_OPERATOR_EMAIL)?.trim();
  const password = (process.env.SMOKE_OPERATORE_PASSWORD ?? process.env.SMOKE_OPERATOR_PASSWORD)?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function managerCredentials(): SmokeCredentials | null {
  const email = process.env.SMOKE_MANAGER_EMAIL?.trim();
  const password = process.env.SMOKE_MANAGER_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function clientCredentials(): SmokeCredentials | null {
  const email = process.env.SMOKE_CLIENT_EMAIL?.trim();
  const password = process.env.SMOKE_CLIENT_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

async function ensureAccountMenuVisible(page: Page): Promise<void> {
  const accountMenu = page.getByTestId("smoke-account-menu");
  if (await accountMenu.isVisible().catch(() => false)) return;
  const drawerOpen = page.getByTestId("smoke-nav-drawer-open");
  if (await drawerOpen.isVisible().catch(() => false)) {
    await drawerOpen.click({ timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 10_000 });
  }
  await expect(accountMenu).toBeVisible({ timeout: 15_000 });
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

  await ensureAccountMenuVisible(page);
}

export async function logoutViaUi(page: Page): Promise<void> {
  await ensureAccountMenuVisible(page);
  await page.getByTestId("smoke-account-menu").click();
  await expect(page.getByTestId("profile-sheet")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("smoke-logout")).toBeVisible({ timeout: 10_000 });
  const logout = page.getByTestId("smoke-logout");
  await logout.scrollIntoViewIfNeeded();
  await logout.click({ timeout: 20_000 });
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
