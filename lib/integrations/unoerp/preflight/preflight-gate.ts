import type { CabDocumentType, PreflightDecision, UnoerpErrorCode } from "@/lib/integrations/unoerp/types";
import { assertPayloadAllowlist } from "@/lib/integrations/unoerp/allowlist/document-allowlist";
import { getDocumentTypeRegistryEntry } from "@/lib/integrations/unoerp/document-type-registry.server";
import { isUnoerpSyncHardStop } from "@/lib/env/unoerp.server";

export function runPreflight(input: {
  documentType: CabDocumentType;
  operation: "CREATE" | "UPDATE";
  payload: Record<string, unknown>;
  customerResolved: boolean;
  itemsResolved: boolean;
  vatResolved: boolean;
  correlationFieldKnown: boolean;
}): PreflightDecision {
  const reasons: UnoerpErrorCode[] = [];
  if (isUnoerpSyncHardStop()) reasons.push("UNOERP_HARD_STOP");
  const reg = getDocumentTypeRegistryEntry(input.documentType);
  if (!reg.resolved) {
    reasons.push(input.documentType === "consuntivo" ? "CONSUNTIVO_UNOERP_MAPPING_UNRESOLVED" : "UNOERP_MODULE_UNRESOLVED");
  }
  if (!input.customerResolved) reasons.push("UNOERP_CUSTOMER_NOT_FOUND");
  if (!input.itemsResolved) reasons.push("UNOERP_ITEM_MAPPING_MISSING");
  if (!input.vatResolved) reasons.push("UNOERP_VAT_MAPPING_MISSING");
  if (input.operation === "CREATE" && !input.correlationFieldKnown) reasons.push("UNOERP_MAPPING_CONFLICT");
  const allow = assertPayloadAllowlist(input.documentType, input.operation, input.payload);
  if (!allow.ok) reasons.push("UNOERP_PAYLOAD_FIELD_NOT_ALLOWED");
  if (reasons.length > 0) return { decision: "BLOCKED", reasons };
  return { decision: "PREPARED", reasons: [] };
}

export function writerMayProceed(d: PreflightDecision): boolean {
  return d.decision === "PREPARED";
}
