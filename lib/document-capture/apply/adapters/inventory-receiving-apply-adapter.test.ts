import assert from "node:assert/strict";
import { dryRunInventoryReceivingApply } from "@/lib/document-capture/apply/adapters/inventory-receiving-apply-adapter";
import type { InventoryDocumentLineRow } from "@/src/types/supabase-tables";

const lineBase = {
  document_id: "doc-1",
  unit: null,
  final_quantity: null,
  final_item_id: null,
  line_ai_confidence: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
} satisfies Partial<InventoryDocumentLineRow>;

const lines: InventoryDocumentLineRow[] = [
  {
    ...lineBase,
    id: "l1",
    line_index: 0,
    apply_status: "pending",
    match_status: "FOUND",
    match_confidence: 1,
    matched_item_id: "item-1",
    received_quantity: 2,
    extracted_quantity: 2,
    extracted_description: "Filtro",
    raw_code: "F1",
    user_action: null,
  },
  {
    ...lineBase,
    id: "l2",
    line_index: 1,
    apply_status: "pending",
    match_status: "NEW_ITEM",
    match_confidence: 0.4,
    matched_item_id: null,
    received_quantity: 1,
    extracted_quantity: 1,
    extracted_description: "Sconosciuto",
    raw_code: null,
    user_action: null,
  },
];

const result = dryRunInventoryReceivingApply({
  documentId: "doc-1",
  lines: [...lines],
  lineDecisions: {},
  candidatesByLineId: {},
});

assert.equal(result.decisions.length, 2);
assert.equal(result.validation.state, "partial_success");

console.log("inventory-receiving-apply-adapter.test.ts OK");
