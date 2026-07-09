import {
  isStoragePolicyError,
  mapStorageError,
} from "@/src/lib/storage/storage-errors";
import type { StorageBucketId } from "@/src/lib/storage/storage-config";

export type StorageDownloadErrorCode =
  | "STORAGE_PERMISSION_DENIED"
  | "STORAGE_NOT_FOUND"
  | "STORAGE_EMPTY";

export type StorageDownloadError = {
  code: StorageDownloadErrorCode;
  message: string;
  isPolicyError: boolean;
};

export type StorageDownloadContext =
  | "finalizzazione"
  | "analisi documento"
  | "import ordine";

const PERMISSION_MESSAGES: Record<StorageDownloadContext, string> = {
  finalizzazione: "Permesso storage negato durante finalizzazione.",
  "analisi documento": "Permesso storage negato durante l'accesso al documento.",
  "import ordine": "Permesso storage negato durante l'import ordine fornitore.",
};

export function classifyStorageDownloadError(
  downloadError: unknown,
  hasFileData: boolean,
  bucket: StorageBucketId = "document-capture",
  context: StorageDownloadContext = "finalizzazione",
): StorageDownloadError {
  if (!hasFileData && !downloadError) {
    return {
      code: "STORAGE_EMPTY",
      message: "File vuoto o non ricevuto dallo storage.",
      isPolicyError: false,
    };
  }

  if (downloadError) {
    if (isStoragePolicyError(downloadError)) {
      return {
        code: "STORAGE_PERMISSION_DENIED",
        message: PERMISSION_MESSAGES[context],
        isPolicyError: true,
      };
    }

    const mapped = mapStorageError(downloadError, bucket);
    const isNotFound =
      mapped.toLowerCase().includes("non trovato") ||
      mapped.toLowerCase().includes("not found");

    return {
      code: isNotFound ? "STORAGE_NOT_FOUND" : "STORAGE_PERMISSION_DENIED",
      message: isNotFound
        ? "File non trovato nello storage al path atteso."
        : mapped,
      isPolicyError: false,
    };
  }

  return {
    code: "STORAGE_EMPTY",
    message: "File vuoto o non ricevuto dallo storage.",
    isPolicyError: false,
  };
}
