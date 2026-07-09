import "server-only";

import { randomUUID } from "node:crypto";
import { requireCompanyIdForUser } from "@/lib/document-capture/company-id.server";
import {
  buildImportFileStoragePath,
  sanitizeImportFileName,
} from "@/lib/import-files/import-file-paths.server";
import type { ImportFileKind } from "@/lib/import-files/import-file-types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function createImportFileUploadPolicy(input: {
  kind: ImportFileKind;
  fileName: string;
  expectedMime: string;
  expectedSizeBytes: number;
  importSessionId?: string | null;
}): Promise<{
  fileId: string;
  bucket: string;
  path: string;
  expiresAt: string;
}> {
  const companyId = await requireCompanyIdForUser();
  const fileId = randomUUID();
  const sanitized = sanitizeImportFileName({
    rawFileName: input.fileName,
    expectedMime: input.expectedMime,
    fallbackId: fileId,
  });
  const path = buildImportFileStoragePath(companyId, input.kind, fileId, sanitized);

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("import_file_create_upload_policy", {
    p_file_id: fileId,
    p_kind: input.kind,
    p_file_name: sanitized,
    p_expected_mime: input.expectedMime,
    p_expected_size_bytes: input.expectedSizeBytes,
    p_import_session_id: input.importSessionId ?? null,
  });

  if (error) throw new Error(error.message);

  const row = data as {
    fileId?: string;
    bucket?: string;
    path?: string;
    expiresAt?: string;
  };

  return {
    fileId: row.fileId ?? fileId,
    bucket: row.bucket ?? "import-sources",
    path: row.path ?? path,
    expiresAt: row.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
