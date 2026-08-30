export type FileSearchOperationShape = {
  done?: boolean;
  name?: string;
  error?: { message?: string; code?: number } | unknown;
  response?: {
    name?: string;
    documentName?: string;
    parent?: string;
  };
  metadata?: {
    file?: { name?: string };
    documentName?: string;
  };
};

/** Gemini SDK: upload può completare con `done` o solo `response.documentName`. */
export function isFileSearchUploadComplete(operation: FileSearchOperationShape): boolean {
  if (operation.error) return true;
  if (operation.done === true) return true;
  const response = operation.response;
  if (response?.documentName?.trim() || response?.name?.trim()) return true;
  const meta = operation.metadata;
  if (meta?.documentName?.trim() || meta?.file?.name?.trim()) return true;
  return false;
}

export function assertFileSearchUploadSucceeded(operation: FileSearchOperationShape): void {
  if (!operation.error) return;
  const msg =
    typeof operation.error === "object" &&
    operation.error !== null &&
    "message" in operation.error &&
    typeof (operation.error as { message?: string }).message === "string"
      ? (operation.error as { message: string }).message
      : JSON.stringify(operation.error).slice(0, 200);
  throw new Error(`FILE_SEARCH_UPLOAD_FAILED: ${msg}`);
}

export function extractFileSearchUploadFileName(operation: FileSearchOperationShape): string {
  const response = operation.response;
  return (
    response?.documentName?.trim() ||
    response?.name?.trim() ||
    operation.metadata?.documentName?.trim() ||
    operation.metadata?.file?.name?.trim() ||
    ""
  );
}

/** ponytail: base 3 min + 1 min/MB, cap da env — upgrade path = async worker dedicato */
export function computeFileSearchUploadTimeoutMs(fileBytes: number, configuredMaxMs: number): number {
  const mb = Math.max(1, Math.ceil(fileBytes / (1024 * 1024)));
  const scaled = 180_000 + mb * 60_000;
  return Math.min(configuredMaxMs, Math.max(180_000, scaled));
}
