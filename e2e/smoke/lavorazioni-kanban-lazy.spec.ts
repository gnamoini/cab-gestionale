import { test, expect } from "@playwright/test";
import { adminCredentials, loginViaUi } from "../fixtures/auth";

function isKanbanChunkUrl(url: string): boolean {
  return /lavorazioni-kanban/i.test(url);
}

test.describe("Lavorazioni Kanban lazy isolation", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, adminCredentials());
  });

  test("table mode does not load Kanban JS chunks", async ({ page }) => {
    const kanbanChunks: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (req.resourceType() === "script" && isKanbanChunkUrl(url)) {
        kanbanChunks.push(url);
      }
    });

    await page.goto("/lavorazioni");
    await expect(page.getByText("Lavorazioni in corso")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);

    expect(kanbanChunks, `unexpected Kanban chunks: ${kanbanChunks.join(", ")}`).toHaveLength(0);
  });

  test("table mode loads shared lavorazioni REST data", async ({ page }) => {
    const lavRequests: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/rest/v1/lavorazioni") && req.method() === "GET") {
        lavRequests.push(url);
      }
    });

    await page.goto("/lavorazioni");
    await expect(page.getByText("Lavorazioni in corso")).toBeVisible({ timeout: 30_000 });

    expect(lavRequests.length).toBeGreaterThan(0);
  });

  test("switching to Kanban loads Kanban chunk", async ({ page }) => {
    const kanbanChunks: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (req.resourceType() === "script" && isKanbanChunkUrl(url)) {
        kanbanChunks.push(url);
      }
    });

    await page.goto("/lavorazioni");
    await expect(page.getByText("Lavorazioni in corso")).toBeVisible({ timeout: 30_000 });

    const trigger = page.getByTestId("page-action-menu-trigger");
    await trigger.click();
    await page.getByRole("menuitem", { name: /vista kanban/i }).click();

    await expect
      .poll(() => kanbanChunks.length, { timeout: 15_000, message: "Kanban chunk not requested" })
      .toBeGreaterThan(0);
  });

  test("rapid table ↔ kanban toggle stays stable", async ({ page }) => {
    let lavGetCount = 0;

    page.on("request", (req) => {
      if (req.url().includes("/rest/v1/lavorazioni") && req.method() === "GET") {
        lavGetCount += 1;
      }
    });

    await page.goto("/lavorazioni");
    await expect(page.getByText("Lavorazioni in corso")).toBeVisible({ timeout: 30_000 });
    const baselineGets = lavGetCount;

    const trigger = page.getByTestId("page-action-menu-trigger");

    for (let i = 0; i < 3; i++) {
      await trigger.click();
      await page.getByRole("menuitem", { name: /vista kanban/i }).click();
      await page.waitForTimeout(300);
      await trigger.click();
      await page.getByRole("menuitem", { name: /vista tabella/i }).click();
      await page.waitForTimeout(300);
    }

    await expect(page.getByText("Lavorazioni in corso")).toBeVisible();
    expect(lavGetCount - baselineGets).toBeLessThan(5);
  });
});
