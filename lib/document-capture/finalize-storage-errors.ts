import {
  classifyStorageDownloadError,
  type StorageDownloadError,
  type StorageDownloadErrorCode,
} from "@/lib/storage/storage-download-errors";

export type FinalizeStorageErrorCode = StorageDownloadErrorCode;
export type FinalizeStorageError = StorageDownloadError;

export function classifyFinalizeStorageDownloadError(
  downloadError: unknown,
  hasFileData: boolean,
  bucket: Parameters<typeof classifyStorageDownloadError>[2] = "document-capture",
): FinalizeStorageError {
  return classifyStorageDownloadError(downloadError, hasFileData, bucket, "finalizzazione");
}

export function finalizeStorageErrorToDocumentCaptureCode(
  code: FinalizeStorageErrorCode,
): "STORAGE_PERMISSION_DENIED" | "STORAGE_NOT_FOUND" | "STORAGE_EMPTY" | "UPLOAD_FAILED" {
  if (code === "STORAGE_PERMISSION_DENIED") return "STORAGE_PERMISSION_DENIED";
  if (code === "STORAGE_NOT_FOUND") return "STORAGE_NOT_FOUND";
  if (code === "STORAGE_EMPTY") return "STORAGE_EMPTY";
  return "UPLOAD_FAILED";
}
