# Test info

- Name: dashboard and report load without infinite spinner
- Location: C:\Projects\gestionale-cab\e2e\smoke\03-dashboard-report.spec.ts:5:5

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\gnamo\AppData\Local\ms-playwright\chromium_headless_shell-1169\chrome-win\headless_shell.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
```

# Test source

```ts
   1 | import { attachConsoleGuards } from "../helpers/console";
   2 | import { adminCredentials, loginViaUi } from "../fixtures/auth";
   3 | import { test, expect } from "@playwright/test";
   4 |
>  5 | test("dashboard and report load without infinite spinner", async ({ page }) => {
     |     ^ Error: browserType.launch: Executable doesn't exist at C:\Users\gnamo\AppData\Local\ms-playwright\chromium_headless_shell-1169\chrome-win\headless_shell.exe
   6 |   attachConsoleGuards(page);
   7 |   await loginViaUi(page, adminCredentials());
   8 |
   9 |   await page.goto("/dashboard");
  10 |   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  11 |   const spinners = page.locator('[class*="animate-spin"]');
  12 |   if ((await spinners.count()) > 0) {
  13 |     await expect(spinners.first()).not.toBeVisible({ timeout: 45_000 });
  14 |   }
  15 |
  16 |   await page.goto("/report");
  17 |   await expect(page.getByRole("heading", { name: "Report" })).toBeVisible({ timeout: 45_000 });
  18 |   await expect(page.getByText(/caricamento non riuscito/i)).not.toBeVisible();
  19 | });
  20 |
  21 | test("dashboard passive realtime stability", async ({ page }) => {
  22 |   attachConsoleGuards(page);
  23 |   await loginViaUi(page, adminCredentials());
  24 |   await page.goto("/dashboard");
  25 |   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  26 |   await page.waitForTimeout(15_000);
  27 |   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  28 | });
  29 |
```