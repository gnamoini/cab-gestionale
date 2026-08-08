# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: android-pwa-cold-start.spec.ts >> android pwa cold start diagnostics >> dashboard cold navigation exposes cold start report with ordered marks
- Location: e2e\perf\android-pwa-cold-start.spec.ts:49:7

# Error details

```
Error: SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required for Playwright smoke
```

# Test source

```ts
  1  | import { test as base, expect, type Page } from "@playwright/test";
  2  | 
  3  | export type SmokeCredentials = {
  4  |   email: string;
  5  |   password: string;
  6  | };
  7  | 
  8  | export function adminCredentials(): SmokeCredentials {
  9  |   const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  10 |   const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  11 |   if (!email || !password) {
> 12 |     throw new Error("SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required for Playwright smoke");
     |           ^ Error: SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required for Playwright smoke
  13 |   }
  14 |   return { email, password };
  15 | }
  16 | 
  17 | export function operatorCredentials(): SmokeCredentials | null {
  18 |   const email = process.env.SMOKE_OPERATOR_EMAIL?.trim();
  19 |   const password = process.env.SMOKE_OPERATOR_PASSWORD?.trim();
  20 |   if (!email || !password) return null;
  21 |   return { email, password };
  22 | }
  23 | 
  24 | /** Alias env: SMOKE_OPERATORE_* (italiano) o SMOKE_OPERATOR_* */
  25 | export function operatoreCredentials(): SmokeCredentials | null {
  26 |   const email = (process.env.SMOKE_OPERATORE_EMAIL ?? process.env.SMOKE_OPERATOR_EMAIL)?.trim();
  27 |   const password = (process.env.SMOKE_OPERATORE_PASSWORD ?? process.env.SMOKE_OPERATOR_PASSWORD)?.trim();
  28 |   if (!email || !password) return null;
  29 |   return { email, password };
  30 | }
  31 | 
  32 | export function managerCredentials(): SmokeCredentials | null {
  33 |   const email = process.env.SMOKE_MANAGER_EMAIL?.trim();
  34 |   const password = process.env.SMOKE_MANAGER_PASSWORD?.trim();
  35 |   if (!email || !password) return null;
  36 |   return { email, password };
  37 | }
  38 | 
  39 | export function clientCredentials(): SmokeCredentials | null {
  40 |   const email = process.env.SMOKE_CLIENT_EMAIL?.trim();
  41 |   const password = process.env.SMOKE_CLIENT_PASSWORD?.trim();
  42 |   if (!email || !password) return null;
  43 |   return { email, password };
  44 | }
  45 | 
  46 | async function ensureAccountMenuVisible(page: Page): Promise<void> {
  47 |   const accountMenu = page.getByTestId("smoke-account-menu");
  48 |   if (await accountMenu.isVisible().catch(() => false)) return;
  49 |   const drawerOpen = page.getByTestId("smoke-nav-drawer-open");
  50 |   if (await drawerOpen.isVisible().catch(() => false)) {
  51 |     await drawerOpen.click({ timeout: 15_000 });
  52 |     await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 10_000 });
  53 |   }
  54 |   await expect(accountMenu).toBeVisible({ timeout: 15_000 });
  55 | }
  56 | 
  57 | export async function loginViaUi(page: Page, creds: SmokeCredentials): Promise<void> {
  58 |   await expect(async () => {
  59 |     await page.goto("/login");
  60 |     await page.getByTestId("smoke-login-identifier").fill(creds.email);
  61 |     await page.getByTestId("smoke-login-password").fill(creds.password);
  62 |     await page.getByTestId("smoke-login-submit").click();
  63 |     await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
  64 |       timeout: 45_000,
  65 |       waitUntil: "domcontentloaded",
  66 |     });
  67 |   }).toPass({ timeout: 90_000 });
  68 | 
  69 |   await ensureAccountMenuVisible(page);
  70 | }
  71 | 
  72 | export async function logoutViaUi(page: Page): Promise<void> {
  73 |   await ensureAccountMenuVisible(page);
  74 |   await page.getByTestId("smoke-account-menu").click();
  75 |   await expect(page.getByTestId("profile-sheet")).toBeVisible({ timeout: 10_000 });
  76 |   await expect(page.getByTestId("smoke-logout")).toBeVisible({ timeout: 10_000 });
  77 |   const logout = page.getByTestId("smoke-logout");
  78 |   await logout.scrollIntoViewIfNeeded();
  79 |   await logout.click({ timeout: 20_000 });
  80 |   await expect(page.getByTestId("smoke-logout-confirm")).toBeVisible({ timeout: 10_000 });
  81 |   await page.getByTestId("smoke-logout-confirm").click();
  82 |   await page.waitForURL(/\/login/, { timeout: 30_000 });
  83 | }
  84 | 
  85 | export const test = base.extend<{ adminCreds: SmokeCredentials }>({
  86 |   adminCreds: async ({}, use) => {
  87 |     await use(adminCredentials());
  88 |   },
  89 | });
  90 | 
  91 | export { expect } from "@playwright/test";
  92 | 
```