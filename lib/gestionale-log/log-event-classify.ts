import { isImageLogAction } from "@/lib/gestionale-log/view-model";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import type { LogModificaRow } from "@/src/types/supabase-tables";

/** Classificazione unificata eventi log (lettura / aggregazione). */
export type LogEventKind =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STOCK_MOVEMENT"
  | "STATUS_CHANGE"
  | "RESTORE"
  | "IMAGE"
  | "REVERTED_ACTION"
  | "UNKNOWN";

function safeAzione(azione: string): string {
  return azione.trim().toUpperCase();
}

export function classifyLogEvent(row: LogModificaRow): LogEventKind {
  if (isLogReverted(row) || safeAzione(row.azione) === "REVERTED" || safeAzione(row.azione) === "UNDO") {
    return "REVERTED_ACTION";
  }
  if (isImageLogAction(row.azione)) return "IMAGE";

  const az = safeAzione(row.azione);
  if (az === "CREATE") {
    if (row.entita === "movimenti_ricambi") return "STOCK_MOVEMENT";
    return "CREATE";
  }
  if (az === "DELETE") return "DELETE";
  if (az === "RESTORE") return "RESTORE";
  if (az === "UPDATE") {
    const p = row.payload;
    if (p && typeof p === "object" && !Array.isArray(p)) {
      const before = (p as Record<string, unknown>).before;
      const after = (p as Record<string, unknown>).after;
      if (before && after && typeof before === "object" && typeof after === "object") {
        const b = before as Record<string, unknown>;
        const a = after as Record<string, unknown>;
        if ("stato" in b || "stato" in a) return "STATUS_CHANGE";
        if ("scorta" in b || "scorta" in a || "quantita" in b || "quantita" in a) return "STOCK_MOVEMENT";
      }
    }
    return "UPDATE";
  }
  return "UNKNOWN";
}
