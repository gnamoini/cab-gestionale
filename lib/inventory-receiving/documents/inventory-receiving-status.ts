import type { InventoryDocumentStatus } from "@/src/types/supabase-tables";

const TRANSITIONS: Record<InventoryDocumentStatus, InventoryDocumentStatus[]> = {
  UPLOADED: ["ANALYZING", "FAILED"],
  ANALYZING: ["REVIEW_REQUIRED", "FAILED"],
  REVIEW_REQUIRED: ["READY_TO_APPLY", "FAILED"],
  READY_TO_APPLY: ["APPLIED", "PARTIALLY_APPLIED", "FAILED"],
  PARTIALLY_APPLIED: ["READY_TO_APPLY", "APPLIED", "FAILED"],
  APPLIED: [],
  FAILED: ["UPLOADED"],
};

export function canTransitionInventoryDocument(from: InventoryDocumentStatus, to: InventoryDocumentStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function inventoryDocumentStatusLabel(status: InventoryDocumentStatus): string {
  switch (status) {
    case "UPLOADED":
      return "Caricato";
    case "ANALYZING":
      return "Analisi in corso";
    case "REVIEW_REQUIRED":
      return "Revisione richiesta";
    case "READY_TO_APPLY":
      return "Pronto al carico";
    case "APPLIED":
      return "Applicato";
    case "PARTIALLY_APPLIED":
      return "Parzialmente applicato";
    case "FAILED":
      return "Errore";
  }
}

export function isReviewableStatus(status: InventoryDocumentStatus): boolean {
  return status === "REVIEW_REQUIRED" || status === "READY_TO_APPLY" || status === "PARTIALLY_APPLIED";
}
