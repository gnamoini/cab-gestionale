import type { MicEntityType } from "@/lib/cache/mic-types";

const versions = new Map<string, number>();

function registryKey(entityType: MicEntityType, entityId: string): string {
  return `${entityType}:${entityId.trim()}`;
}

/** Monotonic client-side version bump for cache-bust tokens (`?v=`). */
export function bumpEntityVersion(entityType: MicEntityType, entityId: string): string {
  const key = registryKey(entityType, entityId);
  const next = (versions.get(key) ?? 0) + 1;
  versions.set(key, next);
  return String(next);
}

export function getEntityVersionToken(entityType: MicEntityType, entityId: string): string | undefined {
  const token = versions.get(registryKey(entityType, entityId));
  return token != null && token > 0 ? String(token) : undefined;
}

/**
 * Resolves cache-bust token for asset URLs.
 * DB timestamp wins when provided; otherwise uses client bump from MIC invalidation.
 */
export function resolveEntityCacheVersion(
  entityType: MicEntityType,
  entityId: string,
  dbVersion?: string,
): string | undefined {
  const db = dbVersion?.trim();
  if (db) return db;
  return getEntityVersionToken(entityType, entityId);
}
