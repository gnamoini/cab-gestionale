# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 16-bottom-sheet-scroll-restore.spec.ts >> mobile searchable sheet restores main scroll after close button
- Location: e2e\smoke\16-bottom-sheet-scroll-restore.spec.ts:39:5

# Error details

```
Error: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3210/login", waiting until "load"


Call Log:
- Test timeout of 90000ms exceeded
```

# Test source

```ts
  1   | import { test as base, expect, type Page } from "@playwright/test";
  2   | 
  3   | export type SmokeCredentials = {
  4   |   email: string;
  5   |   password: string;
  6   | };
  7   | 
  8   | export type LoginViaUiOptions = {
  9   |   /** Imposta checkbox "Resta collegato" prima del submit. */
  10  |   remember?: boolean;
  11  | };
  12  | 
  13  | export function adminCredentials(): SmokeCredentials {
  14  |   const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  15  |   const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  16  |   if (!email || !password) {
  17  |     throw new Error("SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required for Playwright smoke");
  18  |   }
  19  |   return { email, password };
  20  | }
  21  | 
  22  | export function adminUsernameCredentials(): SmokeCredentials | null {
  23  |   const username = process.env.SMOKE_ADMIN_USERNAME?.trim();
  24  |   const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  25  |   if (!username || !password) return null;
  26  |   return { email: username, password };
  27  | }
  28  | 
  29  | export function operatorCredentials(): SmokeCredentials | null {
  30  |   const email = process.env.SMOKE_OPERATOR_EMAIL?.trim();
  31  |   const password = process.env.SMOKE_OPERATOR_PASSWORD?.trim();
  32  |   if (!email || !password) return null;
  33  |   return { email, password };
  34  | }
  35  | 
  36  | /** Alias env: SMOKE_OPERATORE_* (italiano) o SMOKE_OPERATOR_* */
  37  | export function operatoreCredentials(): SmokeCredentials | null {
  38  |   const email = (process.env.SMOKE_OPERATORE_EMAIL ?? process.env.SMOKE_OPERATOR_EMAIL)?.trim();
  39  |   const password = (process.env.SMOKE_OPERATORE_PASSWORD ?? process.env.SMOKE_OPERATOR_PASSWORD)?.trim();
  40  |   if (!email || !password) return null;
  41  |   return { email, password };
  42  | }
  43  | 
  44  | export function managerCredentials(): SmokeCredentials | null {
  45  |   const email = process.env.SMOKE_MANAGER_EMAIL?.trim();
  46  |   const password = process.env.SMOKE_MANAGER_PASSWORD?.trim();
  47  |   if (!email || !password) return null;
  48  |   return { email, password };
  49  | }
  50  | 
  51  | export function clientCredentials(): SmokeCredentials | null {
  52  |   const email = process.env.SMOKE_CLIENT_EMAIL?.trim();
  53  |   const password = process.env.SMOKE_CLIENT_PASSWORD?.trim();
  54  |   if (!email || !password) return null;
  55  |   return { email, password };
  56  | }
  57  | 
  58  | async function ensureAccountMenuVisible(page: Page): Promise<void> {
  59  |   const accountMenu = page.getByTestId("smoke-account-menu");
  60  |   if (await accountMenu.isVisible().catch(() => false)) return;
  61  |   const drawerOpen = page.getByTestId("smoke-nav-drawer-open");
  62  |   if (await drawerOpen.isVisible().catch(() => false)) {
  63  |     await drawerOpen.click({ timeout: 15_000 });
  64  |     await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 10_000 });
  65  |     if (await accountMenu.isVisible().catch(() => false)) return;
  66  |   }
  67  |   await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 5_000 });
  68  | }
  69  | 
  70  | export async function loginViaUi(
  71  |   page: Page,
  72  |   creds: SmokeCredentials,
  73  |   opts?: LoginViaUiOptions,
  74  | ): Promise<void> {
  75  |   await expect(async () => {
  76  |     await page.goto("/login");
  77  |     const identifier = page.getByTestId("smoke-login-identifier");
  78  |     if (!(await identifier.isVisible().catch(() => false))) {
  79  |       await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
  80  |       return;
  81  |     }
  82  |     await expect(identifier).toBeEnabled({ timeout: 30_000 });
  83  |     const rememberCheckbox = page.getByRole("checkbox", { name: /resta collegato/i });
  84  |     if (opts?.remember === true) {
  85  |       await rememberCheckbox.check();
  86  |     } else if (opts?.remember === false) {
  87  |       await rememberCheckbox.uncheck();
  88  |     }
  89  |     await identifier.fill(creds.email);
  90  |     await page.getByTestId("smoke-login-password").fill(creds.password);
  91  |     await page.getByTestId("smoke-login-submit").click();
  92  |     // ponytail: client-side post-login redirect — no second domcontentloaded
  93  |     await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 60_000 });
> 94  |   }).toPass({ timeout: 90_000 });
      |      ^ Error: page.goto: Timeout 30000ms exceeded.
  95  | 
  96  |   await ensureAccountMenuVisible(page);
  97  | }
  98  | 
  99  | export async function logoutViaUi(page: Page): Promise<void> {
  100 |   await ensureAccountMenuVisible(page);
  101 |   await page.getByTestId("smoke-account-menu").click();
  102 |   await expect(page.getByTestId("profile-sheet")).toBeVisible({ timeout: 10_000 });
  103 |   await expect(page.getByTestId("smoke-logout")).toBeVisible({ timeout: 10_000 });
  104 |   const logout = page.getByTestId("smoke-logout");
  105 |   await logout.scrollIntoViewIfNeeded();
  106 |   await logout.click({ timeout: 20_000 });
  107 |   await expect(page.getByTestId("smoke-logout-confirm")).toBeVisible({ timeout: 10_000 });
  108 |   await page.getByTestId("smoke-logout-confirm").click();
  109 |   await page.waitForURL(/\/login/, { timeout: 30_000 });
  110 | }
  111 | 
  112 | export const test = base.extend<{ adminCreds: SmokeCredentials }>({
  113 |    
  114 |   adminCreds: async ({}, use) => {
  115 |     await use(adminCredentials());
  116 |   },
  117 | });
  118 | 
  119 | export { expect } from "@playwright/test";
  120 | 
```