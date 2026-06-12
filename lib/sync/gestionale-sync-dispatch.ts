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
} from "@/lib/sync/recent-local-mutation";
import { shouldSkipEntityRefetch } from "@/lib/sync/recent-entity-invalidation";
import { reconcileGestionaleCabEvents, type ReconcileSource } from "@/lib/sync/gestionale-reconcile";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/lib/schede/schede-store-events";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";

/** Origine del cambiamento — un solo entry point (`dispatchGestionaleAction`). */
export type GestionaleActionSource = "local_mutation" | "realtime" | "broadcast" | "reconnect";

export type DispatchGestionaleActionOptions = {
  source: GestionaleActionSource;
  cabSyncEvents?: CabSyncEvent[];
  entityIdByTable?: ReadonlyMap<string, string>;
  skipCacheInvalidation?: boolean;
};

/** @deprecated Usare `DispatchGestionaleActionOptions`. */
export type DispatchGestionaleRemoteChangeOptions = {
  emitLocalCabSync?: boolean;
  cabSyncEvents?: CabSyncEvent[];
  skipCacheInvalidation?: boolean;
  entityIdByTable?: ReadonlyMap<string, string>;
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
    if (ev.type === "settings_updated" || !ev.id || !ev.table) continue;
    map.set(ev.table, ev.id);
  }
  for (const table of tables) {
    if (map.has(table)) continue;
    const match = cabEvents.find((e) => e.type !== "settings_updated" && e.table === table && e.id);
    if (match && match.type !== "settings_updated") map.set(table, match.id);
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
      primaryCabEvent.entity === entity
    ) {
      continue;
    }

    const hasExplicit = cabEvents.some(
      (e) => e.type !== "settings_updated" && (e.table === t || e.entity === entity),
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
  }

  const fp = gestionaleDispatchFingerprint(uniqueTables, cabEvents);
  if (shouldSkipDispatch(fp)) return;

  gestionaleDispatchAppliedTotal += 1;
  incrementHealthCounter("gestionale_dispatch_applied", 1);

  const entityIdByTable = buildEntityIdByTable(uniqueTables, cabEvents, options.entityIdByTable);
  const tablesForCache = options.skipCacheInvalidation
    ? []
    : filterTablesForCacheInvalidation(uniqueTables, entityIdByTable, options.source);

  if (tablesForCache.length > 0) {
    invalidateGestionaleTables(qc, tablesForCache, {
      entityIdByTable,
      cabSyncEvents: cabEvents,
      immediate: options.source === "local_mutation" || hasDestructiveCabEvents(cabEvents),
    });
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

/**
 * Cambiamento remoto (Realtime / BroadcastChannel).
 * @deprecated Preferire `dispatchGestionaleAction` con source esplicita.
 */
export function dispatchGestionaleRemoteChange(
  qc: QueryClient,
  tables: string[],
  cabSyncEvent?: CabSyncEvent,
  options?: DispatchGestionaleRemoteChangeOptions,
): void {
  const cabSyncEvents: CabSyncEvent[] = [];
  if (cabSyncEvent) cabSyncEvents.push(cabSyncEvent);
  if (options?.cabSyncEvents?.length) cabSyncEvents.push(...options.cabSyncEvents);

  dispatchGestionaleAction(qc, tables, {
    source: "realtime",
    cabSyncEvents: cabSyncEvents.length > 0 ? cabSyncEvents : undefined,
    entityIdByTable: options?.entityIdByTable,
    skipCacheInvalidation: options?.skipCacheInvalidation,
  });
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
