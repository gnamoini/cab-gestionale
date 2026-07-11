import { shouldAutoApply } from "@/lib/entity-resolution/entity-resolution-confidence";
import { stripDictionaryTokens } from "@/lib/entity-resolution/dictionary-tokens";
import {
  canonicalizeEntityName,
  entityNormKey,
  normalizeEntityInput,
  type EntityNormalizeOptions,
} from "@/lib/entity-resolution/entity-normalizer";
import { exactCandidateInPool, type EntityResolutionIndex } from "@/lib/entity-resolution/entity-resolution-index";
import { getEntityResolverConfig } from "@/lib/entity-resolution/entity-resolver-registry";
import type { KnownCorrectionsStore } from "@/lib/entity-resolution/known-corrections";
import type { ResolutionCacheStore } from "@/lib/entity-resolution/resolution-cache";
import { lookupAlias } from "@/lib/entity-resolution/settings-aliases";
import { combinedFuzzyScore } from "@/lib/entity-resolution/fuzzy-scorers";
import {
  ENTITY_RESOLUTION_VERSIONS,
  type EntityCandidate,
  type EntityResolutionCandidate,
  type EntityResolutionResult,
  type EntityType,
  type ResolutionReason,
  type ResolutionStrategy,
} from "@/lib/entity-resolution/entity-resolution-types";

export type ResolveEntityInput = {
  entityType: EntityType;
  fieldKey: string;
  originalValue: string;
  pool: readonly EntityCandidate[];
  restrictedPool?: readonly EntityCandidate[];
  parentFieldKeys: string[];
  index: EntityResolutionIndex;
  corrections: KnownCorrectionsStore;
  cache: ResolutionCacheStore;
  llmResolver?: (input: {
    entityType: EntityType;
    original: string;
    candidates: EntityResolutionCandidate[];
  }) => Promise<{ label: string | null; confidence: number } | null>;
};

function normOpts(config: ReturnType<typeof getEntityResolverConfig>): EntityNormalizeOptions {
  return {
    unicode: config.normalize.unicode,
    stripLegalSuffix: config.normalize.stripLegalSuffix,
    stripGeographic: config.normalize.stripGeographic,
    punctuation: config.normalize.punctuation,
    dictionary: true,
  };
}

function buildUnresolved(
  input: ResolveEntityInput,
  normalizedValue: string,
  reason: ResolutionReason,
  candidates: EntityResolutionCandidate[],
  started: number,
): EntityResolutionResult {
  return {
    status: "unresolved",
    entityType: input.entityType,
    fieldKey: input.fieldKey,
    originalValue: input.originalValue,
    normalizedValue,
    resolvedLabel: null,
    resolvedId: null,
    confidence: 0,
    strategy: "none",
    reason,
    matchedBy: reason,
    candidateList: candidates,
    parentFieldKeys: input.parentFieldKeys,
    poolSize: input.pool.length,
    poolRestricted: Boolean(input.restrictedPool?.length),
    warnings: ["Nessuna corrispondenza affidabile nelle impostazioni"],
    durationMs: performance.now() - started,
    versions: { ...ENTITY_RESOLUTION_VERSIONS },
    manualOverride: false,
    cacheHit: false,
  };
}

function resolvedResult(
  input: ResolveEntityInput,
  normalizedValue: string,
  candidate: EntityCandidate,
  confidence: number,
  strategy: ResolutionStrategy,
  reason: ResolutionReason,
  matchedBy: string,
  candidates: EntityResolutionCandidate[],
  started: number,
  cacheHit: boolean,
): EntityResolutionResult {
  return {
    status: "resolved",
    entityType: input.entityType,
    fieldKey: input.fieldKey,
    originalValue: input.originalValue,
    normalizedValue,
    resolvedLabel: candidate.label,
    resolvedId: candidate.id,
    confidence,
    strategy,
    reason,
    matchedBy,
    candidateList: candidates,
    parentFieldKeys: input.parentFieldKeys,
    poolSize: input.pool.length,
    poolRestricted: Boolean(input.restrictedPool?.length),
    warnings: [],
    durationMs: performance.now() - started,
    versions: { ...ENTITY_RESOLUTION_VERSIONS },
    manualOverride: false,
    cacheHit,
  };
}

