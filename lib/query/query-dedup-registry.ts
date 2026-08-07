export type DedupScope = "list" | "detail" | "report" | "payload" | "header" | "sidebar" | string;

export type DedupRejectReason = "timeout" | "cancelled" | "aborted" | "stale";

export const DEDUP_STALE_MS = 60_000;

export type DedupEntry = {
  key: string;
  promise: Promise<unknown>;
  entityType: string;
  entityId?: string;
  scope: DedupScope;
  startedAt: number;
  consumerTags: Set<string>;
  reject?: (reason: unknown) => void;
};

const MAX_ENTRIES = 200;

const inFlight = new Map<string, DedupEntry>();

export class DedupInFlightError extends Error {
  readonly reason: DedupRejectReason;

  constructor(reason: DedupRejectReason, message?: string) {
    super(message ?? `Dedup in-flight ${reason}`);
    this.name = "DedupInFlightError";
    this.reason = reason;
  }
}

function logDedupEvict(key: string, reason: DedupRejectReason, startedAt: number): void {
  void import("@/lib/observability/events").then(({ RuntimeEvents, trackRuntimeEvent }) => {
    trackRuntimeEvent(RuntimeEvents.queryStuck, {
      durationMs: Date.now() - startedAt,
      queryKey: key.slice(0, 240),
      reason,
      source: "dedup",
    });
  });
}

function evictInFlight(key: string, reason: DedupRejectReason): void {
  const entry = inFlight.get(key);
  if (!entry) return;
  inFlight.delete(key);
  logDedupEvict(key, reason, entry.startedAt);
  entry.reject?.(new DedupInFlightError(reason));
}

export function buildDedupKey(queryKey: readonly unknown[]): string {
  try {
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
}

/** Returns in-flight entry or evicts when older than `DEDUP_STALE_MS`. */
export function getInFlight(key: string): DedupEntry | undefined {
  const entry = inFlight.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.startedAt > DEDUP_STALE_MS) {
    evictInFlight(key, "timeout");
    return undefined;
  }
  return entry;
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
  if (oldestKey) evictInFlight(oldestKey, "stale");
}

export function registerInFlight(entry: DedupEntry): void {
  evictIfNeeded();
  inFlight.set(entry.key, entry);
}

export function resolveInFlight(key: string): void {
  inFlight.delete(key);
}

export function rejectInFlight(key: string, reason: DedupRejectReason = "cancelled"): void {
  evictInFlight(key, reason);
}

export function clearDedupForQueryKey(queryKey: readonly unknown[]): void {
  evictInFlight(buildDedupKey(queryKey), "cancelled");
}

export function clearDedupForEntity(entityType: string, entityId?: string): void {
  const prefix = entityId ? `${entityType}:${entityId}` : entityType;
  for (const [key, entry] of inFlight) {
    if (entry.entityType === entityType && (!entityId || entry.entityId === entityId)) {
      evictInFlight(key, "cancelled");
      continue;
    }
    if (key.includes(prefix)) evictInFlight(key, "cancelled");
  }
}

export function getActiveDedupEntries(): ReadonlyMap<string, DedupEntry> {
  return inFlight;
}

export function resetDedupRegistry(): void {
  for (const key of inFlight.keys()) {
    evictInFlight(key, "cancelled");
  }
}
