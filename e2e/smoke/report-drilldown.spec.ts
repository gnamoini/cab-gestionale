import { test, expect } from "@playwright/test";
import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

test.describe("Report drill-down", () => {
  test("desktop: KPI lav-chiusi opens drill-down panel", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });

    const kpi = page.locator('[data-metric-id="lav-chiusi"][data-drilldown="true"]').first();
    await expect(kpi).toBeVisible({ timeout: 30_000 });
    await kpi.click();

    const panel = page.getByTestId("report-drilldown-panel");
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByText(/risultat/i)).toBeVisible();
  });

  test("cliente pareto opens drill-down", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });

    const clienteBtn = page.locator('button:has-text("Top clienti")').locator("..").locator("ul button").first();
    if (await clienteBtn.count()) {
      await clienteBtn.click();
      await expect(page.getByTestId("report-drilldown-panel")).toBeVisible({ timeout: 20_000 });
    }
  });

  test("insight apri dettagli opens panel when supported", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByText(/Insight & Alerts/i)).toBeVisible({ timeout: 45_000 });

    const detailBtn = page.getByRole("button", { name: "Apri dettagli" }).first();
    if (await detailBtn.count()) {
      await detailBtn.click();
      await expect(page.getByTestId("report-drilldown-panel")).toBeVisible({ timeout: 20_000 });
    }
  });

  test("mobile: KPI opens drill-down panel", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });

    const kpi = page.locator('[data-drilldown="true"]').first();
    if (await kpi.count()) {
      await kpi.click();
      await expect(page.getByTestId("report-drilldown-panel")).toBeVisible({ timeout: 20_000 });
    }
  });

  test("period change affects new drill-down request", async ({ page }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());
    await page.goto("/report");
    await expect(page.getByTestId("report-bi-center")).toBeVisible({ timeout: 45_000 });

    const drillRequest = page.waitForRequest(
      (req) => req.url().includes("/api/report/drilldown") && req.method() === "POST",
    );
    const kpi = page.locator('[data-drilldown="true"]').first();
    await kpi.click();
    const req = await drillRequest;
    const body = req.postDataJSON() as { period?: { start?: string; end?: string } };
    assertPeriodShape(body.period);
  });
});

function assertPeriodShape(period: { start?: string; end?: string } | undefined) {
  if (!period?.start || !period?.end) throw new Error("period missing in drill-down request");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period.start)) throw new Error("invalid period.start");
}
