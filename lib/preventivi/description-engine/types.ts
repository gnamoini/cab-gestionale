/** SSOT tipi Description Engine (preventivi). */

export type DetailLevel = "compact" | "standard" | "technical";

export type DescriptionSourceType =
  | "tkb_procedure"
  | "tkb_intervento"
  | "tkb_ricambio_map"
  | "legacy_enrichment"
  | "legacy_heuristic"
  | "legacy_similarity"
  | "legacy_context"
  | "suggestion_approved"
  | "operator_rephrased"
  | "history_same_mezzo"
  | "history_same_client"
  | "history_similar_mezzo"
  | "history_similar_intervento";

export type ConfidenceFactors = {
  keywordMatch: number;
  componentMatch: number;
  symptomMatch: number;
  compatibility: number;
  legacyPenalty: number;
};

export type ConfidenceTier = "high" | "medium" | "low";

export type GeneratedDescriptionLine = {
  activityId: string | null;
  text: string;
  sourceType: DescriptionSourceType;
  sourceId: string;
  confidence: number;
  isVerifiedTechnical: boolean;
  sort: number;
  metadata?: Record<string, unknown>;
};

export type OverrideAction = "excluded" | "rephrased" | "moved";
export type OverrideStatus = "active" | "obsolete" | "reapplied";

export type DescriptionActivityOverride = {
  id: string;
  generationId: string;
  activityId: string;
  sourceType: DescriptionSourceType;
  sourceId: string;
  action: OverrideAction;
  overrideStatus: OverrideStatus;
  originalText: string;
  newText?: string;
  newSort?: number;
  reason?: string;
  obsoleteReason?: "kb_version_changed" | "activity_deprecated" | "superseded_by_regeneration";
  at: string;
  by: string;
  kbVersionAtOverride: number;
};

export type AiRejectReason =
  | "fingerprint_changed"
  | "technical_term_removed"
  | "blacklist_match"
  | "line_count_changed"
  | "commercial_tone_detected"
  | "max_chars_exceeded"
  | "forbidden_new_activity";

export type DescriptionEngineMeta = {
  engineVersion: "legacy_v1" | "tde_v1";
  generationId: string;
  generationContextHash: string;
  generationSequence: number;
  kbVersion: number;
  detailLevel: DetailLevel;
  confidence: number;
  confidenceTier: ConfidenceTier;
  confidenceFactors: ConfidenceFactors;
  generatedAt: string;
  matchedEntries: { slug: string; score: number; matchedBy: string[] }[];
  legacyEnrichment?: { chunks: string[]; linesAdded: number };
  operatorOverrides?: DescriptionActivityOverride[];
  fallback?: { used: boolean; reason: string; legacyEngine?: true };
  aiPolishApplied?: boolean;
  aiRejectReason?: AiRejectReason;
  semanticFingerprintPre?: string;
  semanticFingerprintPost?: string;
  suggestionIdsApplied?: string[];
  operativeHistory?: {
    candidatesEvaluated: number;
    topCaseId?: string;
    topTier: string;
    historyScore: number;
    tkbScore: number;
    fusedScore: number;
    clientBoostApplied: boolean;
  };
};

export type ComposedDescription = {
  lines: GeneratedDescriptionLine[];
  meta: DescriptionEngineMeta;
  clienteText: string;
};

export type DescriptionEngineInput = {
  technicalBlob: string;
  anomaliaText?: string;
  noteIntervento?: string;
  detailLevel?: DetailLevel;
  targetType?: "telaio" | "attrezzatura";
  tipoAttrezzatura?: string;
  marcaModello?: string;
  ricambi: { ricambioId: string | null; descrizione: string; codice: string }[];
  ctx: import("@/lib/preventivi/preventivi-descrizione-aggregator").DescrizionePreventivoContext;
  kbVersion?: number;
  generationSequence?: number;
  preventivoId?: string;
  lavorazioneId?: string;
  mezzoId?: string;
  cliente?: string;
  autore?: string;
  /** Snapshot pubblicato (da API server); evita seed in-memory. */
  publishedSnapshot?: import("@/lib/domain/technical-knowledge-base").TkbPublishedSnapshot;
  /** ponytail: opt-in via NEXT_PUBLIC_TDE_AI_POLISH=1 + polishFn esplicito */
  aiPolishFn?: (texts: string[]) => string[];
};

export type AiPolishConstraints = {
  forbidNewActivities: true;
  maxLineDelta: 0;
  maxCharsPerLine: number;
  preserveTechnicalTerms: string[];
  linguisticBlacklist: RegExp[];
  forbidCommercialTone: true;
  requireKbMatch: true;
  allowedOperations: readonly ("rephrase" | "dedupe" | "uniform_style")[];
};

export type AiPolishResult = {
  applied: boolean;
  rejectReason?: AiRejectReason;
  linesPre: string[];
  linesPost?: string[];
};

export function isVerifiedTechnicalSource(sourceType: DescriptionSourceType): boolean {
  return (
    sourceType === "tkb_procedure" ||
    sourceType === "tkb_intervento" ||
    sourceType === "tkb_ricambio_map" ||
    sourceType === "suggestion_approved"
  );
}
