import type { QueryClient } from "@tanstack/react-query";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { isClientPortalSyncTable } from "@/lib/lavorazioni/client-portal-sync-tables";
import { markEntityInvalidated } from "@/lib/sync/recent-entity-invalidation";
import { QK } from "@/src/lib/react-query/query-keys";
import { lavorazioniDomainQueryKeys } from "@/src/services/domain/lavorazioni-domain.queries";

type QueryKeyTuple = readonly unknown[];

/** Mappa tabella Postgres → chiavi React Query da invalidare (senza duplicati portal). */
export const GESTIONALE_TABLE_QUERY_KEYS: Record<string, readonly QueryKeyTuple[]> = {
  lavorazioni: [QK.lavorazioniQueries, QK.mezzoQueries],
  lavorazione_documents: [QK.lavorazioniQueries],
  mezzi: [QK.mezzi, QK.mezzoQueries, QK.lavorazioniQueries],
  magazzino_ricambi: [QK.magazzino, QK.movimenti, QK.lavorazioniQueries],
  movimenti_ricambi: [QK.movimenti, QK.magazzino, QK.lavorazioniQueries],
  preventivi: [QK.preventivi, QK.lavorazioniQueries],
  documenti: [QK.documenti, QK.mezzoQueries, QK.lavorazioniQueries],
  scheda_lavorazione: [QK.schede, QK.lavorazioniQueries],
  log_modifiche: [QK.log],
  support_notes: [QK.supportNotes],
  app_settings: [QK.settings],
};

/** Chiavi portale clienti (dedupe con le chiavi tabella). */
export const CLIENT_PORTAL_QUERY_KEYS: readonly QueryKeyTuple[] = [
  QK.lavorazioniQueries,
  QK.clientLavorazioniDetail,
  QK.clientLavorazioneDocuments,
  QK.clientLavorazionePhotos,
  QK.schede,
  QK.log,
];

function keyFingerprint(key: QueryKeyTuple): string {
  return JSON.stringify(key);
}

export type CollectGestionaleQueryKeysOptions = {
  /** Aggiunge chiavi portale se almeno una tabella è nel set portale (default true). */
  includePortal?: boolean;
};

/** Raccoglie chiavi uniche per un batch di tabelle (single pass, no refetch duplicati). */
export function collectQueryKeysForGestionaleTables(
  tables: string[],
  options?: CollectGestionaleQueryKeysOptions,
): QueryKeyTuple[] {
  const seen = new Set<string>();
  const out: QueryKeyTuple[] = [];
  const add = (key: QueryKeyTuple) => {
    const fp = keyFingerprint(key);
    if (seen.has(fp)) return;
    seen.add(fp);
    out.push(key);
  };

  for (const table of new Set(tables.filter(Boolean))) {
    const keys = GESTIONALE_TABLE_QUERY_KEYS[table];
    if (keys) {
      for (const k of keys) add(k);
    }
  }

  const includePortal = options?.includePortal !== false;
  if (includePortal && tables.some(isClientPortalSyncTable)) {
    for (const k of CLIENT_PORTAL_QUERY_KEYS) add(k);
  }

  return out;
}

function hasDestructiveCabEvents(events?: CabSyncEvent[]): boolean {
  return (events ?? []).some((e) => e.type === "entity_created" || e.type === "entity_deleted");
}

function canUseEntityAwareLavorazioni(
  tables: string[],
  entityIdByTable?: ReadonlyMap<string, string>,
  cabSyncEvents?: CabSyncEvent[],
  forcePrefix?: boolean,
): string | null {
  if (forcePrefix || hasDestructiveCabEvents(cabSyncEvents)) return null;
  if (!tables.includes("lavorazioni")) return null;
  const entityId = entityIdByTable?.get("lavorazioni");
  if (!entityId) return null;
  return entityId;
}

export type InvalidateGestionaleTablesOptions = CollectGestionaleQueryKeysOptions & {
  refetchType?: "active" | "all" | "none";
  immediate?: boolean;
  entityIdByTable?: ReadonlyMap<string, string>;
  cabSyncEvents?: CabSyncEvent[];
  forcePrefix?: boolean;
};

/** Invalidazione entity-scoped per lavorazioni (liste + base + portal detail). */
export function invalidateGestionaleTablesForEntity(
  qc: QueryClient,
  table: string,
  entityId: string,
  options?: Pick<InvalidateGestionaleTablesOptions, "refetchType" | "includePortal">,
): void {
  const refetchType = options?.refetchType ?? "active";
  const includePortal = options?.includePortal !== false;

  if (table === "lavorazioni") {
    void qc.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === QK.lavorazioniQueries[0] && q.queryKey[1] === "list",
      refetchType,
    });
    void qc.invalidateQueries({
      queryKey: lavorazioniDomainQueryKeys.base(entityId),
      refetchType,
    });
    if (includePortal) {
      void qc.invalidateQueries({
        queryKey: [...QK.clientLavorazioniDetail, entityId],
        refetchType,
      });
    }
    markEntityInvalidated("lavorazioni", entityId);
    return;
  }

  const keys = GESTIONALE_TABLE_QUERY_KEYS[table];
  if (keys) {
    for (const key of keys) {
      void qc.invalidateQueries({ queryKey: key, refetchType });
    }
  }
  markEntityInvalidated(table, entityId);
}

function invalidatePrefixKeys(
  qc: QueryClient,
  keys: QueryKeyTuple[],
  refetchType: "active" | "all" | "none",
): void {
  const seen = new Set<string>();
  for (const key of keys) {
    const fp = keyFingerprint(key);
    if (seen.has(fp)) continue;
    seen.add(fp);
    void qc.invalidateQueries({ queryKey: key, refetchType });
  }
}

/** Esecuzione sincrona invalidation (usata dal batch flush e path immediate). */
export function executeInvalidateGestionaleTables(
  qc: QueryClient,
  tables: string[],
  options?: InvalidateGestionaleTablesOptions,
): void {
  const uniqueTables = [...new Set(tables.filter(Boolean))];
  if (uniqueTables.length === 0) return;

  const refetchType = options?.refetchType ?? "active";
  const entityId = canUseEntityAwareLavorazioni(
    uniqueTables,
    options?.entityIdByTable,
    options?.cabSyncEvents,
    options?.forcePrefix,
  );

  if (entityId) {
    invalidateGestionaleTablesForEntity(qc, "lavorazioni", entityId, options);
    const otherTables = uniqueTables.filter((t) => t !== "lavorazioni");
    if (otherTables.length > 0) {
      const keys = collectQueryKeysForGestionaleTables(otherTables, options).filter(
        (k) => JSON.stringify(k) !== JSON.stringify(QK.lavorazioniQueries),
      );
      invalidatePrefixKeys(qc, keys, refetchType);
    }
    return;
  }

  const keys = collectQueryKeysForGestionaleTables(uniqueTables, options);
  invalidatePrefixKeys(qc, keys, refetchType);
  if (options?.entityIdByTable) {
    for (const [table, id] of options.entityIdByTable) {
      markEntityInvalidated(table, id);
    }
  }
}

/** Tutte le tabelle operative (polling fallback Realtime). */
export function allGestionaleOperationalTables(): string[] {
  return Object.keys(GESTIONALE_TABLE_QUERY_KEYS);
}
