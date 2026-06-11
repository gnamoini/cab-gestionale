export type SelectorSurface = "dropdown" | "sheet";

export type QuerySurface = "trigger" | "sheet";

export type SelectorSuggestionsMeta = {
  totalCount: number;
  truncated: boolean;
  empty: boolean;
};

export type SelectorDomain =
  | "lavorazioni"
  | "addetti"
  | "mezzi"
  | "magazzino"
  | "schede"
  | "report"
  | "dashboard_filters"
  | "security"
  | "dipendenti";

export type SheetRolloutStatus = "ENABLED" | "DISABLED" | "PARTIAL" | "GRADUAL";

export type SelectorContextMode = "selectOnly" | "searchable" | "default";

export type SelectorContext = {
  domain: SelectorDomain | string;
  mode: SelectorContextMode;
  optionCount: number;
  isMobile: boolean;
  isDynamicList: boolean;
  isOperationalFilter: boolean;
  rolloutKey?: string;
  userRole?: string;
  mobileSheetEnabled?: boolean;
  mobileSheetMode?: "selectOnly" | "searchable" | "off";
  minSheetOptions?: number;
};

export type SelectorSurfaceKind = "dropdown" | "sheet" | "searchableDropdown";

export type SelectorSurfaceDecision = {
  surface: SelectorSurfaceKind;
  reasoning: string[];
  flags: {
    usesSheet: boolean;
    usesSearch: boolean;
    isSelectOnly: boolean;
  };
  matchedRules?: string[];
  fallbackUsed?: boolean;
  decisionLatencyMs?: number;
  traceId?: string;
};

export type DecisionRuleBand = "2-5" | "6-20" | "20-100" | "100+";

export type OptionCountBucket = DecisionRuleBand;

/** @advisory v4 — offline analytics only, not used by runtime decision engine */
export type SelectorDomainUsageStats = {
  totalOpens: number;
  surfaceCounts: Record<SelectorSurfaceKind, number>;
  bucketCounts: Record<OptionCountBucket, number>;
  searchUsageRate: number;
  sheetUsageRate: number;
  dropdownRate: number;
  fallbackRate: number;
  avgDecisionLatencyMs: number;
  mobileRate: number;
  dropdownAbandonRate: null;
};

/** @advisory v4 — offline analytics only */
export type SelectorAdaptiveSuggestedSurface = SelectorSurfaceKind | "review_config";

/** @advisory v4 — offline analytics only */
export type SelectorAdaptiveInsight = {
  domain: string;
  currentBehavior: {
    preferredSurface: SelectorSurfaceKind;
    usageStats: SelectorDomainUsageStats;
  };
  recommendation: {
    suggestedSurface: SelectorAdaptiveSuggestedSurface;
    confidence: number;
    reason: string[];
  };
};

/** @advisory v4 — offline analytics only */
export type SelectorAdaptiveReport = {
  generatedAt: string;
  eventCount: number;
  insights: SelectorAdaptiveInsight[];
};

export type SelectorMismatchPattern = {
  domain: string;
  pattern: "highSearchWithDropdown" | "highFallback" | "highLatencySheet";
  severity: "low" | "medium" | "high";
};

/** @advisory v5 — offline promotion only, not used by runtime decision engine */
export type SelectorConfigProposalStatus = "proposed" | "approved" | "rejected";

/** @advisory v5 */
export type SelectorProposedChange = {
  surfacePreference?: SelectorSurfaceKind;
  thresholdAdjustment?: number;
  rolloutAdjustment?: SheetRolloutStatus;
};

/** @advisory v5 */
export type SelectorConfigProposal = {
  id: string;
  targetDomain: string;
  proposedChange: SelectorProposedChange;
  evidence: {
    metricsSummary: SelectorDomainUsageStats;
    supportingInsights: string[];
  };
  riskAssessment: {
    riskLevel: "low" | "medium" | "high";
    reasons: string[];
  };
  status: SelectorConfigProposalStatus;
  /** Domain-adjusted confidence (v5.1). */
  confidence: number;
  /** Raw insight confidence before domain weighting (v5.1). */
  rawConfidence?: number;
  sampleSize: number;
  createdAt: string;
  version: number;
};

/** @advisory v5 — merge slice (rollout + threshold only) */
export type SelectorConfigMergeSlice = {
  rolloutByDomain: Record<string, SheetRolloutStatus>;
  sheetMinOptions: number;
};

/** @deprecated v5.2 — use SelectorConfigMergeSlice */
export type SelectorConfigSnapshot = SelectorConfigMergeSlice;

/** @advisory v5.2 — static engine config shape stored in runtime snapshots */
export type SelectorEngineConfigShape = {
  rolloutByDomain: Record<string, SheetRolloutStatus>;
  thresholds: {
    sheetMinOptions: number;
    optionCountBands: readonly [5, 20, 100];
  };
  defaultBehavior: {
    fallbackSurface: "dropdown";
    mobileSheetEnabled: boolean;
    defaultMode: "default";
    defaultDomain: "unknown";
  };
};

