/** Dedupe refetch remoto per entity id (broadcast + Realtime + batch invalidate). */

export const INVALIDATE_ENTITY_DEDUP_MS = 4_000;

const recentEntityInvalidations = new Map<string, number>();

function entityInvalidationKey(table: string, entityId: string): string {
  return `${table}:${entityId}`;
}

function prune(now: number): void {
  for (const [k, t] of recentEntityInvalidations) {
    if (now - t > INVALIDATE_ENTITY_DEDUP_MS) recentEntityInvalidations.delete(k);
  }
}

export function wasEntityRecentlyInvalidated(table: string, entityId?: string): boolean {
  if (!entityId) return false;
  const now = Date.now();
  prune(now);
  const key = entityInvalidationKey(table, entityId);
  const ts = recentEntityInvalidations.get(key);
  return ts != null && now - ts <= INVALIDATE_ENTITY_DEDUP_MS;
}

/** Alias semantico per skip refetch duplicato. */
export function shouldSkipEntityRefetch(table: string, entityId?: string): boolean {
  return wasEntityRecentlyInvalidated(table, entityId);
}

export function markEntityInvalidated(table: string, entityId?: string): void {
  if (!entityId) return;
  const now = Date.now();
  prune(now);
  recentEntityInvalidations.set(entityInvalidationKey(table, entityId), now);
}

export function markEntitiesInvalidated(entityIdByTable: ReadonlyMap<string, string>): void {
  for (const [table, entityId] of entityIdByTable) {
    markEntityInvalidated(table, entityId);
  }
}

/** Per test / debug. */
export function clearRecentEntityInvalidations(): void {
  recentEntityInvalidations.clear();
}
