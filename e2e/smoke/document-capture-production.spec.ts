import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi, operatorCredentials } from "../fixtures/auth";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { test, expect } from "@playwright/test";

test.afterAll(async () => {
  await applySmokeTeardown();
});

test("document capture history and API smoke on lavorazioni", async ({ page, request }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  await page.goto("/lavorazioni");
  await expect(page.getByRole("heading", { name: /lavorazioni/i })).toBeVisible({ timeout: 30_000 });

  const historyHeading = page.getByText(/acquisizion|document capture|documenti acquisiti/i).first();
  if (!(await historyHeading.isVisible().catch(() => false))) {
    test.skip(true, "Document capture history panel not visible on lavorazioni");
  }

  const listRes = await request.get("/api/document-capture");
  expect(listRes.status()).toBeLessThan(500);
  if (listRes.ok()) {
    const body = (await listRes.json()) as { captures?: unknown[] };
    expect(Array.isArray(body.captures)).toBe(true);
  }
});

test("document capture upload-policy rejects unauthenticated", async ({ request }) => {
  const res = await request.post("/api/document-capture/upload-policy", {
    data: {
      fileName: "test.pdf",
      expectedMime: "application/pdf",
      expectedSizeBytes: 1024,
    },
  });
  expect([401, 403]).toContain(res.status());
});

test("document capture authenticated upload-policy and mutating routes", async ({ page, request }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const policyRes = await request.post("/api/document-capture/upload-policy", {
    data: {
      fileName: "smoke-fixture.pdf",
      expectedMime: "application/pdf",
      expectedSizeBytes: 2048,
      source: "e2e_smoke",
    },
  });
  expect(policyRes.status()).toBeLessThan(500);
  if (!policyRes.ok()) {
    test.skip(true, `upload-policy not available: ${policyRes.status()}`);
  }

  const policy = (await policyRes.json()) as { captureId?: string };
  expect(policy.captureId).toBeTruthy();
  const captureId = policy.captureId!;

  const eventsRes = await request.get(`/api/document-capture/${captureId}/events`);
  expect(eventsRes.status()).toBeLessThan(500);

  const dryRunRes = await request.post(`/api/document-capture/${captureId}/dry-run`);
  expect([400, 404, 409]).toContain(dryRunRes.status());

  const applyRes = await request.post(`/api/document-capture/${captureId}/apply`, {
    data: { applicationId: "00000000-0000-0000-0000-000000000000" },
  });
  expect([400, 404, 409]).toContain(applyRes.status());
});

test("document capture cross-tenant access denied when second operator configured", async ({
  browser,
}) => {
  const operator = operatorCredentials();
  if (!operator) {
    test.skip(true, "SMOKE_OPERATOR_EMAIL/PASSWORD not configured");
  }

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  attachConsoleGuards(adminPage);
  await loginViaUi(adminPage, adminCredentials());

  const policyRes = await adminContext.request.post("/api/document-capture/upload-policy", {
    data: {
      fileName: "cross-tenant.pdf",
      expectedMime: "application/pdf",
      expectedSizeBytes: 1024,
    },
  });
  if (!policyRes.ok()) {
    await adminContext.close();
    test.skip(true, "Could not create capture for cross-tenant test");
  }
  const { captureId } = (await policyRes.json()) as { captureId: string };
  await adminContext.close();

  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();
  await loginViaUi(operatorPage, operator!);

  const foreignGet = await operatorContext.request.get(`/api/document-capture/${captureId}`);
  expect([403, 404]).toContain(foreignGet.status());

  const foreignApply = await operatorContext.request.post(`/api/document-capture/${captureId}/apply`, {
    data: { applicationId: "00000000-0000-0000-0000-000000000000" },
  });
  expect([403, 404]).toContain(foreignApply.status());

  await operatorContext.close();
});
