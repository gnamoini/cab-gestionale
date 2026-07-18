import type { LineReviewDecision, ApplyLinePayload } from "@/lib/inventory-receiving/documents/inventory-receiving-types";

export function buildApplyPayloadFromDecisions(decisions: LineReviewDecision[]): ApplyLinePayload[] {
  return decisions.map((d) => {
    const payload: ApplyLinePayload = {
      line_id: d.lineId,
      action: d.action,
      final_quantity: d.finalQuantity,
    };

    if (d.action === "add") {
      payload.final_item_id = d.manualMatchItemId ?? d.finalItemId;
    }

    if (d.action === "create" && d.newItem) {
      payload.new_item = {
        codice: d.newItem.codice,
        nome: d.newItem.nome,
        marca: d.newItem.marca,
        meta: {
          categoria: d.newItem.categoria,
          unitaMisura: d.newItem.unitaMisura,
        },
      };
    }

    return payload;
  });
}

export function defaultLineAction(matchStatus: string): "add" | "create" | "skip" {
  if (matchStatus === "FOUND" || matchStatus === "SUGGESTED") return "add";
  if (matchStatus === "NEW_ITEM") return "create";
  return "skip";
}
