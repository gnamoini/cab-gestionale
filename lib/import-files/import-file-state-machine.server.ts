import type { ImportFileStatus } from "@/lib/import-files/import-file-types";

const ALLOWED: Record<ImportFileStatus, readonly ImportFileStatus[]> = {
  uploaded: ["processing", "cancelled", "expired"],
  processing: ["processed", "failed"],
  processed: ["expired"],
  failed: ["processing", "expired"],
  cancelled: ["expired"],
  expired: [],
};

export function assertImportFileTransition(from: ImportFileStatus, to: ImportFileStatus): void {
  if (!ALLOWED[from].includes(to)) {
    const err = new Error(`Transizione import file non valida: ${from} → ${to}`);
    (err as Error & { code?: string }).code = "invalid_status_transition";
    throw err;
  }
}

export function canImportFileTransition(from: ImportFileStatus, to: ImportFileStatus): boolean {
  return ALLOWED[from].includes(to);
}