/** @advisory v5.2 — immutable runtime configuration snapshot */
export type SelectorRuntimeSnapshot = {
  version: string;
  timestamp: number;
  config: SelectorEngineConfigShape;
  provenance: {
    appliedProposals: string[];
    ignoredProposals: string[];
    registryVersion: number;
    /** v5.3.2 — allow sheetMinOptions decrease vs baseline */
    allowThresholdRegression?: boolean;
    /** v5.3.2 — allow reintroducing more permissive rollout vs active */
    allowPermissiveRollback?: boolean;
  };
  /** v5.3 — SHA256 of config slice for runtime sanity guard */
  schemaHash?: string;
};

/** @advisory v5.3 — runtime pointer (only variable in bundle selection) */
export type SelectorSnapshotPointer = {
  activeVersion: string;
  previousVersion: string;
  status: "stable" | "rolling_back" | "deploying";
  updatedAt: number;
};

/** @advisory v5.3 — snapshot lifecycle in canonical store */
export type SnapshotLifecycleState = "proposed" | "validated" | "staged" | "active";

/** @advisory v5.3.2 — retention class for GC and bundle pinning */
export type SnapshotRetentionClass = "active" | "previous_safe" | "pinned" | "archived";

/** @advisory v5.2 — active snapshot pointer (canonical store) */
export type SelectorSnapshotManifest = {
  activeVersion: string;
  updatedAt: string;
  versions: string[];
  /** v5.3 — per-version lifecycle state */
  lifecycle?: Record<string, SnapshotLifecycleState>;
  /** v5.3.2 — explicitly pinned rollback-safe versions */
  pinnedVersions?: string[];
  /** v5.3.2 — retention class per version */
  retention?: Record<string, SnapshotRetentionClass>;
};

/** @advisory v5.3 — schema validation result */
export type SnapshotValidationResult = {
  valid: true;
  schemaHash: string;
};

/** @advisory v5.2 — snapshot vs active artifact consistency check */
export type SnapshotConsistencyResult = {
  consistent: boolean;
  expected: SelectorRuntimeSnapshot;
  actual: SelectorRuntimeSnapshot;
  diff: string[];
};

/** @advisory v5 */
export type SelectorAbSimulationMetrics = {
  searchEfficiency: number;
  dropdownEfficiency: number;
  fallbackRate: number;
};

/** @advisory v5 */
export type SelectorAbSimulationVariance = {
  bucketDrift: number;
  mobileShareDrift: number;
};

/** @advisory v5 */
export type SelectorAbSimulationOutcome = {
  proposalId: string;
  current: SelectorAbSimulationMetrics;
  proposed: SelectorAbSimulationMetrics;
  fallbackReductionPotential: number;
  recommendation: "favor_proposed" | "favor_current" | "inconclusive";
  /** v5.1 — simulation vs real telemetry distribution drift */
  varianceVsReal?: SelectorAbSimulationVariance;
};

/** @advisory v5.1 — offline config factory output */
export type EffectiveConfigBuildResult = {
  snapshot: SelectorConfigMergeSlice;
  mergeVersion: number;
  appliedProposalIds: string[];
};

/** @advisory v5.1 — post-apply validation loop output */
export type SelectorValidationResult = {
  proposalId: string;
  predictedOutcome: unknown;
  actualOutcome: unknown;
  delta: {
    accuracyScore: number;
    deviationFlags: string[];
  };
};

/** @advisory v5.1 — telemetry distribution for AB calibration */
export type TelemetryDistribution = {
  bucketShares: Record<OptionCountBucket, number>;
  mobileShare: number;
  domainShares: Record<string, number>;
};

/** @advisory v5.1 — calibration profile for AB simulator */
export type CalibrationProfile = {
  distribution: TelemetryDistribution;
  totalEvents: number;
};

/** @advisory v5.1 @deprecated v5.2 — use SnapshotConsistencyResult */
export type RegistryConsistencyResult = {
  consistent: boolean;
  expected: SelectorConfigMergeSlice;
  actual: SelectorConfigMergeSlice;
  diff: string[];
};

/** @advisory v5 */
export type SelectorPromotionLogEntry = {
  id: string;
  proposalId: string;
  action: "proposed" | "approved" | "rejected" | "rollback";
  timestamp: string;
  actor: "system" | "human";
  note?: string;
  previousVersion?: number;
};

/** @advisory v5 */
export type PromotionRegistrySnapshot = {
  version: number;
  proposals: SelectorConfigProposal[];
  log: SelectorPromotionLogEntry[];
};

/** @advisory v5 */
export type PromotionRegistryState = PromotionRegistrySnapshot & {
  rollbackSnapshots: PromotionRegistrySnapshot[];
};
