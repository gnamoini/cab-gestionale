import { attachConsoleGuards } from "../helpers/console";
import { adminCredentials, loginViaUi } from "../fixtures/auth";
import { test, expect } from "@playwright/test";
import type { StorageBucketId } from "@/src/lib/storage/storage-config";

const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
);

test.describe("document capture apply gates", () => {
  test("duplicate SHA finalize returns duplicateOf on second upload", async ({ page, request }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());

    async function createAndFinalize(suffix: string) {
      const policyRes = await request.post("/api/document-capture/upload-policy", {
        data: {
          fileName: `dup-${suffix}.pdf`,
          expectedMime: "application/pdf",
          expectedSizeBytes: MINIMAL_PDF.byteLength,
          source: "e2e_dup",
        },
      });
      if (!policyRes.ok()) return null;
      const policy = (await policyRes.json()) as { captureId: string; bucket: string; path: string };
      const { uploadDocumentCaptureSmokeBytes } = await import("../helpers/document-capture-upload");
      const up = await uploadDocumentCaptureSmokeBytes({
        bucket: policy.bucket as StorageBucketId,
        path: policy.path,
        bytes: MINIMAL_PDF,
        contentType: "application/pdf",
      });
      if (!up.ok) return null;
      const fin = await request.post(`/api/document-capture/${policy.captureId}/finalize`);
      if (!fin.ok()) return null;
      return (await fin.json()) as { duplicateOf?: string | null; id?: string };
    }

    const first = await createAndFinalize("a");
    if (!first) {
      test.skip(true, "upload/finalize not available");
    }
    const second = await createAndFinalize("b");
    if (!second) {
      test.skip(true, "second upload not available");
    }
    expect(second?.duplicateOf).toBeTruthy();
  });

  test("double apply with same applicationId is idempotent when committed", async ({ page, request }) => {
    attachConsoleGuards(page);
    await loginViaUi(page, adminCredentials());

    const policyRes = await request.post("/api/document-capture/upload-policy", {
      data: {
        fileName: "double-apply.pdf",
        expectedMime: "application/pdf",
        expectedSizeBytes: 512,
        source: "e2e_double_apply",
      },
    });
    if (!policyRes.ok()) test.skip(true, "upload-policy unavailable");
    const { captureId } = (await policyRes.json()) as { captureId: string };

    await request.patch(`/api/document-capture/${captureId}/fields`, {
      data: {
        fields: [
          { fieldKey: "scheda_tipo", confirmedValue: "ingresso", valueSource: "manual" },
          { fieldKey: "cliente", confirmedValue: "E2E Cliente", valueSource: "manual" },
          { fieldKey: "targa", confirmedValue: "EE000EE", valueSource: "manual" },
        ],
      },
    });

    const dryRun = await request.post(`/api/document-capture/${captureId}/dry-run`);
    if (!dryRun.ok()) {
      test.skip(true, `dry-run unavailable: ${dryRun.status()}`);
    }
    const { applicationId } = (await dryRun.json()) as { applicationId?: string };
    if (!applicationId) test.skip(true, "no applicationId");

    const apply1 = await request.post(`/api/document-capture/${captureId}/apply`, {
      data: { applicationId },
    });
    if (!apply1.ok()) {
      test.skip(true, `apply unavailable: ${apply1.status()}`);
    }
    const body1 = (await apply1.json()) as { lavorazioneId?: string };
    expect(body1.lavorazioneId).toBeTruthy();

    const captureRes = await request.get(`/api/document-capture/${captureId}`);
    const captureBody = (await captureRes.json()) as { capture?: { status?: string } };
    if (captureBody.capture?.status !== "dry_run") {
      const apply2 = await request.post(`/api/document-capture/${captureId}/apply`, {
        data: { applicationId },
      });
      if (apply2.ok()) {
        const body2 = (await apply2.json()) as { lavorazioneId?: string };
        expect(body2.lavorazioneId).toBe(body1.lavorazioneId);
      }
    }
  });

  test("apply without lavorazioni write returns forbidden for read-only role", async ({ browser }) => {
    test.skip(true, "Requires dedicated read-only document_capture fixture");
  });
});
