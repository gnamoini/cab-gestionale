import { ocrNormKey } from "@/lib/entity-resolution/entity-normalizer";
import type {
  EntityType,
  ResolutionCacheEntry,
  ResolutionReason,
  ResolutionStrategy,
  ResolutionVersions,
} from "@/lib/entity-resolution/entity-resolution-types";

export type ResolutionCacheStore = {
  lookup(entityType: EntityType, ocrValue: string): ResolutionCacheEntry | null;
};

export function createInMemoryResolutionCacheStore(
  rows: readonly ResolutionCacheEntry[],
): ResolutionCacheStore {
  const map = new Map<string, ResolutionCacheEntry>();
  for (const row of rows) {
    map.set(`${row.entityType}:${row.ocrHash}`, row);
  }
  return {
    lookup(entityType, ocrValue) {
      const hash = ocrNormKey(ocrValue, entityType);
      return map.get(`${entityType}:${hash}`) ?? null;
    },
  };
}

export function emptyResolutionCacheStore(): ResolutionCacheStore {
  return { lookup: () => null };
}

export function buildCacheEntry(input: {
  entityType: EntityType;
  ocrValue: string;
  resolvedLabel: string;
  resolvedId: string | null;
  confidence: number;
  reason: ResolutionReason;
  strategy: ResolutionStrategy;
  versions: ResolutionVersions;
}): ResolutionCacheEntry {
  return {
    entityType: input.entityType,
    ocrHash: ocrNormKey(input.ocrValue, input.entityType),
    resolvedLabel: input.resolvedLabel,
    resolvedId: input.resolvedId,
    confidence: input.confidence,
    reason: input.reason,
    strategy: input.strategy,
    versions: input.versions,
  };
}
