import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { applySmokeTeardown } from "../helpers/smoke-teardown";
import { createOrdineImportSmokeImportFile } from "../helpers/ordini-fornitore-import-smoke";
import { test, expect } from "@playwright/test";

test.afterAll(async () => {
  await applySmokeTeardown();
});

test("ordini fornitori import analyze rejects unauthenticated", async ({ request }) => {
  const res = await request.post("/api/ordini-fornitori/import/analyze", {
    data: { importFileId: "00000000-0000-4000-8000-000000000001" },
  });
  expect([401, 403]).toContain(res.status());
});

test("ordini fornitori import analyze import file not found", async ({ page, request }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const res = await request.post("/api/ordini-fornitori/import/analyze", {
    data: { source: { type: "import_file", id: "00000000-0000-4000-8000-000000000099" } },
  });
  expect(res.status()).toBeLessThan(500);
});

test("ordini fornitori import upload analyze abandon smoke", async ({ page, request }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const created = await createOrdineImportSmokeImportFile(request);
  if (!created.ok) {
    test.skip(true, `smoke import file setup: ${created.message}`);
    throw new Error("smoke import file setup failed");
  }

  const analyzeRes = await request.post("/api/ordini-fornitori/import/analyze", {
    data: { source: created.source },
  });
  expect(analyzeRes.status()).toBeLessThan(500);

  const analyzeBody = (await analyzeRes.json().catch(() => ({}))) as {
    code?: string;
    error?: string;
    record?: unknown;
    source?: { type: string };
  };

  if (analyzeRes.status() === 503 && analyzeBody.code === "NOT_CONFIGURED") {
    test.skip(true, "Gemini non configurato in ambiente smoke");
  }

  if (analyzeRes.ok()) {
    expect(analyzeBody.record).toBeTruthy();
    expect(analyzeBody.source?.type).toBe("import_file");
  } else {
    expect(["STORAGE_NOT_FOUND", "STORAGE_PERMISSION_DENIED", "STORAGE_EMPTY", "AI_GENERATION_FAILED"]).toContain(
      analyzeBody.code,
    );
    test.skip(true, `analyze blocked: ${analyzeRes.status()} ${analyzeBody.code ?? ""} ${analyzeBody.error ?? ""}`);
  }

  const abandonRes = await request.post(`/api/import-files/${created.importFileId}/abandon`);
  expect(abandonRes.status()).toBeLessThan(500);
  if (abandonRes.ok()) {
    const abandonBody = (await abandonRes.json()) as { ok?: boolean };
    expect(abandonBody.ok).toBe(true);
  }
});

test("report analysis API smoke unchanged after ordini import changes", async ({ page, request }) => {
  attachConsoleGuards(page);
  await loginViaUi(page, adminCredentials());

  const res = await request.post("/api/report/analysis", {
    data: {
      context: {
        periodLabel: "e2e smoke ordini",
        snapshotFingerprint: "e2e-ordini",
        metrics: {},
      },
    },
  });
  expect(res.status()).toBeLessThan(500);
  expect([200, 400, 503, 504]).toContain(res.status());
});
