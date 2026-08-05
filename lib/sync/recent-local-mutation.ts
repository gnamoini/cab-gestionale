/** Soppressione eco Realtime sulla stessa tab dopo mutazione locale / optimistic update. */

export const RECENT_ENTITY_MS = 8_000;
/** Burst breve per mutazioni bulk senza id row (es. store schede ottimistico). */
const RECENT_TABLE_BURST_MS = 3_000;

const recentEntityKeys = new Map<string, number>();
const recentTableBursts = new Map<string, number>();

function prune(now: number): void {
  for (const [k, t] of recentEntityKeys) {
    if (now - t > RECENT_ENTITY_MS) recentEntityKeys.delete(k);
  }
  for (const [k, t] of recentTableBursts) {
    if (now - t > RECENT_TABLE_BURST_MS) recentTableBursts.delete(k);
  }
}

function entityKey(table: string, entityId: string): string {
  return `${table}:${entityId}`;
}

/** Segna mutazione locale recente per tabella + entity id (sopprime eco Realtime mirato). */
export function markRecentLocalGestionaleMutation(tables: string[], entityId?: string): void {
  if (!entityId) return;
  const now = Date.now();
  prune(now);
  for (const table of tables) {
    if (!table) continue;
    recentEntityKeys.set(entityKey(table, entityId), now);
  }
}

/** Burst tabella senza id row (finestra breve, solo path ottimistico esplicito). */
export function markRecentLocalTableBurst(tables: string[]): void {
  const now = Date.now();
  prune(now);
  for (const table of tables) {
    if (!table) continue;
    recentTableBursts.set(table, now);
  }
}

import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";

/** Segna da eventi cab-sync con id noto. */
export function markRecentLocalGestionaleFromCabEvents(cabSyncEvents?: CabSyncEvent[]): void {
  if (!cabSyncEvents?.length) return;
  for (const ev of cabSyncEvents) {
    if (ev.type === "settings_updated" || ev.type === "SETTINGS_PROPAGATION_DRIFT_DETECTED") continue;
    const table = ev.table;
    if (table && ev.id) markRecentLocalGestionaleMutation([table], ev.id);
  }
}

/** Segna da mappa tabella→entity id (dispatch local_mutation senza cab events). */
export function markRecentLocalGestionaleFromEntityIdByTable(
  entityIdByTable?: ReadonlyMap<string, string> | Record<string, string>,
): void {
  if (!entityIdByTable) return;
  const entries =
    entityIdByTable instanceof Map ? [...entityIdByTable.entries()] : Object.entries(entityIdByTable);
  for (const [table, entityId] of entries) {
    if (table && entityId) markRecentLocalGestionaleMutation([table], entityId);
  }
}

function hasRecentEntityOnTable(table: string, now: number): boolean {
  const prefix = `${table}:`;
  for (const [key, timestamp] of recentEntityKeys) {
    if (!key.startsWith(prefix)) continue;
    if (now - timestamp <= RECENT_ENTITY_MS) return true;
  }
  return false;
}

export function shouldSuppressRemoteCacheInvalidation(table: string, entityId?: string): boolean {
  const now = Date.now();
  prune(now);
  if (entityId) {
    const key = recentEntityKeys.get(entityKey(table, entityId));
    if (key != null && now - key <= RECENT_ENTITY_MS) return true;
  }
  if (!entityId && hasRecentEntityOnTable(table, now)) return true;
  const burst = recentTableBursts.get(table);
  if (burst != null && now - burst <= RECENT_TABLE_BURST_MS) return true;
  return false;
}

export function filterTablesForRemoteCacheInvalidation(
  tables: string[],
  entityIdByTable?: ReadonlyMap<string, string>,
): string[] {
  return tables.filter((table) => {
    const entityId = entityIdByTable?.get(table);
    return !shouldSuppressRemoteCacheInvalidation(table, entityId);
  });
}

/** Per test / debug. */
export function clearRecentLocalGestionaleMutations(): void {
  recentEntityKeys.clear();
  recentTableBursts.clear();
}

/** Test: segna entity con timestamp arbitrario (verifica finestra RECENT_ENTITY_MS). */
export function markRecentLocalGestionaleMutationAt(
  tables: string[],
  entityId: string,
  timestamp: number,
): void {
  for (const table of tables) {
    if (!table) continue;
    recentEntityKeys.set(entityKey(table, entityId), timestamp);
  }
}
