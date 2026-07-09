export const IMPORT_FILE_KINDS = [
  "ordine_fornitore",
  "listino",
  "magazzino",
  "ai_input",
] as const;

export type ImportFileKind = (typeof IMPORT_FILE_KINDS)[number];

export const IMPORT_FILE_STATUSES = [
  "uploaded",
  "processing",
  "processed",
  "failed",
  "cancelled",
  "expired",
] as const;

export type ImportFileStatus = (typeof IMPORT_FILE_STATUSES)[number];

export const STORAGE_CLEANUP_STATUSES = ["pending", "deleted", "failed"] as const;

export type StorageCleanupStatus = (typeof STORAGE_CLEANUP_STATUSES)[number];

export const IMPORT_FILE_FAILED_REASON_CODES = [
  "AI_PARSE_ERROR",
  "INVALID_DOCUMENT",
  "TIMEOUT",
  "USER_CANCELLED",
  "STORAGE_ERROR",
  "UNKNOWN",
] as const;

export type ImportFileFailedReasonCode = (typeof IMPORT_FILE_FAILED_REASON_CODES)[number];

export type ImportFile = {
  id: string;
  kind: ImportFileKind;
  importSessionId: string | null;
  companyId: string;
  storagePath: string | null;
  fileName: string;
  mime: string | null;
  sha256: string | null;
  uploadedBy: string;
  processedBy: string | null;
  status: ImportFileStatus;
  failedReasonCode: ImportFileFailedReasonCode | null;
  processingStartedAt: string | null;
  processingBy: string | null;
  processingAttempts: number;
  lastError: Record<string, unknown> | null;
  storageCleanupStatus: StorageCleanupStatus | null;
  expiresAt: string;
  processedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
};

export const IMPORT_FILE_TTL = {
  uploadedHours: 24,
  processedHours: 24,
  failedDays: 7,
} as const;

export const IMPORT_FILE_KIND_MODULE: Record<ImportFileKind, string> = {
  ordine_fornitore: "ordini_fornitori",
  listino: "magazzino",
  magazzino: "magazzino",
  ai_input: "document_capture",
};
