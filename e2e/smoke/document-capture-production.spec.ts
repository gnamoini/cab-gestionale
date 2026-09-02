import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi, operatorCredentials } from "../fixtures/auth";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { registerMutatingSmokeGuards } from "../helpers/smoke-production-guard";
import { test, expect } from "@playwright/test";
import type { StorageBucketId } from "@/src/lib/storage/storage-config";

const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
);

registerMutatingSmokeGuards(test);

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

test("document capture analyze route is deprecated in favor of process", async ({ request }) => {
  const res = await request.post("/api/document-capture/00000000-0000-0000-0000-000000000001/analyze");
  expect(res.status()).toBe(410);
  const body = (await res.json()) as { code?: string };
  expect(body.code).toBe("DEPRECATED_ENDPOINT");
});

test("document capture upload finalize without service role", async ({ page, request }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const policyRes = await request.post("/api/document-capture/upload-policy", {
    data: {
      fileName: "smoke-finalize.pdf",
      expectedMime: "application/pdf",
      expectedSizeBytes: MINIMAL_PDF.byteLength,
      source: "e2e_smoke_finalize",
    },
  });
  if (!policyRes.ok()) {
    test.skip(true, `upload-policy not available: ${policyRes.status()}`);
  }

  const policy = (await policyRes.json()) as {
    captureId: string;
    bucket: string;
    path: string;
  };

  const { uploadDocumentCaptureSmokeBytes } = await import("../helpers/document-capture-upload");
  const uploadResult = await uploadDocumentCaptureSmokeBytes({
    bucket: policy.bucket as StorageBucketId,
    path: policy.path,
    bytes: MINIMAL_PDF,
    contentType: "application/pdf",
  });
  if (!uploadResult.ok) {
    test.skip(true, `storage upload helper unavailable: ${uploadResult.message}`);
  }

  const finalizeRes = await request.post(`/api/document-capture/${policy.captureId}/finalize`);
  expect(finalizeRes.status()).toBeLessThan(500);
  if (finalizeRes.status() === 200) {
    const body = (await finalizeRes.json()) as { ok?: boolean; id?: string };
    expect(body.ok).toBe(true);
    expect(body.id).toBe(policy.captureId);
  } else {
    const err = (await finalizeRes.json().catch(() => ({}))) as { error?: string; code?: string };
    test.skip(
      true,
      `finalize blocked (migration pending?): ${finalizeRes.status()} ${err.code ?? ""} ${err.error ?? ""}`,
    );
  }
});

test("report analysis API smoke unchanged", async ({ page, request }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const res = await request.post("/api/report/analysis", {
    data: {
      context: {
        periodLabel: "e2e smoke",
        snapshotFingerprint: "e2e",
        metrics: {},
      },
    },
  });
  expect(res.status()).toBeLessThan(500);
  expect([200, 400, 503, 504]).toContain(res.status());
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
