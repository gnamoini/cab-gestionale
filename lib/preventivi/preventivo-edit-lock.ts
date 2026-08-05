import type { PreventivoRow } from "@/src/types/supabase-tables";

export function isPreventivoEditableByStaff(row: Pick<PreventivoRow, "stato_workflow" | "stato_cliente">): boolean {
  return row.stato_workflow === "bozza" && (row.stato_cliente == null || row.stato_cliente === undefined);
}

export function isPreventivoPendingClientResponse(
  row: Pick<PreventivoRow, "stato_workflow" | "stato_cliente">,
): boolean {
  return row.stato_workflow === "inviato" && row.stato_cliente === "pending";
}
