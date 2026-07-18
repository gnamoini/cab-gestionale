import type { DdtExtraction } from "@/lib/inventory-receiving/extraction/ddt-extraction-schema";

export const DOCUMENT_CONFIDENCE_REVIEW_THRESHOLD = 0.9;
export const DOCUMENT_CONFIDENCE_CAUTION_THRESHOLD = 0.7;

export function mapItemQuantities(item: {
  ordered_quantity?: number;
  delivered_quantity?: number;
  quantity?: number;
}): { extractedQuantity: number; receivedQuantity: number } {
  const extracted = item.ordered_quantity ?? item.quantity ?? 1;
  const received = item.delivered_quantity ?? extracted;
  return {
    extractedQuantity: Math.max(0, extracted),
    receivedQuantity: Math.max(0, received),
  };
}

export function computeDocumentAiConfidence(extraction: DdtExtraction): number {
  if (typeof extraction.document_confidence === "number") {
    return clamp01(extraction.document_confidence);
  }

  const lineConfidences = extraction.items
    .map((i) => i.confidence)
    .filter((c): c is number => typeof c === "number");

  const lineAvg =
    lineConfidences.length > 0
      ? lineConfidences.reduce((a, b) => a + b, 0) / lineConfidences.length
      : 0.5;

  let headerBonus = 0;
  if (extraction.document_number?.trim()) headerBonus += 0.1;
  if (extraction.date?.trim()) headerBonus += 0.1;
  if (extraction.supplier?.ragioneSociale?.trim()) headerBonus += 0.1;

  return clamp01(lineAvg * 0.8 + headerBonus);
}

export function needsCautionReview(confidence: number): boolean {
  return confidence < DOCUMENT_CONFIDENCE_CAUTION_THRESHOLD;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
