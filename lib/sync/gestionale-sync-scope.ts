/**
 * Scope sync registrato dalle pagine — SSOT per cosa osserva la vista corrente.
 * Non dedurre dal pathname.
 */

export type GestionaleSyncDomain =
  | "lavorazioni"
  | "magazzino"
  | "dashboard"
  | "report"
  | "mezzi"
  | "preventivi"
  | "documenti"
  | "agenda"
  | "dipendenti"
  | "sicurezza"
  | "impostazioni"
  | "portale";

export type GestionaleSyncVisibleEntity = {
  table: string;
  entityId: string;
};

export type GestionaleSyncScopeRegistration = {
  scopeId: string;
  domain: GestionaleSyncDomain;
  route?: string;
  tables: readonly string[];
  mountedQueryKeys?: readonly unknown[][];
  visibleEntities?: readonly GestionaleSyncVisibleEntity[];
};

const activeScopes = new Map<string, GestionaleSyncScopeRegistration>();

export function registerGestionaleSyncScope(reg: GestionaleSyncScopeRegistration): () => void {
  activeScopes.set(reg.scopeId, reg);
  return () => {
    activeScopes.delete(reg.scopeId);
  };
}

export function getActiveSyncContexts(): readonly GestionaleSyncScopeRegistration[] {
  return [...activeScopes.values()];
}

export function clearGestionaleSyncScopesForTests(): void {
  activeScopes.clear();
}

/** Mappa tabella operativa → dominio primario (fallback se scope assente). */
export const TABLE_TO_SYNC_DOMAIN: Partial<Record<string, GestionaleSyncDomain>> = {
  lavorazioni: "lavorazioni",
  lavorazione_documents: "lavorazioni",
  scheda_lavorazione: "lavorazioni",
  magazzino_ricambi: "magazzino",
  movimenti_ricambi: "magazzino",
  ordini_fornitori: "magazzino",
  ordini_fornitori_righe: "magazzino",
  mezzi: "mezzi",
  attrezzature: "mezzi",
  preventivi: "preventivi",
  documenti: "documenti",
  invoices: "report",
  invoice_payments: "report",
  ddt_documents: "report",
  log_modifiche: "dashboard",
  dashboard_promemoria: "dashboard",
  workshop_schedule_events: "agenda",
  dipendenti_timesheet_employees: "dipendenti",
  dipendenti_timesheet_entries: "dipendenti",
  app_settings: "impostazioni",
  profiles: "sicurezza",
  user_permissions: "sicurezza",
};

export function resolveDomainForTable(table: string): GestionaleSyncDomain | null {
  return TABLE_TO_SYNC_DOMAIN[table] ?? null;
}
