import "server-only";

import { cancelImportFile, beginImportFileProcessing, completeImportFileProcessing } from "@/lib/import-files/import-file-lifecycle.server";
import { getImportFileBytes } from "@/lib/import-files/import-file-bytes.server";
import { createImportFileUploadPolicy } from "@/lib/import-files/upload-policy.server";
import { finalizeImportFileInTransaction } from "@/lib/import-files/finalize.server";
import { expireImportFiles } from "@/lib/import-files/expire-import-files.server";
import { cleanupImportStorage } from "@/lib/import-files/cleanup-import-storage.server";

export const ImportFileService = {
  createUploadPolicy: createImportFileUploadPolicy,
  finalize: finalizeImportFileInTransaction,
  beginProcessing: beginImportFileProcessing,
  completeProcessing: completeImportFileProcessing,
  cancel: cancelImportFile,
  getImportFileBytes,
  expire: expireImportFiles,
  cleanup: cleanupImportStorage,
};

export type { ImportFileBytesResult } from "@/lib/import-files/import-file-bytes.server";
export type { FinalizeImportFileResult, FinalizeImportFileStorageFailure } from "@/lib/import-files/finalize.server";
