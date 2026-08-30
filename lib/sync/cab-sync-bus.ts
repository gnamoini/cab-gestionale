"use client";

import { normalizeSchedaTipoDb, type SchedaTipoDb } from "@/lib/schede/scheda-tipo-db-mapper";
/** SSOT table name — use in sync policy/scope to avoid legacy RBAC string literals. */
export const CAB_SYNC_TABLE_USER_PERMISSIONS = "user_permissions" as const;

export type CabSyncEntity =
  | "app_settings"
  | "lavorazioni"
  | "pdf_artifacts"
  | "document_access_tokens"
  | "mezzi"
  | "attrezzature"
  | "magazzino_ricambi"
  | "movimenti_ricambi"
  | "preventivi"
  | "documenti"
  | "scheda_lavorazione"
  | "invoices"
  | "invoice_payments"
  | "ddt_documents"
  | "log_modifiche"
  | "dashboard_promemoria"
  | "workshop_schedule_events"
  | "dipendenti_timesheet_employees"
  | "dipendenti_timesheet_entries"
  | "user_permissions";

export type CabSyncEvent =
  | { type: "entity_created"; entity: CabSyncEntity; id: string; table?: string }
  | { type: "entity_updated"; entity: CabSyncEntity; id: string; table?: string }
  | { type: "entity_deleted"; entity: CabSyncEntity; id: string; table?: string }
  | { type: "settings_updated"; keys?: string[] }
  | {
      type: "SETTINGS_PROPAGATION_DRIFT_DETECTED";
      kind: string;
      oldLabel: string;
      newLabel: string;
      affectedCount: number;
      jobId?: string;
    };

const TABLE_ENTITY: Record<string, CabSyncEntity> = {
  app_settings: "app_settings",
  lavorazioni: "lavorazioni",
  pdf_artifacts: "pdf_artifacts",
  document_access_tokens: "document_access_tokens",
  mezzi: "mezzi",
  attrezzature: "attrezzature",
  magazzino_ricambi: "magazzino_ricambi",
  movimenti_ricambi: "movimenti_ricambi",
  preventivi: "preventivi",
  documenti: "documenti",
  scheda_lavorazione: "scheda_lavorazione",
  invoices: "invoices",
  invoice_payments: "invoice_payments",
  ddt_documents: "ddt_documents",
  log_modifiche: "log_modifiche",
  dashboard_promemoria: "dashboard_promemoria",
  workshop_schedule_events: "workshop_schedule_events",
  dipendenti_timesheet_employees: "dipendenti_timesheet_employees",
  dipendenti_timesheet_entries: "dipendenti_timesheet_entries",
  user_permissions: "user_permissions",
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
}

export function cabSyncEventFromPostgresChange(
  table: string,
  payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> },
): CabSyncEvent | null {
  if (table === "app_settings") {
    return { type: "settings_updated" };
  }
  const entity = cabSyncEntityFromTable(table);
  if (!entity) return null;
  const n = payload.new;
  const o = payload.old;
  const id = String(n?.id ?? o?.id ?? "");
  if (!id) return null;

  const eventType =
    payload.eventType === "INSERT"
      ? "entity_created"
      : payload.eventType === "DELETE"
        ? "entity_deleted"
        : "entity_updated";

  return { type: eventType, entity, id, table };
}

export function emitCabSyncFromPostgresChange(
  table: string,
  payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> },
): void {
  const event = cabSyncEventFromPostgresChange(table, payload);
  if (event) emitCabSyncEvent(event);
}

export function subscribeCabSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Dev/ops: conteggio listener attivi (stabile se hook sync usa ref handler). */
export function getCabSyncListenerCount(): number {
  return listeners.size;
}

/** Sotto-entità logiche schede (tipo in `scheda_lavorazione`, non tabella separata). */
export type SchedeLogicalKind = "schede_ingresso" | "schede_lavorazione" | "schede_ricambi";

const TIPO_TO_SCHEDE_KIND: Record<SchedaTipoDb, SchedeLogicalKind> = {
  ingresso: "schede_ingresso",
  interventi: "schede_lavorazione",
  ricambi: "schede_ricambi",
};

export function schedeLogicalKindFromRow(row: { tipo?: string }): SchedeLogicalKind | null {
  const normalized = normalizeSchedaTipoDb(row.tipo ?? "");
  if (!normalized) return null;
  return TIPO_TO_SCHEDE_KIND[normalized] ?? null;
}
