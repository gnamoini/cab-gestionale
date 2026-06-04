import type { CabSyncEntity, CabSyncEvent } from "@/lib/sync/cab-sync-bus";

type CabSyncEventType = CabSyncEvent["type"];

const DEFAULT_TTL_MS = 10_000;
const suppressed = new Map<string, number>();

function suppressKey(entity: CabSyncEntity, type: CabSyncEventType, id: string): string {
  return `${entity}:${type}:${id}`;
}

function prune(now: number, ttlMs: number): void {
  for (const [k, at] of suppressed) {
    if (now - at > ttlMs) suppressed.delete(k);
  }
}

/** Evita toast cab-sync generici quando un bridge admin invia già un alert specifico (es. sotto scorta). */
export function markCabSyncToastSuppressed(
  entity: CabSyncEntity,
  type: CabSyncEventType,
  id: string,
  ttlMs = DEFAULT_TTL_MS,
): void {
  const trimmed = id.trim();
  if (!trimmed) return;
  suppressed.set(suppressKey(entity, type, trimmed), Date.now());
  prune(Date.now(), ttlMs);
}

export function isCabSyncToastSuppressed(event: CabSyncEvent, ttlMs = DEFAULT_TTL_MS): boolean {
  if (event.type === "settings_updated") return false;
  const id = event.id?.trim();
  if (!id) return false;
  const now = Date.now();
  prune(now, ttlMs);
  const key = suppressKey(event.entity, event.type, id);
  const at = suppressed.get(key);
  if (at == null) return false;
  if (now - at > ttlMs) {
    suppressed.delete(key);
    return false;
  }
  return true;
}

/** Solo per test. */
export function clearCabSyncToastSuppressions(): void {
  suppressed.clear();
}