function ambiguousResult(
  input: ResolveEntityInput,
  normalizedValue: string,
  candidates: EntityResolutionCandidate[],
  started: number,
): EntityResolutionResult {
  return {
    status: "ambiguous",
    entityType: input.entityType,
    fieldKey: input.fieldKey,
    originalValue: input.originalValue,
    normalizedValue,
    resolvedLabel: null,
    resolvedId: null,
    confidence: candidates[0]?.score ?? 0,
    strategy: "none",
    reason: "ambiguous",
    matchedBy: "ambiguous",
    candidateList: candidates,
    parentFieldKeys: input.parentFieldKeys,
    poolSize: input.pool.length,
    poolRestricted: Boolean(input.restrictedPool?.length),
    warnings: ["Ambiguità rilevata: conferma richiesta"],
    durationMs: performance.now() - started,
    versions: { ...ENTITY_RESOLUTION_VERSIONS },
    manualOverride: false,
    cacheHit: false,
  };
}

function rankFuzzy(query: string, pool: readonly EntityCandidate[]): EntityResolutionCandidate[] {
  return pool
    .map((c) => ({ id: c.id, label: c.label, score: combinedFuzzyScore(query, c.label), reason: "fuzzy_typo" as const }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export async function resolveEntity(input: ResolveEntityInput): Promise<EntityResolutionResult> {
  const started = performance.now();
  const trimmed = input.originalValue.trim();
  const config = getEntityResolverConfig(input.entityType);
  const opts = normOpts(config);

  if (!trimmed) {
    return buildUnresolved(input, "", "unresolved", [], started);
  }

  const cached = config.strategies.includes("known_correction") ? input.cache.lookup(input.entityType, trimmed) : null;
  if (cached) {
  const candidate: EntityCandidate = { id: cached.resolvedId, label: cached.resolvedLabel };
    return resolvedResult(
      input,
      trimmed,
      candidate,
      cached.confidence,
      cached.strategy,
      cached.reason,
      "resolution_cache",
      [{ id: candidate.id, label: candidate.label, score: cached.confidence, reason: cached.reason }],
      started,
      true,
    );
  }

  const normalizedValue = normalizeEntityInput(trimmed, opts);
  const searchPools: EntityCandidate[][] = [];
  if (input.restrictedPool?.length) searchPools.push([...input.restrictedPool]);
  searchPools.push([...input.pool]);

  // Known OCR correction
  if (config.useKnownCorrections) {
    const known = input.corrections.lookup(input.entityType, trimmed);
    if (known) {
      const candidate: EntityCandidate = { id: known.resolvedId, label: known.resolvedLabel };
      return resolvedResult(
        input,
        normalizedValue,
        candidate,
        1,
        "known_correction",
        "known_ocr_correction",
        "known_ocr_correction",
        [{ id: candidate.id, label: candidate.label, score: 1, reason: "known_ocr_correction" }],
        started,
        false,
      );
    }
  }

  for (const pool of searchPools) {
    if (pool.length === 0) continue;
    const restricted = pool === input.restrictedPool;

    // Exact
    const exact = exactCandidateInPool(trimmed, pool, { stripLegalSuffix: config.normalize.stripLegalSuffix });
    if (exact) {
      return resolvedResult(
        input,
        normalizedValue,
        exact,
        1,
        "exact",
        "exact_match",
        restricted ? "hierarchy_constraint:exact" : "exact_match",
        [{ id: exact.id, label: exact.label, score: 1, reason: "exact_match" }],
        started,
        false,
      );
    }

    // Canonical
    const labels = pool.map((p) => p.label);
    const canonicalLabel = canonicalizeEntityName(trimmed, labels, opts);
    if (canonicalLabel && canonicalLabel !== trimmed) {
      const canonHit = exactCandidateInPool(canonicalLabel, pool, { stripLegalSuffix: config.normalize.stripLegalSuffix });
      if (canonHit) {
        const reason: ResolutionReason = trimmed.toLowerCase().includes("srl") || trimmed.toLowerCase().includes("spa")
          ? "canonical_legal_suffix"
          : "canonical_first_token";
        return resolvedResult(
          input,
          normalizedValue,
          canonHit,
          0.98,
          "canonical",
          reason,
          reason,
          [{ id: canonHit.id, label: canonHit.label, score: 0.98, reason }],
          started,
          false,
        );
      }
    }

    // Alias
    if (config.useAliases) {
      const alias = lookupAlias(input.index.aliasMap, input.entityType, trimmed);
      if (alias) {
        const aliasCandidate =
          pool.find((p) => entityNormKey(p.label, opts) === entityNormKey(alias.canonicalLabel, opts)) ??
          ({ id: alias.entityId, label: alias.canonicalLabel } satisfies EntityCandidate);
        return resolvedResult(
          input,
          normalizedValue,
          aliasCandidate,
          0.97,
          "alias",
          "alias_settings",
          "alias_settings",
          [{ id: aliasCandidate.id, label: aliasCandidate.label, score: 0.97, reason: "alias_settings" }],
          started,
          false,
        );
      }
    }

    // Dictionary strip + retry exact/canonical
    const dictStripped = stripDictionaryTokens(trimmed);
    if (dictStripped !== trimmed) {
      const dictExact = exactCandidateInPool(dictStripped, pool, { stripLegalSuffix: config.normalize.stripLegalSuffix });
      if (dictExact) {
        return resolvedResult(
          input,
          normalizedValue,
          dictExact,
          0.96,
          "dictionary",
          "dictionary_token",
          "dictionary_token",
          [{ id: dictExact.id, label: dictExact.label, score: 0.96, reason: "dictionary_token" }],
          started,
          false,
        );
      }
    }
  }

  const fuzzyPool = input.restrictedPool?.length ? input.restrictedPool : input.pool;
  let fuzzyRanked: EntityResolutionCandidate[] = [];
  if (config.allowFuzzy && fuzzyPool.length > 0) {
    fuzzyRanked = rankFuzzy(trimmed, fuzzyPool);
    const top = fuzzyRanked[0];
    const second = fuzzyRanked[1];
    if (top && shouldAutoApply(input.entityType, top.score, top.score, second?.score ?? 0)) {
      const hit = fuzzyPool.find((p) => p.label === top.label) ?? { id: top.id, label: top.label };
      return resolvedResult(
        input,
        normalizedValue,
        hit,
        top.score,
        "fuzzy",
        "fuzzy_typo",
        `fuzzy:${top.score.toFixed(3)}`,
        fuzzyRanked,
        started,
        false,
      );
    }
  }

  // LLM last resort
  if (config.allowLlm && input.llmResolver && fuzzyRanked.length > 0) {
    const llm = await input.llmResolver({
      entityType: input.entityType,
      original: trimmed,
      candidates: fuzzyRanked,
    });
    if (llm?.label) {
      const hit = fuzzyPool.find((p) => p.label === llm.label);
      if (hit && llm.confidence >= 0.88) {
        return resolvedResult(
          input,
          normalizedValue,
          hit,
          llm.confidence,
          "llm_semantic",
          "llm_validation",
          "llm_validation",
          fuzzyRanked,
          started,
          false,
        );
      }
    }
  }

  if (fuzzyRanked.length >= 2) {
    const top = fuzzyRanked[0]!;
    const second = fuzzyRanked[1]!;
    if (top.score - second.score < getEntityResolverConfig(input.entityType).candidateGapMin) {
      return ambiguousResult(input, normalizedValue, fuzzyRanked, started);
    }
  }

  if (fuzzyRanked.length === 1 && fuzzyRanked[0]!.score >= 0.7) {
    return ambiguousResult(input, normalizedValue, fuzzyRanked, started);
  }

  return buildUnresolved(input, normalizedValue, "unresolved", fuzzyRanked, started);
}

export function manualResolutionResult(
  input: Pick<ResolveEntityInput, "entityType" | "fieldKey" | "originalValue"> & {
    chosenLabel: string;
    chosenId?: string | null;
    normalizedValue?: string;
  },
): EntityResolutionResult {
  const normalizedValue = input.normalizedValue ?? input.originalValue.trim();
  return {
    status: "resolved",
    entityType: input.entityType,
    fieldKey: input.fieldKey,
    originalValue: input.originalValue,
    normalizedValue,
    resolvedLabel: input.chosenLabel,
    resolvedId: input.chosenId ?? null,
    confidence: 1,
    strategy: "manual",
    reason: "manual_confirmation",
    matchedBy: "manual_confirmation",
    candidateList: [{ id: input.chosenId ?? null, label: input.chosenLabel, score: 1, reason: "manual_confirmation" }],
    parentFieldKeys: [],
    poolSize: 0,
    poolRestricted: false,
    warnings: [],
    durationMs: 0,
    versions: { ...ENTITY_RESOLUTION_VERSIONS },
    manualOverride: true,
    cacheHit: false,
  };
}
