"use client";

/** Entità sincronizzate multi-utente (allineate a tabelle / domini gestionale). */
export type CabSyncEntity =
  | "app_settings"
  | "lavorazioni"
  | "lavorazione_documents"
  | "mezzi"
  | "magazzino_ricambi"
  | "movimenti_ricambi"
  | "preventivi"
  | "documenti"
  | "scheda_lavorazione"
  | "log_modifiche"
  | "support_notes"
  | "segnalazioni";

export type CabSyncEvent =
  | { type: "entity_created"; entity: CabSyncEntity; id: string; table?: string }
  | { type: "entity_updated"; entity: CabSyncEntity; id: string; table?: string }
  | { type: "entity_deleted"; entity: CabSyncEntity; id: string; table?: string }
  | { type: "settings_updated"; keys?: string[] };

const TABLE_ENTITY: Record<string, CabSyncEntity> = {
  app_settings: "app_settings",
  lavorazioni: "lavorazioni",
  lavorazione_documents: "lavorazione_documents",
  mezzi: "mezzi",
  magazzino_ricambi: "magazzino_ricambi",
  movimenti_ricambi: "movimenti_ricambi",
  preventivi: "preventivi",
  documenti: "documenti",
  scheda_lavorazione: "scheda_lavorazione",
  log_modifiche: "log_modifiche",
  support_notes: "support_notes",
  segnalazioni: "segnalazioni",
};

type Listener = (event: CabSyncEvent) => void;

const listeners = new Set<Listener>();

export function cabSyncEntityFromTable(table: string): CabSyncEntity | null {
  return TABLE_ENTITY[table] ?? null;
}

export function emitCabSyncEvent(event: CabSyncEvent): void {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (e) {
      console.warn("[cab-sync-bus] listener error", e);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cab-sync", { detail: event }));
  }
}

export function emitCabSyncFromPostgresChange(
  table: string,
  payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> },
): void {
  if (table === "app_settings") {
    emitCabSyncEvent({ type: "settings_updated" });
    return;
  }
  const entity = cabSyncEntityFromTable(table);
  if (!entity) return;
  const n = payload.new;
  const o = payload.old;
  const id = String(n?.id ?? o?.id ?? "");
  if (!id) return;

  const eventType =
    payload.eventType === "INSERT"
      ? "entity_created"
      : payload.eventType === "DELETE"
        ? "entity_deleted"
        : "entity_updated";

  emitCabSyncEvent({ type: eventType, entity, id, table });
}

export function subscribeCabSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
