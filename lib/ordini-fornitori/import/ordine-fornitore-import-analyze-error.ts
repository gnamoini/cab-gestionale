import type { OrdineFornitoreImportErrorCode } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-error-codes";

export class OrdineFornitoreImportAnalyzeError extends Error {
  readonly code: OrdineFornitoreImportErrorCode;
  readonly storagePath?: string;
  readonly bucket?: string;
  readonly storageErrorCode?: string;
  readonly isPolicyError?: boolean;

  constructor(
    code: OrdineFornitoreImportErrorCode,
    message: string,
    meta?: {
      storagePath?: string;
      bucket?: string;
      storageErrorCode?: string;
      isPolicyError?: boolean;
    },
  ) {
    super(message);
    this.name = "OrdineFornitoreImportAnalyzeError";
    this.code = code;
    this.storagePath = meta?.storagePath;
    this.bucket = meta?.bucket;
    this.storageErrorCode = meta?.storageErrorCode;
    this.isPolicyError = meta?.isPolicyError;
  }
}

export function isOrdineFornitoreImportAnalyzeError(
  error: unknown,
): error is OrdineFornitoreImportAnalyzeError {
  return error instanceof OrdineFornitoreImportAnalyzeError;
}
