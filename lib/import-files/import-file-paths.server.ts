import "server-only";

import { sanitizeCaptureFilename } from "@/lib/document-capture/sanitize-capture-filename";
import type { ImportFileKind } from "@/lib/import-files/import-file-types";

export function buildImportFileStoragePath(
  companyId: string,
  kind: ImportFileKind,
  fileId: string,
  sanitizedFileName: string,
): string {
  return `${companyId}/imports/${kind}/${fileId}/${sanitizedFileName}`;
}

export function sanitizeImportFileName(input: {
  rawFileName: string;
  expectedMime: string;
  fallbackId: string;
}): string {
  return sanitizeCaptureFilename(input);
}
