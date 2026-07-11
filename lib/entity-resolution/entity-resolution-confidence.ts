import type { EntityType } from "@/lib/entity-resolution/entity-resolution-types";

export type EntityConfidencePolicy = {
  autoApplyThreshold: number;
  candidateGapMin: number;
};

const DEFAULT_GAP = 0.15;

export const ENTITY_CONFIDENCE_POLICIES: Record<EntityType, EntityConfidencePolicy> = {
  OPERATORE: { autoApplyThreshold: 1.0, candidateGapMin: 0.2 },
  RICAMBIO: { autoApplyThreshold: 0.99, candidateGapMin: 0.2 },
  MEZZO_IDENT: { autoApplyThreshold: 0.98, candidateGapMin: 0.15 },
  CLIENTE: { autoApplyThreshold: 0.97, candidateGapMin: DEFAULT_GAP },
  FORNITORE: { autoApplyThreshold: 0.97, candidateGapMin: DEFAULT_GAP },
  CANTIERE: { autoApplyThreshold: 0.96, candidateGapMin: DEFAULT_GAP },
  MARCA: { autoApplyThreshold: 0.95, candidateGapMin: DEFAULT_GAP },
  MODELLO: { autoApplyThreshold: 0.95, candidateGapMin: DEFAULT_GAP },
  UTILIZZATORE: { autoApplyThreshold: 0.96, candidateGapMin: DEFAULT_GAP },
  CATEGORIA: { autoApplyThreshold: 0.95, candidateGapMin: DEFAULT_GAP },
  TIPO_ATTREZZATURA: { autoApplyThreshold: 0.95, candidateGapMin: DEFAULT_GAP },
  TIPO_TELAIO: { autoApplyThreshold: 0.95, candidateGapMin: DEFAULT_GAP },
  GENERIC: { autoApplyThreshold: 0.95, candidateGapMin: DEFAULT_GAP },
};

export function getConfidencePolicy(entityType: EntityType): EntityConfidencePolicy {
  return ENTITY_CONFIDENCE_POLICIES[entityType] ?? ENTITY_CONFIDENCE_POLICIES.GENERIC;
}

export function shouldAutoApply(
  entityType: EntityType,
  confidence: number,
  topScore: number,
  secondScore: number,
): boolean {
  const policy = getConfidencePolicy(entityType);
  if (confidence < policy.autoApplyThreshold) return false;
  if (secondScore > 0 && topScore - secondScore < policy.candidateGapMin) return false;
  return true;
}
