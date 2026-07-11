import { dictionaryVersionHash } from "@/lib/entity-resolution/dictionary-tokens";
import {
  ENTITY_RESOLUTION_VERSIONS,
  type EntityResolutionAuditRecord,
  type EntityResolutionResult,
  type ResolutionAuditBundle,
} from "@/lib/entity-resolution/entity-resolution-types";

export function toResolutionAuditRecord(result: EntityResolutionResult): EntityResolutionAuditRecord {
  return {
    fieldKey: result.fieldKey,
    entityType: result.entityType,
    original: result.originalValue,
    normalized: result.normalizedValue,
    candidateList: result.candidateList,
    chosen: { label: result.resolvedLabel, id: result.resolvedId },
    confidence: result.confidence,
    reason: result.reason,
    strategy: result.strategy,
    elapsedMs: result.durationMs,
    manualOverride: result.manualOverride,
    versions: result.versions,
    cacheHit: result.cacheHit,
  };
}

export function toResolutionAuditBundle(input: {
  captureId?: string;
  companyId?: string;
  totalDurationMs: number;
  results: readonly EntityResolutionResult[];
  llmInvocations: number;
}): ResolutionAuditBundle {
  const fields = input.results
    .filter((r) => r.entityType !== "GENERIC" || r.status !== "unresolved")
    .map(toResolutionAuditRecord);

  return {
    captureId: input.captureId,
    companyId: input.companyId,
    totalDurationMs: input.totalDurationMs,
    fieldCount: fields.length,
    resolvedCount: fields.filter((f) => f.chosen.label).length,
    ambiguousCount: input.results.filter((r) => r.status === "ambiguous").length,
    unresolvedCount: input.results.filter((r) => r.status === "unresolved" && r.originalValue).length,
    llmInvocations: input.llmInvocations,
    cacheHits: input.results.filter((r) => r.cacheHit).length,
    fields,
    versions: {
      ...ENTITY_RESOLUTION_VERSIONS,
      dictionary: dictionaryVersionHash(),
    },
  };
}
