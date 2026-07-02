import "server-only";

import { randomUUID } from "node:crypto";
import { sanitizeCaptureFilename } from "@/lib/document-capture/sanitize-capture-filename";
import { requireCompanyIdForUser } from "@/lib/document-capture/company-id.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export function buildDocumentCaptureStoragePath(
  companyId: string,
  captureId: string,
  sanitizedFileName: string,
): string {
  return `${companyId}/documents/${captureId}/${sanitizedFileName}`;
}

export async function createDocumentCaptureUploadPolicy(input: {
  fileName: string;
  expectedMime: string;
  expectedSizeBytes: number;
  source: string;
  documentCategory?: string;
  schedaTipo?: string | null;
  lavorazioneId?: string | null;
}): Promise<{
  captureId: string;
  bucket: string;
  path: string;
  expiresAt: string;
}> {
  const companyId = await requireCompanyIdForUser();
  const captureId = randomUUID();
  const sanitized = sanitizeCaptureFilename({
    rawFileName: input.fileName,
    expectedMime: input.expectedMime,
    fallbackId: captureId,
  });
  const path = buildDocumentCaptureStoragePath(companyId, captureId, sanitized);

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("document_capture_create_upload_policy", {
    p_capture_id: captureId,
    p_file_name: sanitized,
    p_expected_mime: input.expectedMime,
    p_expected_size_bytes: input.expectedSizeBytes,
    p_source: input.source,
    p_document_category: input.documentCategory ?? "altro",
    p_scheda_tipo: input.schedaTipo ?? null,
    p_lavorazione_id: input.lavorazioneId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data as {
    captureId?: string;
    bucket?: string;
    path?: string;
    expiresAt?: string;
  };

  return {
    captureId: row.captureId ?? captureId,
    bucket: row.bucket ?? "document-capture",
    path: row.path ?? path,
    expiresAt: row.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
