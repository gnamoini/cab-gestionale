"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  CLIENT_PORTAL_SYNC_TABLES,
  isClientPortalSyncTable,
} from "@/lib/lavorazioni/client-portal-sync-tables";
import { dispatchClientPortalRefresh } from "@/lib/lavorazioni/client-portal-sync";
import {
  invalidateGestionaleTables,
} from "@/lib/realtime/gestionale-realtime-config";
import {
  broadcastCabSyncEvent,
  broadcastGestionaleInvalidate,
  getGestionaleTabId,
} from "@/lib/sync/cab-realtime-broadcast";
import {
  cabSyncEntityFromTable,
  emitCabSyncEvent,
  type CabSyncEntity,
  type CabSyncEvent,
} from "@/lib/sync/cab-sync-bus";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/src/hooks/use-lavorazione-schede-store-sync";

export type DispatchGestionaleRemoteChangeOptions = {
  /** Propaga ad altre tab via BroadcastChannel (default false). */
  broadcast?: boolean;
  /** Emetti cab-sync locale (default true se cabSyncEvent fornito). */
  emitLocalCabSync?: boolean;
  /** Eventi cab-sync aggiuntivi oltre a quelli derivati dalle tabelle. */
  cabSyncEvents?: CabSyncEvent[];
};

const recentDispatchFingerprints = new Map<string, number>();
const DISPATCH_DEDUP_MS = 5000;

function pruneDispatchFingerprints(now: number): void {
  for (const [k, t] of recentDispatchFingerprints) {
    if (now - t > DISPATCH_DEDUP_MS) recentDispatchFingerprints.delete(k);
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
  return false;
}

function syntheticCabSyncFromTable(table: string): CabSyncEvent | null {
  const entity = cabSyncEntityFromTable(table);
  if (!entity) return null;
  return { type: "entity_updated", entity, id: "", table };
}

function dispatchPortalSideEffects(tables: string[]): void {
  const touchesPortal = tables.some((t) => isClientPortalSyncTable(t));
  if (!touchesPortal) return;
  dispatchClientPortalRefresh();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LAVORAZIONI_SCHEDE_STORE_CHANGED));
  }
}

function invalidateTables(qc: QueryClient, tables: string[]): void {
  invalidateGestionaleTables(qc, tables);
}

/**
 * Applica invalidazione cache + cab-sync + eventi portale.
 * Usato da Realtime bridge, broadcast receiver e mutazioni locali.
 */
export function dispatchGestionaleRemoteChange(
  qc: QueryClient,
  tables: string[],
  cabSyncEvent?: CabSyncEvent,
  options?: DispatchGestionaleRemoteChangeOptions,
): void {
  const uniqueTables = [...new Set(tables.filter(Boolean))];
  if (uniqueTables.length === 0 && !cabSyncEvent && !options?.cabSyncEvents?.length) return;

  const cabEvents: CabSyncEvent[] = [];
  if (cabSyncEvent) cabEvents.push(cabSyncEvent);
  for (const t of uniqueTables) {
    const entity = cabSyncEntityFromTable(t);
    if (
      cabSyncEvent &&
      cabSyncEvent.type !== "settings_updated" &&
      entity &&
      cabSyncEvent.entity === entity
    ) {
      continue;
    }
    const syn = syntheticCabSyncFromTable(t);
    if (syn) cabEvents.push(syn);
  }
  if (options?.cabSyncEvents?.length) cabEvents.push(...options.cabSyncEvents);

  const fp = gestionaleDispatchFingerprint(uniqueTables, cabEvents);
  if (shouldSkipDispatch(fp)) return;

  invalidateTables(qc, uniqueTables);
  dispatchPortalSideEffects(uniqueTables);

  const emitLocal = options?.emitLocalCabSync !== false;
  if (emitLocal) {
    for (const ev of cabEvents) emitCabSyncEvent(ev);
  }
}

/** Dopo mutazione locale: invalida questa tab e propaga alle altre. */
export function dispatchGestionaleLocalMutation(
  qc: QueryClient,
  tables: string[],
  cabSyncEvents?: CabSyncEvent[],
): void {
  dispatchGestionaleRemoteChange(qc, tables, undefined, {
    broadcast: false,
    emitLocalCabSync: true,
    cabSyncEvents,
  });

  broadcastGestionaleInvalidate(tables);
  for (const ev of cabSyncEvents ?? []) {
    broadcastCabSyncEvent(ev);
  }
  for (const table of tables) {
    const syn = syntheticCabSyncFromTable(table);
    if (syn) broadcastCabSyncEvent(syn);
  }
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
