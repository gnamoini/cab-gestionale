import { ocrNormKey } from "@/lib/entity-resolution/entity-normalizer";
import type { EntityType, KnownOcrCorrection } from "@/lib/entity-resolution/entity-resolution-types";

export type KnownCorrectionsStore = {
  lookup(entityType: EntityType, ocrValue: string): KnownOcrCorrection | null;
};

export function createInMemoryKnownCorrectionsStore(
  rows: readonly KnownOcrCorrection[],
): KnownCorrectionsStore {
  const map = new Map<string, KnownOcrCorrection>();
  for (const row of rows) {
    map.set(row.ocrNormKey, row);
  }
  return {
    lookup(entityType, ocrValue) {
      const key = ocrNormKey(ocrValue, entityType);
      const hit = map.get(key);
      if (!hit || hit.entityType !== entityType) return null;
      return hit;
    },
  };
}

export function emptyKnownCorrectionsStore(): KnownCorrectionsStore {
  return { lookup: () => null };
}

export type RecordKnownCorrectionInput = {
  entityType: EntityType;
  ocrValue: string;
  resolvedLabel: string;
  resolvedId?: string | null;
  source: "manual_confirm" | "ambiguity_pick" | "field_edit";
};

export function toKnownCorrectionRow(input: RecordKnownCorrectionInput): KnownOcrCorrection {
  return {
    entityType: input.entityType,
    ocrNormKey: ocrNormKey(input.ocrValue, input.entityType),
    ocrRawSample: input.ocrValue.trim(),
    resolvedLabel: input.resolvedLabel.trim(),
    resolvedId: input.resolvedId ?? null,
    hitCount: 1,
  };
}
