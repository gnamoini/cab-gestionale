"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  CLIENT_PORTAL_SYNC_TABLES,
  isClientPortalSyncTable,
} from "@/lib/lavorazioni/client-portal-sync-tables";
import { invalidateGestionaleTables } from "@/lib/realtime/gestionale-realtime-config";
import {
  broadcastGestionaleInvalidate,
  getGestionaleTabId,
} from "@/lib/sync/cab-realtime-broadcast";
import {
  cabSyncEntityFromTable,
  emitCabSyncEvent,
  type CabSyncEntity,
  type CabSyncEvent,
} from "@/lib/sync/cab-sync-bus";
import { dispatchNotificaGestionale } from "@/lib/sync/gestionale-notification-dispatch";
import { shouldDispatchNotificaForGestionaleAction } from "@/lib/sync/gestionale-notifica-gate";
import {
  filterTablesForRemoteCacheInvalidation,
  markRecentLocalGestionaleFromCabEvents,
  markRecentLocalGestionaleFromEntityIdByTable,
  shouldSuppressRemoteCacheInvalidation,
} from "@/lib/sync/recent-local-mutation";
import { shouldSkipEntityRefetch } from "@/lib/sync/recent-entity-invalidation";
import { reconcileGestionaleCabEvents, type ReconcileSource } from "@/lib/sync/gestionale-reconcile";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/lib/schede/schede-store-events";
import { getGestionaleDirtySyncMode } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { markGestionaleDirty, clearGestionaleDirty } from "@/lib/sync/gestionale-dirty-state";
import { decideGestionaleDirty } from "@/lib/sync/gestionale-dirty-decision";
import { resolveSyncEffects } from "@/lib/sync/gestionale-sync-policy";
import { incrementSyncMetric } from "@/lib/sync/gestionale-sync-metrics";
import { logGestionaleSyncPipelineStage } from "@/lib/sync/gestionale-sync-pipeline-trace";
import { resolveDomainForTable } from "@/lib/sync/gestionale-sync-scope";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";
import { recordStockInvalidateTelemetry } from "@/lib/magazzino/stock-merge-telemetry";
import { acknowledgeOperationalTableVersions } from "@/lib/sync/operational-data-version";
import { logClientPortalSyncPipelineDebug } from "@/lib/lavorazioni/lavorazioni-list-pipeline-debug";
import { getActiveCorrelationId } from "@/lib/observability/runtime-correlation-context";
import { collectQueryKeysForGestionaleTables } from "@/src/lib/react-query/invalidate-targets";

function isDocumentVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function clearDirtyForLocalMutation(
  tables: string[],
  entityIdByTable: ReadonlyMap<string, string>,
): void {
  for (const table of tables) {
    const entityId = entityIdByTable.get(table);
    if (entityId) {
      clearGestionaleDirty({ table, entityId });
      continue;
    }
    const domain = resolveDomainForTable(table);
    if (domain) clearGestionaleDirty({ domain });
  }
}

/** Origine del cambiamento — un solo entry point (`dispatchGestionaleAction`). */
export type GestionaleActionSource = "local_mutation" | "realtime" | "broadcast" | "reconnect";

export type DispatchGestionaleActionOptions = {
  source: GestionaleActionSource;
  cabSyncEvents?: CabSyncEvent[];
  entityIdByTable?: ReadonlyMap<string, string>;
  skipCacheInvalidation?: boolean;
};

const recentDispatchFingerprints = new Map<string, number>();
export const GESTIONALE_DISPATCH_DEDUP_MS = 5000;
let lastGestionaleDispatchAt = 0;
let gestionaleDispatchAppliedTotal = 0;

/** Totale dispatch applicati (non deduplicati) nella sessione tab. */
export function getGestionaleDispatchAppliedTotal(): number {
  return gestionaleDispatchAppliedTotal;
}

function pruneDispatchFingerprints(now: number): void {
  for (const [k, t] of recentDispatchFingerprints) {
    if (now - t > GESTIONALE_DISPATCH_DEDUP_MS) recentDispatchFingerprints.delete(k);
  }
}

