import type { InventoryLineDecision } from "@/lib/inventory-receiving/inventory-receiving-import-client";
import {
  defaultLineActionWithGate,
  inferMatchMethod,
  lineRequiresReview,
} from "@/lib/inventory-receiving/matching/confidence-gate";
import type { MatchCandidate } from "@/lib/inventory-receiving/documents/inventory-receiving-types";
import type { InventoryDocumentLineRow } from "@/src/types/supabase-tables";
import { resolveCaptureReviewState, type CaptureReviewStateSummary } from "@/lib/document-capture/capture-review-state";

export type InventoryReceivingApplyDecision = {
  lineId: string;
  action: "add" | "create" | "skip";
  receivedQuantity: number;
  finalItemId?: string;
  manualMatchItemId?: string;
  newItem?: { codice: string; nome: string };
};

export type InventoryReceivingApplyInput = {
  documentId: string;
  lines: InventoryDocumentLineRow[];
  lineDecisions: Record<string, InventoryLineDecision>;
  candidatesByLineId: Record<string, MatchCandidate[]>;
};

export type InventoryReceivingDryRunResult = {
  validation: CaptureReviewStateSummary;
  decisions: InventoryReceivingApplyDecision[];
  movementCount: number;
};

export function buildInventoryReceivingDecisions(
  input: InventoryReceivingApplyInput,
): InventoryReceivingApplyDecision[] {
  return input.lines
    .filter((l) => l.apply_status === "pending")
    .map((l) => {
      const decision = input.lineDecisions[l.id];
      const method =
        input.candidatesByLineId[l.id]?.[0]?.method ??
        inferMatchMethod({ matchStatus: l.match_status, matchConfidence: l.match_confidence });
      const action =
        decision?.action ?? defaultLineActionWithGate(l.match_status, l.match_confidence, method);
      return {
        lineId: l.id,
        action,
        receivedQuantity: Number(l.received_quantity) || 0,
        finalItemId: l.matched_item_id ?? undefined,
        manualMatchItemId: decision?.manualMatchItemId,
        newItem:
          action === "create"
            ? {
                codice: decision?.newItemCodice?.trim() || l.raw_code?.trim() || `DDT-${l.line_index + 1}`,
                nome: decision?.newItemNome?.trim() || l.extracted_description,
              }
            : undefined,
      };
    });
}

export function dryRunInventoryReceivingApply(input: InventoryReceivingApplyInput): InventoryReceivingDryRunResult {
  const decisions = buildInventoryReceivingDecisions(input);
  const reviewRequiredCount = input.lines.filter((line) => {
    const method =
      input.candidatesByLineId[line.id]?.[0]?.method ??
      inferMatchMethod({ matchStatus: line.match_status, matchConfidence: line.match_confidence });
    return lineRequiresReview({
      matchStatus: line.match_status,
      matchConfidence: line.match_confidence,
      method,
    });
  }).length;

  const movementCount = decisions.filter((d) => d.action !== "skip" && d.receivedQuantity > 0).length;
  const validation = resolveCaptureReviewState({
    reviewRequiredCount,
    totalLines: input.lines.length,
    blocked: movementCount === 0,
  });

  return { validation, decisions, movementCount };
}
