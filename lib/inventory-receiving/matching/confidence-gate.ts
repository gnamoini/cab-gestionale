import type { InventoryLineMatchStatus } from "@/src/types/supabase-tables";
import type { MatchCandidate } from "@/lib/inventory-receiving/documents/inventory-receiving-types";
import { defaultLineAction } from "@/lib/inventory-receiving/apply/build-apply-payload";

export const CONFIDENCE_AUTO_ACCEPT = 1;
export const CONFIDENCE_SUPPLIER_AUTO = 0.9;
export const CONFIDENCE_DESCRIPTION_SUGGESTED = 0.85;
export const CONFIDENCE_DESCRIPTION_CANDIDATE_MIN = 0.6;

export function inferMatchMethod(input: {
  matchStatus: InventoryLineMatchStatus;
  matchConfidence: number | null;
}): MatchCandidate["method"] | null {
  const conf = input.matchConfidence ?? 0;
  if (input.matchStatus === "FOUND" && conf >= CONFIDENCE_AUTO_ACCEPT) return "CODE";
  if (input.matchStatus === "FOUND") return "SUPPLIER_CODE";
  if (input.matchStatus === "SUGGESTED" || input.matchStatus === "NEW_ITEM") return "DESCRIPTION_AI";
  return null;
}

export function lineRequiresReview(input: {
  matchStatus: InventoryLineMatchStatus;
  matchConfidence: number | null;
  method?: MatchCandidate["method"] | null;
}): boolean {
  const method = input.method ?? inferMatchMethod(input);
  const conf = input.matchConfidence ?? 0;
  if (input.matchStatus === "FOUND" && method === "CODE") return false;
  if (input.matchStatus === "FOUND" && method === "SUPPLIER_CODE" && conf >= CONFIDENCE_SUPPLIER_AUTO) {
    return false;
  }
  if (input.matchStatus === "SUGGESTED" && conf >= CONFIDENCE_DESCRIPTION_SUGGESTED) return true;
  if (input.matchStatus === "NEW_ITEM") return true;
  return conf < CONFIDENCE_DESCRIPTION_CANDIDATE_MIN;
}

export function defaultLineActionWithGate(
  matchStatus: InventoryLineMatchStatus,
  matchConfidence: number | null,
  method?: MatchCandidate["method"] | null,
): "add" | "create" | "skip" {
  const resolvedMethod = method ?? inferMatchMethod({ matchStatus, matchConfidence });
  const conf = matchConfidence ?? 0;
  if (matchStatus === "NEW_ITEM" && conf < CONFIDENCE_DESCRIPTION_CANDIDATE_MIN) return "create";
  return defaultLineAction(matchStatus);
}

export function documentHasReviewRequiredLines(
  lines: Array<{
    match_status: InventoryLineMatchStatus;
    match_confidence: number | null;
  }>,
): boolean {
  return lines.some((l) =>
    lineRequiresReview({
      matchStatus: l.match_status,
      matchConfidence: l.match_confidence,
      method: null,
    }),
  );
}
