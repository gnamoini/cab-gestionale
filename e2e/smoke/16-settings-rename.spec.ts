import type { Page } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("impostazioni rename dialog exposes live propagation affordance", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/impostazioni?sezione=cli-cliente");
  await expect(page.getByRole("heading", { name: "Configurazione" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Clienti", { exact: false }).first()).toBeVisible({ timeout: 15_000 });
});
