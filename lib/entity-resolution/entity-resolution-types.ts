export type EntityType =
  | "MARCA"
  | "MODELLO"
  | "CLIENTE"
  | "CANTIERE"
  | "UTILIZZATORE"
  | "FORNITORE"
  | "CATEGORIA"
  | "RICAMBIO"
  | "OPERATORE"
  | "TIPO_ATTREZZATURA"
  | "TIPO_TELAIO"
  | "MEZZO_IDENT"
  | "GENERIC";

export type ResolutionStrategy =
  | "exact"
  | "canonical"
  | "alias"
  | "known_correction"
  | "dictionary"
  | "hierarchy"
  | "graph"
  | "fuzzy"
  | "llm_semantic"
  | "manual"
  | "none";

export type ResolutionReason =
  | "exact_match"
  | "canonical_legal_suffix"
  | "canonical_geographic"
  | "canonical_first_token"
  | "alias_settings"
  | "known_ocr_correction"
  | "dictionary_token"
  | "hierarchy_constraint"
  | "graph_constraint"
  | "fuzzy_typo"
  | "llm_validation"
  | "manual_confirmation"
  | "unresolved"
  | "ambiguous";

export type ResolutionVersions = {
  algorithm: string;
  normalizer: string;
  resolver: string;
  dictionary: string;
};

export const ENTITY_RESOLUTION_VERSIONS: ResolutionVersions = {
  algorithm: "1.0.0",
  normalizer: "1.0.0",
  resolver: "1.0.0",
  dictionary: "1.0.0",
};

export type EntityCandidate = {
  id: string | null;
  label: string;
  meta?: Record<string, unknown>;
};

export type EntityResolutionCandidate = {
  id: string | null;
  label: string;
  score: number;
  excludedBy?: string;
  reason?: ResolutionReason;
};

export type EntityResolutionResult = {
  status: "resolved" | "ambiguous" | "unresolved";
  entityType: EntityType;
  fieldKey: string;
  originalValue: string;
  normalizedValue: string;
  resolvedLabel: string | null;
  resolvedId: string | null;
  confidence: number;
  strategy: ResolutionStrategy;
  reason: ResolutionReason;
  matchedBy: string;
  candidateList: EntityResolutionCandidate[];
  parentFieldKeys: string[];
  poolSize: number;
  poolRestricted: boolean;
  warnings: string[];
  durationMs: number;
  versions: ResolutionVersions;
  manualOverride: boolean;
  manualOverrideBy?: string;
  cacheHit: boolean;
};

export type EntityResolutionAuditRecord = {
  fieldKey: string;
  entityType: EntityType;
  original: string;
  normalized: string;
  candidateList: EntityResolutionCandidate[];
  chosen: { label: string | null; id: string | null };
  confidence: number;
  reason: ResolutionReason;
  strategy: ResolutionStrategy;
  elapsedMs: number;
  manualOverride: boolean;
  versions: ResolutionVersions;
  cacheHit: boolean;
};

export type ResolutionAuditBundle = {
  captureId?: string;
  companyId?: string;
  totalDurationMs: number;
  fieldCount: number;
  resolvedCount: number;
  ambiguousCount: number;
  unresolvedCount: number;
  llmInvocations: number;
  cacheHits: number;
  fields: EntityResolutionAuditRecord[];
  versions: ResolutionVersions;
};

export type KnownOcrCorrection = {
  entityType: EntityType;
  ocrNormKey: string;
  ocrRawSample: string;
  resolvedLabel: string;
  resolvedId: string | null;
  hitCount: number;
};

export type ResolutionCacheEntry = {
  entityType: EntityType;
  ocrHash: string;
  resolvedLabel: string;
  resolvedId: string | null;
  confidence: number;
  reason: ResolutionReason;
  strategy: ResolutionStrategy;
  versions: ResolutionVersions;
};

export type EntityAliasesMap = Record<string, string[]>;