/** Dedup burst identici (realtime + broadcast + mutation). */
export function gestionaleDispatchFingerprint(tables: string[], cabSyncEvents?: CabSyncEvent[]): string {
  const tablePart = [...new Set(tables)].sort().join("|");
  const eventPart = (cabSyncEvents ?? [])
    .map((e) => {
      if (e.type === "settings_updated") return "settings";
      if (e.type === "SETTINGS_PROPAGATION_DRIFT_DETECTED") {
        return `drift:${e.kind}:${e.jobId ?? e.oldLabel}:${e.newLabel}`;
      }
      return `${e.type}:${e.entity}:${e.id}`;
    })
    .sort()
    .join("|");
  return `${tablePart}::${eventPart}`;
}

function shouldSkipDispatch(fingerprint: string): boolean {
  const now = Date.now();
  pruneDispatchFingerprints(now);
  if (recentDispatchFingerprints.has(fingerprint)) return true;
  recentDispatchFingerprints.set(fingerprint, now);
  lastGestionaleDispatchAt = now;
  return false;
}

/** Timestamp ultimo dispatch applicato (per evitare snapshot recovery ridondante). */
export function getLastGestionaleDispatchAt(): number {
  return lastGestionaleDispatchAt;
}

function syntheticCabSyncFromTable(table: string, id?: string): CabSyncEvent | null {
  const entity = cabSyncEntityFromTable(table);
  if (!entity) return null;
  return { type: "entity_updated", entity, id: id ?? "", table };
}

function buildEntityIdByTable(
  tables: string[],
  cabEvents: CabSyncEvent[],
  explicit?: ReadonlyMap<string, string>,
): Map<string, string> {
  const map = new Map<string, string>(explicit);
  for (const ev of cabEvents) {
    if (ev.type === "settings_updated" || ev.type === "SETTINGS_PROPAGATION_DRIFT_DETECTED") continue;
    if (!ev.id || !ev.table) continue;
    map.set(ev.table, ev.id);
  }
  for (const table of tables) {
    if (map.has(table)) continue;
    const match = cabEvents.find(
      (e) =>
        e.type !== "settings_updated" &&
        e.type !== "SETTINGS_PROPAGATION_DRIFT_DETECTED" &&
        e.table === table &&
        e.id,
    );
    if (match && match.type !== "settings_updated" && match.type !== "SETTINGS_PROPAGATION_DRIFT_DETECTED") {
      map.set(table, match.id);
    }
  }
  return map;
}

function collectCabEvents(
  uniqueTables: string[],
  cabSyncEvents?: CabSyncEvent[],
  primaryCabEvent?: CabSyncEvent,
): CabSyncEvent[] {
  const cabEvents: CabSyncEvent[] = [];
  if (primaryCabEvent) cabEvents.push(primaryCabEvent);
  if (cabSyncEvents?.length) cabEvents.push(...cabSyncEvents);

  for (const t of uniqueTables) {
    const entity = cabSyncEntityFromTable(t);
    if (!entity) continue;

    if (
      primaryCabEvent &&
      primaryCabEvent.type !== "settings_updated" &&
      primaryCabEvent.type !== "SETTINGS_PROPAGATION_DRIFT_DETECTED" &&
      primaryCabEvent.entity === entity
    ) {
      continue;
    }

    const hasExplicit = cabEvents.some(
      (e) =>
        e.type !== "settings_updated" &&
        e.type !== "SETTINGS_PROPAGATION_DRIFT_DETECTED" &&
        (e.table === t || e.entity === entity),
    );
    if (hasExplicit) continue;

    const syn = syntheticCabSyncFromTable(t);
    if (syn) cabEvents.push(syn);
  }
  return cabEvents;
}

function reconcileSourceFromAction(source: GestionaleActionSource): ReconcileSource {
  if (source === "local_mutation") return "local_mutation";
  if (source === "reconnect") return "reconnect";
  return "realtime";
}

