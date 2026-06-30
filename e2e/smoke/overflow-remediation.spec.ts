import { attachConsoleGuards } from "../helpers/console";
import { auditHorizontalOverflow } from "../helpers/horizontal-overflow";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";

const REMEDIATION_ROUTES = ["/preventivi", "/dipendenti", "/report"] as const;

const REMEDIATION_VIEWPORTS = [
  { width: 390, height: 844, label: "390" },
  { width: 724, height: 900, label: "724" },
  { width: 768, height: 1024, label: "768" },
  { width: 1024, height: 900, label: "1024" },
  { width: 1362, height: 900, label: "1362" },
  { width: 1440, height: 900, label: "1440" },
] as const;

const hasSmokeCreds = Boolean(
  process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
);

for (const vp of REMEDIATION_VIEWPORTS) {
  for (const route of REMEDIATION_ROUTES) {
    test(`overflow remediation ${route} @ ${vp.label}px`, async ({ page }) => {
      test.setTimeout(120_000);
      test.skip(!hasSmokeCreds, "SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD required");

      attachConsoleGuards(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginViaUi(page, adminCredentials());
      await page.goto(route);
      await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 90_000 });

      const overflow = await auditHorizontalOverflow(page);
      expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
    });
  }
}
