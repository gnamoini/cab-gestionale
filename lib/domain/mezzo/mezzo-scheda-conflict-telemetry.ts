import { incrementHealthCounter } from "@/lib/observability/runtime-health";

export type MezzoSchedaConflictTelemetryEvent =
  | "MEZZO_ANAGRAFICA_CONFLICT_SHOWN"
  | "MEZZO_UPDATE_CONFIRMED"
  | "MEZZO_UPDATE_REJECTED"
  | "MEZZO_STALE_CONFLICT";

export type MezzoSchedaConflictTelemetryPayload = {
  event: MezzoSchedaConflictTelemetryEvent;
  mezzoId?: string | null;
  lavorazioneId?: string | null;
  /** scheda_only | update_mezzo — solo per MEZZO_UPDATE_CONFIRMED */
  choice?: "scheda_only" | "update_mezzo";
};

function logToConsole(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") return false;
  return true;
}

/** ponytail: contatori rolling 60s — nessuna migration, no dashboard. */
export function logMezzoSchedaConflictTelemetry(payload: MezzoSchedaConflictTelemetryPayload): void {
  incrementHealthCounter(payload.event);
  if (payload.choice) incrementHealthCounter(`${payload.event}_${payload.choice}`);
  if (logToConsole() && typeof console !== "undefined" && console.info) {
    console.info(
      "[MEZZO_SCHEDA_TELEMETRY]",
      JSON.stringify({
        at: new Date().toISOString(),
        ...payload,
      }),
    );
  }
}
