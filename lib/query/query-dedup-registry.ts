export type DedupScope = "list" | "detail" | "report" | "payload" | "header" | "sidebar" | string;

export type DedupEntry = {
  key: string;
  promise: Promise<unknown>;
  entityType: string;
  entityId?: string;
  scope: DedupScope;
  startedAt: number;
  consumerTags: Set<string>;
};

const MAX_ENTRIES = 200;

const inFlight = new Map<string, DedupEntry>();

export function buildDedupKey(queryKey: readonly unknown[]): string {
  try {
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
}

export function getInFlight(key: string): DedupEntry | undefined {
  return inFlight.get(key);
}

function evictIfNeeded(): void {
  if (inFlight.size <= MAX_ENTRIES) return;
  let oldestKey: string | null = null;
  let oldestAt = Infinity;
  for (const [k, entry] of inFlight) {
    if (entry.startedAt < oldestAt) {
      oldestAt = entry.startedAt;
      oldestKey = k;
    }
  }
  if (oldestKey) inFlight.delete(oldestKey);
}

export function registerInFlight(entry: DedupEntry): void {
  evictIfNeeded();
  inFlight.set(entry.key, entry);
}

export function resolveInFlight(key: string): void {
  inFlight.delete(key);
}

export function rejectInFlight(key: string): void {
  inFlight.delete(key);
}

export function clearDedupForQueryKey(queryKey: readonly unknown[]): void {
  inFlight.delete(buildDedupKey(queryKey));
}

export function clearDedupForEntity(entityType: string, entityId?: string): void {
  const prefix = entityId ? `${entityType}:${entityId}` : entityType;
  for (const [key, entry] of inFlight) {
    if (entry.entityType === entityType && (!entityId || entry.entityId === entityId)) {
      inFlight.delete(key);
      continue;
    }
    if (key.includes(prefix)) inFlight.delete(key);
  }
}

export function getActiveDedupEntries(): ReadonlyMap<string, DedupEntry> {
  return inFlight;
}

export function resetDedupRegistry(): void {
  inFlight.clear();
}
