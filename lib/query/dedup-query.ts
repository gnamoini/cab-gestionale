import {
  buildDedupKey,
  getInFlight,
  registerInFlight,
  rejectInFlight,
  resolveInFlight,
  type DedupScope,
} from "@/lib/query/query-dedup-registry";
import {
  recordDedupHit,
  recordDedupMiss,
  recordDuplicateAttempt,
} from "@/lib/observability/query-dedup-audit";

export type DedupQueryMeta = {
  entityType?: string;
  entityId?: string;
  scope?: DedupScope;
  consumerTag?: string;
};

export async function dedupQuery<T>(
  queryKey: readonly unknown[],
  fetchFn: () => Promise<T>,
  meta?: DedupQueryMeta,
): Promise<T> {
  const key = buildDedupKey(queryKey);
  const existing = getInFlight(key);
  if (existing) {
    recordDuplicateAttempt(queryKey, meta);
    const otherTags = meta?.consumerTag ? [...existing.consumerTags] : undefined;
    if (meta?.consumerTag) existing.consumerTags.add(meta.consumerTag);
    recordDedupHit(queryKey, { ...meta, otherTags });
    void import("@/lib/observability/query-fetch-counter").then((m) => m.recordDedupFetchSkip());
    return existing.promise as Promise<T>;
  }

  recordDedupMiss(queryKey, meta);

  const consumerTags = new Set<string>();
  if (meta?.consumerTag) consumerTags.add(meta.consumerTag);

  let resolveOuter!: (value: T) => void;
  let rejectOuter!: (reason: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolveOuter = resolve;
    rejectOuter = reject;
  });

  registerInFlight({
    key,
    promise,
    entityType: meta?.entityType ?? "unknown",
    entityId: meta?.entityId,
    scope: meta?.scope ?? "list",
    startedAt: Date.now(),
    consumerTags,
  });

  void (async () => {
    try {
      const result = await fetchFn();
      resolveInFlight(key);
      resolveOuter(result);
    } catch (err) {
      rejectInFlight(key);
      rejectOuter(err);
    }
  })();

  return promise;
}
