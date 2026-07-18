import type {
  InventoryDocumentLineRow,
  InventoryDocumentRow,
  InventoryDocumentStatus,
  InventoryLineMatchStatus,
} from "@/src/types/supabase-tables";

export type { InventoryDocumentStatus, InventoryLineMatchStatus };

export type InventoryReceivingDocument = InventoryDocumentRow & {
  lines?: InventoryDocumentLineRow[];
};

export type MatchCandidate = {
  itemId: string;
  label: string;
  confidence: number;
  method: "CODE" | "SUPPLIER_CODE" | "DESCRIPTION_AI" | "MANUAL";
};

export type LineReviewDecision = {
  lineId: string;
  action: "add" | "create" | "skip";
  finalQuantity: number;
  finalItemId?: string;
  newItem?: {
    codice: string;
    nome: string;
    marca?: string;
    categoria?: string;
    unitaMisura?: string;
    costo?: number;
  };
  manualMatchItemId?: string;
};

export type ApplyLinePayload = {
  line_id: string;
  action: "add" | "create" | "skip";
  final_quantity: number;
  final_item_id?: string;
  new_item?: {
    codice: string;
    nome: string;
    marca?: string;
    costo?: number;
    meta?: Record<string, unknown>;
  };
};

export type ApplyResult = {
  ok: boolean;
  applied: number;
  skipped: number;
  failed: number;
  pending: number;
  status: "APPLIED" | "PARTIALLY_APPLIED";
};
