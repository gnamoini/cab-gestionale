import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { test, expect } from "@playwright/test";

test.afterAll(async () => {
  await applySmokeTeardown();
});

test("inventory receiving analyze rejects unauthenticated", async ({ request }) => {
  const res = await request.post("/api/magazzino/receiving/analyze", {
    data: { importFileId: "00000000-0000-4000-8000-000000000001" },
  });
  expect([401, 403]).toContain(res.status());
});

test("inventory receiving pending and list require auth", async ({ request }) => {
  const pending = await request.get("/api/magazzino/receiving/pending");
  const list = await request.get("/api/magazzino/receiving");
  expect([401, 403]).toContain(pending.status());
  expect([401, 403]).toContain(list.status());
});

test("inventory receiving authenticated list and pending", async ({ page, request }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const listRes = await request.get("/api/magazzino/receiving");
  expect(listRes.status()).toBeLessThan(500);
  if (listRes.ok()) {
    const body = (await listRes.json()) as { documents?: unknown[] };
    expect(Array.isArray(body.documents)).toBe(true);
  }

  const pendingRes = await request.get("/api/magazzino/receiving/pending");
  expect(pendingRes.status()).toBeLessThan(500);
  if (pendingRes.ok()) {
    const body = (await pendingRes.json()) as { pending?: unknown[] };
    expect(Array.isArray(body.pending)).toBe(true);
  }
});

test("inventory receiving resume page without documentId", async ({ page }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());
  await page.goto("/magazzino/carichi/nuovo");
  await expect(page.getByText(/Riprendi carico DDT/i)).toBeVisible();
});