function hasDestructiveCabEvents(cabEvents: CabSyncEvent[]): boolean {
  return cabEvents.some((e) => e.type === "entity_created" || e.type === "entity_deleted");
}

function filterTablesForCacheInvalidation(
  tables: string[],
  entityIdByTable: ReadonlyMap<string, string>,
  source: GestionaleActionSource,
): string[] {
  let out = filterTablesForRemoteCacheInvalidation(tables, entityIdByTable);
  if (source === "realtime") {
    out = out.filter((table) => {
      const entityId = entityIdByTable.get(table);
      if (!entityId) return true;
      return !shouldSkipEntityRefetch(table, entityId);
    });
  }
  return out;
}

function dispatchPortalSideEffects(tables: string[]): void {
  const touchesPortal = tables.some((t) => isClientPortalSyncTable(t));
  if (!touchesPortal) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LAVORAZIONI_SCHEDE_STORE_CHANGED));
  }
}

export {
  cabSyncEventNotificaKey,
  shouldDispatchNotificaForCabEvent,
  shouldDispatchNotificaForGestionaleAction,
} from "@/lib/sync/gestionale-notifica-gate";

/**
 * Entry point unico per ogni mutazione/sync gestionale.
 *
 * Pipeline: dedup → invalidazione mirata (invalidate-targets) → portale → reconcile → cab-sync locale
 * Cross-tab broadcast solo per `local_mutation`.
 */
