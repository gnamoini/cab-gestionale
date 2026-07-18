import type { ImportFileStatus } from "@/lib/import-files/import-file-types";
import type { InventoryDocumentStatus } from "@/src/types/supabase-tables";

/** Stati UX wizard — non persistiti su DB. */
export type InventoryReceivingUiStatus =
  | "UPLOADED"
  | "QUEUED"
  | "PROCESSING"
  | "REVIEW"
  | "APPLIED"
  | "FAILED";

export function inventoryReceivingStatusToUiStatus(
  dbStatus: InventoryDocumentStatus | null | undefined,
  importFileStatus?: ImportFileStatus | null,
): InventoryReceivingUiStatus {
  if (dbStatus === "FAILED" || importFileStatus === "failed") return "FAILED";
  if (dbStatus === "APPLIED" || dbStatus === "PARTIALLY_APPLIED") return "APPLIED";
  if (dbStatus === "ANALYZING" || importFileStatus === "processing") return "PROCESSING";
  if (
    dbStatus === "REVIEW_REQUIRED" ||
    dbStatus === "READY_TO_APPLY" ||
    importFileStatus === "processed"
  ) {
    return "REVIEW";
  }
  if (dbStatus === "UPLOADED") return "UPLOADED";
  if (importFileStatus === "uploaded") return "QUEUED";
  return "UPLOADED";
}

export function inventoryReceivingUiStatusLabel(status: InventoryReceivingUiStatus): string {
  switch (status) {
    case "UPLOADED":
      return "Caricato";
    case "QUEUED":
      return "In coda";
    case "PROCESSING":
      return "Elaborazione";
    case "REVIEW":
      return "Revisione";
    case "APPLIED":
      return "Applicato";
    case "FAILED":
      return "Errore";
  }
}

/** Mappa stato documento DB → step wizard client (hub/analyze/review). */
export function inventoryReceivingFlowStepFromDocument(
  dbStatus: InventoryDocumentStatus | null | undefined,
): "hub" | "analyze" | "review" {
  if (!dbStatus || dbStatus === "UPLOADED" || dbStatus === "ANALYZING") return "analyze";
  if (dbStatus === "FAILED") return "hub";
  return "review";
}
