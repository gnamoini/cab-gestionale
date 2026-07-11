import type { AliasLookupEntry } from "@/lib/entity-resolution/settings-aliases";
import type { EntityCandidate, EntityType } from "@/lib/entity-resolution/entity-resolution-types";
import { entityNormKey } from "@/lib/entity-resolution/entity-normalizer";
import { findExactEntityInPool } from "@/lib/validation/global-entity-validation";

export type EntityResolutionIndex = {
  poolsByType: Map<EntityType, EntityCandidate[]>;
  aliasMap: Map<string, AliasLookupEntry>;
  labelByNormKey: Map<string, Map<string, string>>;
};

export function buildEntityResolutionIndex(input: {
  poolsByType: Partial<Record<EntityType, EntityCandidate[]>>;
  aliasMap: Map<string, AliasLookupEntry>;
}): EntityResolutionIndex {
  const labelByNormKey = new Map<string, Map<string, string>>();
  const poolsByType = new Map<EntityType, EntityCandidate[]>();

  for (const [entityType, pool] of Object.entries(input.poolsByType) as [EntityType, EntityCandidate[]][]) {
    poolsByType.set(entityType, pool ?? []);
    const normMap = new Map<string, string>();
    for (const c of pool ?? []) {
      const key = entityNormKey(c.label, { stripLegalSuffix: true, stripGeographic: true });
      if (key) normMap.set(key, c.label);
    }
    labelByNormKey.set(entityType, normMap);
  }

  return { poolsByType, aliasMap: input.aliasMap, labelByNormKey };
}

export function exactCandidateInPool(
  value: string,
  pool: readonly EntityCandidate[],
  options?: { stripLegalSuffix?: boolean },
): EntityCandidate | null {
  const labels = pool.map((p) => p.label);
  const hit = findExactEntityInPool(value, labels, { standardizeLegalSuffix: options?.stripLegalSuffix ?? false });
  if (!hit) return null;
  return pool.find((p) => p.label === hit) ?? { id: null, label: hit };
}

export function candidateLabels(pool: readonly EntityCandidate[]): string[] {
  return pool.map((p) => p.label);
}