export function dispatchGestionaleAction(
  qc: QueryClient,
  tables: string[],
  options: DispatchGestionaleActionOptions,
): void {
  const uniqueTables = [...new Set(tables.filter(Boolean))];
  const cabEvents = collectCabEvents(uniqueTables, options.cabSyncEvents);
  if (uniqueTables.length === 0 && cabEvents.length === 0) return;

  if (options.source === "local_mutation") {
    markRecentLocalGestionaleFromCabEvents(options.cabSyncEvents);
    markRecentLocalGestionaleFromEntityIdByTable(options.entityIdByTable);
    acknowledgeOperationalTableVersions(uniqueTables);
  }

  const fp = gestionaleDispatchFingerprint(uniqueTables, cabEvents);
  if (shouldSkipDispatch(fp)) return;

  gestionaleDispatchAppliedTotal += 1;
  incrementHealthCounter("gestionale_dispatch_applied", 1);

  const entityIdByTable = buildEntityIdByTable(uniqueTables, cabEvents, options.entityIdByTable);

  if (options.source === "local_mutation") {
    clearDirtyForLocalMutation(uniqueTables, entityIdByTable);
  }

  let tablesForCache = options.skipCacheInvalidation
    ? []
    : filterTablesForCacheInvalidation(uniqueTables, entityIdByTable, options.source);

  if (!options.skipCacheInvalidation && tablesForCache.length > 0) {
    const resolved = resolveSyncEffects({
      source: options.source,
      tables: tablesForCache,
      entityIdByTable,
      cabEvents,
      flag: getGestionaleDirtySyncMode(),
    });

    if (resolved.dirtyEntries.length > 0 && isDocumentVisible()) {
      for (const entry of resolved.dirtyEntries) {
        const dirtyDecision = decideGestionaleDirty({
          table: entry.table,
          entityId: entry.entityId,
          source: options.source,
          queryClient: qc,
        });
        logGestionaleSyncPipelineStage(
          dirtyDecision.action === "skip" ? "dirty_skipped" : "dirty_decision",
          {
            table: entry.table,
            entityId: entry.entityId ?? undefined,
            reason: dirtyDecision.reason,
            source: options.source,
          },
        );
        if (dirtyDecision.action === "skip") {
          continue;
        }
        markGestionaleDirty(entry);
        logGestionaleSyncPipelineStage("dirty_marked", {
          table: entry.table,
          domain: entry.domain,
          source: entry.source,
        });
        incrementSyncMetric("gestionale_dirty_marked", 1, {
          domain: entry.domain,
          source: entry.source,
        });
        if (
          process.env.NODE_ENV === "development" &&
          isClientPortalSyncTable(entry.table)
        ) {
          logClientPortalSyncPipelineDebug({
            phase: "dirty_mark",
            correlationId: getActiveCorrelationId(),
            source: options.source,
            tables: [entry.table],
            entityId: entry.entityId ?? undefined,
            remoteVersion: entry.remoteVersion,
          });
        }
      }
    }

    if (resolved.dirtyEntries.length > 0) {
      incrementSyncMetric(
        "gestionale_invalidation_skipped",
        resolved.dirtyEntries.length,
      );
    }

    tablesForCache = resolved.invalidateTables;
  }

  if (tablesForCache.length > 0) {
    if (uniqueTables.some((t) => t === "magazzino_ricambi" || t === "movimenti_ricambi")) {
      recordStockInvalidateTelemetry(
        options.source === "local_mutation" ? "adjust" : "other",
      );
    }
    invalidateGestionaleTables(qc, tablesForCache, {
      entityIdByTable,
      cabSyncEvents: cabEvents,
      immediate: options.source === "local_mutation" || hasDestructiveCabEvents(cabEvents),
    });
    if (process.env.NODE_ENV === "development" && tablesForCache.some(isClientPortalSyncTable)) {
      logClientPortalSyncPipelineDebug({
        phase: "invalidate",
        correlationId: getActiveCorrelationId(),
        source: options.source,
        tables: tablesForCache,
        queryKeyInvalidated: collectQueryKeysForGestionaleTables(tablesForCache, { includePortal: true }),
      });
    }
    dispatchPortalSideEffects(tablesForCache);
  }

  reconcileGestionaleCabEvents(qc, cabEvents, reconcileSourceFromAction(options.source), {
    skipInvalidation: tablesForCache.length > 0,
  });

  const explicitCabEvents = options.cabSyncEvents;
  for (const ev of cabEvents) {
    emitCabSyncEvent(ev);
    if (shouldDispatchNotificaForGestionaleAction(ev, explicitCabEvents, options.source)) {
      dispatchNotificaGestionale(ev);
    }
  }

  if (options.source === "local_mutation") {
    broadcastGestionaleInvalidate(uniqueTables, entityIdByTable);
    const tkbTables = new Set([
      "lavorazioni",
      "scheda_lavorazione",
      "magazzino_ricambi",
      "preventivi",
      "attrezzature",
      "mezzi",
      "app_settings",
    ]);
    if (uniqueTables.some((t) => tkbTables.has(t))) {
      void import("@/src/actions/tkb-admin").then(({ enqueueTkbSyncAction }) => {
        for (const table of uniqueTables) {
          if (!tkbTables.has(table)) continue;
          const id = entityIdByTable?.get(table) ?? "bulk";
          void enqueueTkbSyncAction(table, id);
        }
      });
    }
  }
}

/** Dopo mutazione locale — delega a `dispatchGestionaleAction`. */
export function dispatchGestionaleLocalMutation(
  qc: QueryClient,
  tables: string[],
  cabSyncEvents?: CabSyncEvent[],
  entityIdByTable?: ReadonlyMap<string, string>,
): void {
  dispatchGestionaleAction(qc, tables, { source: "local_mutation", cabSyncEvents, entityIdByTable });
}

/** Tabelle portale per sync post-mutazione gestionale. */
export function gestionalePortalSyncTables(): readonly string[] {
  return CLIENT_PORTAL_SYNC_TABLES;
}

export { getGestionaleTabId };

/** Entità → evento cab-sync per mutazioni con id noto. */
export function cabSyncEventForEntity(
  entity: CabSyncEntity,
  id: string,
  type: "entity_created" | "entity_updated" | "entity_deleted" = "entity_updated",
  table?: string,
): CabSyncEvent {
  return { type, entity, id, table };
}
