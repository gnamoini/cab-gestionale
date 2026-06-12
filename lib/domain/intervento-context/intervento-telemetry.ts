export type InterventoTelemetryEvent =
  | "intervento_create_started"
  | "intervento_create_completed"
  | "intervento_edit_conflict"
  | "intervento_sync_drift_detected"
  | "intervento_export_alignment_mismatch"
  | "intervento_write_finalized"
  | "intervento_v2_shadow_mismatch";

export type InterventoTelemetryPayload = {
  lavorazioneId?: string;
  stage?: string;
  matchKind?: string;
  mismatch?: boolean;
  field?: string;
  extra?: Record<string, string | boolean | number>;
};

function telemetryEnabled(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") return true;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") return false;
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage?.getItem("INTERVENTO_TELEMETRY") === "1") return true;
    } catch {
      /* ignore */
    }
  }
  return Math.random() < 0.1;
}

export function logInterventoTelemetry(
  event: InterventoTelemetryEvent,
  payload: InterventoTelemetryPayload = {},
): void {
  if (!telemetryEnabled()) return;
  const safe = {
    event,
    at: new Date().toISOString(),
    lavorazioneId: payload.lavorazioneId,
    stage: payload.stage,
    matchKind: payload.matchKind,
    mismatch: payload.mismatch,
    field: payload.field,
    ...payload.extra,
  };
  if (typeof console !== "undefined" && console.info) {
    console.info("[INTERVENTO_TELEMETRY]", JSON.stringify(safe));
  }
}
