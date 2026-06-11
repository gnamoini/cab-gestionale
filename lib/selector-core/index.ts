// Cognitive cluster barrel — enforcement reads export descriptor from this file.

export type {
  SelectorSurface,
  QuerySurface,
  SelectorSuggestionsMeta,
  SelectorDomain,
  SheetRolloutStatus,
  SelectorContext,
  SelectorContextMode,
  SelectorSurfaceKind,
  SelectorSurfaceDecision,
  DecisionRuleBand,
  OptionCountBucket,
  SelectorDomainUsageStats,
  SelectorAdaptiveSuggestedSurface,
  SelectorAdaptiveInsight,
  SelectorAdaptiveReport,
  SelectorMismatchPattern,
  SelectorConfigProposalStatus,
  SelectorProposedChange,
  SelectorConfigProposal,
  SelectorConfigMergeSlice,
  SelectorConfigSnapshot,
  SelectorEngineConfigShape,
  SelectorRuntimeSnapshot,
  SelectorSnapshotManifest,
  SelectorSnapshotPointer,
  SnapshotLifecycleState,
  SnapshotValidationResult,
  SnapshotConsistencyResult,
  SelectorAbSimulationMetrics,
  SelectorAbSimulationOutcome,
  SelectorPromotionLogEntry,
  PromotionRegistrySnapshot,
  PromotionRegistryState,
  EffectiveConfigBuildResult,
  SelectorValidationResult,
  SelectorAbSimulationVariance,
  TelemetryDistribution,
  CalibrationProfile,
  RegistryConsistencyResult,
} from "@/lib/selector-core/types";

export {
  rankOptions,
  orderSelectSuggestions,
  RANK_TIER_SELECTED,
  RANK_TIER_RECENT_BASE,
  type RankOptionsParams,
  type RankOverrideFn,
} from "@/lib/selector-core/selector-rank";

export { readSelectorRecents, pushSelectorRecent } from "@/lib/selector-core/selector-recents-store";

export {
  resolveSelectorSuggestions,
  type ResolveSelectorSuggestionsInput,
} from "@/lib/selector-core/resolve-selector-suggestions";

export {
  runSelectOptionAtomic,
  isSelectionInFlight,
  shouldIgnoreBlurDuringSelection,
  __resetSelectOptionAtomicForTests,
  type SelectOptionAtomicParams,
} from "@/lib/selector-core/select-option-atomic";

export {
  selectorEngineConfig,
  SHEET_MIN_OPTIONS,
  SELECTOR_SHEET_ROLLOUT_BY_DOMAIN,
} from "@/lib/selector-core/selector-engine-config";

export {
  SelectorDecisionEngine,
  toLegacySurface,
  hashSelectorContext,
  assertDeterministic,
  MOBILE_SHEET_MIN_OPTIONS,
  isSelectorDomainSheetRolloutEnabled,
  isSelectorSheetEligible,
  isSelectOnlyPolicyViolationPublic as isSelectOnlyPolicyViolation,
  warnSelectOnlyPolicyViolation,
  resolveDecisionRuleBand,
  shouldUpgradeToSearch,
} from "@/lib/selector-core/selector-decision-engine";

export { buildSelectorContext, type BuildSelectorContextInput } from "@/lib/selector-core/build-selector-context";

export {
  normalizeSelectorContext,
  createFallbackDecision,
  isContextRecoverable,
} from "@/lib/selector-core/selector-safe-fallback";

export {
  recordSelectorDecisionTrace,
  getTraceById,
  shouldRecordTrace,
  getSelectorDecisionTraceBuffer,
  clearSelectorDecisionTraceBuffer,
  type SelectorDecisionTrace,
} from "@/lib/selector-core/selector-decision-trace";

export {
  registerSelectorDecision,
  emitSelectorOpenFromUI,
  type SelectorOpenEvent,
  type SelectorOpenUiMeta,
} from "@/lib/selector-core/selector-telemetry-bridge";

export {
  emitSelectorOpenEvent,
  emitSelectorOpenTelemetry,
  bucketOptionCount,
  exportSelectorOpenEventSnapshot,
  getSelectorOpenEventBuffer,
  getSelectorTelemetryBuffer,
  clearSelectorTelemetryBuffer,
  type SelectorTelemetryEvent,
} from "@/lib/selector-core/selector-telemetry";

/** @advisory v5 */
export {
  DEFAULT_PROMOTION_REGISTRY_PATH,
  createEmptyRegistryState,
  loadPromotionRegistry,
  savePromotionRegistry,
  registerProposal,
  registerProposals,
  approveProposal,
  rejectProposal,
  rollbackToVersion,
  getProposalHistory,
  getActiveRegistryState,
} from "@/lib/selector-core/selector-config-promotion-registry";

/** @advisory v5.2 — runtime snapshot loader */
export {
  loadLatestSelectorSnapshot,
  resolveSelectorEngineConfig,
  __resetSelectorRuntimeLoaderForTests,
} from "@/lib/selector-core/selector-config-runtime-loader";

/** @advisory v5.2 — snapshot builder */
export {
  SELECTOR_ENGINE_CONFIG_BASE,
  SELECTOR_BASE_CONFIG_SHAPE,
  SELECTOR_BASE_SNAPSHOT_V0,
  mergeApprovedProposals,
  mergeSliceToEngineConfigShape,
  buildSelectorRuntimeSnapshot,
  buildSelectorRuntimeSnapshotDeterministic,
  runtimeSnapshotsEqual,
  diffRuntimeSnapshots,
} from "@/lib/selector-core/selector-config-snapshot";

/** @advisory v5.3 — schema validation gate (Node only) */
export {
  validateSnapshot,
  validateSnapshotOrThrow,
  attachSchemaHash,
  computeSchemaHash,
} from "@/lib/selector-core/selector-snapshot-schema-validator";

/** @advisory v5.3.1 — atomic pointer switch (Node only) */
export {
  DEFAULT_POINTER_PATH,
  atomicWriteJson,
  atomicWriteJsonVerified,
  verifyPointerWrite,
  readPointer,
  beginSnapshotTransaction,
  commitPointerSwitch,
  rollbackPointerTransaction,
  atomicPointerActivate,
  atomicPointerRollback,
} from "@/lib/selector-core/selector-snapshot-atomic-switch";

/** @advisory v5.3.2 — lifecycle manager */
export {
  MIN_ROLLBACK_BUFFER,
  classifySnapshotVersions,
  selectVersionsForBundleFromLifecycle,
} from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
export type { LifecycleClassification } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";

/** @advisory v5.3.2 — semantic cross-version validation */
export {
  validateSnapshotSemantics,
  validateSnapshotSemanticsOrThrow,
} from "@/lib/selector-core/selector-snapshot-semantic-validator";
export type {
  SemanticValidationResult,
  SemanticValidationOptions,
} from "@/lib/selector-core/selector-snapshot-semantic-validator";

/** @advisory v5.3.2 — distributed pointer guard */
export {
  buildPointerFingerprint,
  detectPointerDrift,
  assertPointerMonotonicity,
  reconcilePointerWithRetry,
  reconcilePointerWithRetrySync,
} from "@/lib/selector-core/selector-distributed-pointer-guard";
export type {
  PointerFingerprint,
  PointerDriftResult,
  ReconcilePointerOptions,
} from "@/lib/selector-core/selector-distributed-pointer-guard";

/** @advisory v5.3.2 — snapshot GC policy (Node only) */
export {
  RETENTION_DAYS,
  planSnapshotGc,
  planSnapshotGcAtTimestamp,
  planSnapshotGcWithTemporalValidation,
  validateGcTemporalSafety,
  applySnapshotGc,
  buildSnapshotDependencyGraph,
  isReachableInGraph,
} from "@/lib/selector-core/selector-snapshot-gc-policy";
export type {
  GcPlan,
  GcPlanEntry,
  GcApplyOptions,
  GcApplyResult,
  SnapshotDependencyGraph,
  GcTemporalSafetyResult,
} from "@/lib/selector-core/selector-snapshot-gc-policy";

/** @advisory v5.3.1 — bundle sync + pruning (Node only) */
export {
  DEFAULT_GENERATED_DIR,
  DEFAULT_GENERATED_SNAPSHOTS_DIR,
  DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH,
  DEFAULT_ROLLBACK_REGISTRY_GENERATED_PATH,
  syncSnapshotBundle,
  syncSnapshotBundleDetailed,
} from "@/lib/selector-core/selector-snapshot-bundle-sync";
export type { SyncSnapshotBundleResult } from "@/lib/selector-core/selector-snapshot-bundle-sync";

/** @advisory v5.3.1 — bounded bundle selection */
export {
  MAX_BUNDLED_SNAPSHOTS,
  compareSnapshotVersionRecency,
  sortVersionsByRecency,
  selectVersionsForBundle,
} from "@/lib/selector-core/selector-snapshot-pruner";

/** @advisory v5.3.1 — store/bundle/registry consistency (Node only) */
export {
  DEFAULT_BUNDLE_MANIFEST_PATH,
  writeBundleManifest,
  checkBundleRegistryConsistency,
  assertBundleRegistryConsistency,
} from "@/lib/selector-core/selector-bundle-registry-consistency-check";
export type {
  SelectorBundleManifest,
  BundleRegistryConsistencyResult,
} from "@/lib/selector-core/selector-bundle-registry-consistency-check";

/** @advisory v5.3.2 — build orchestrator phases (Node only) */
export {
  validateStoreSnapshots,
  buildSnapshotArtifacts,
  runSelectorBuildPipeline,
  resumeSelectorBuildPipeline,
  runSelectorBuildPhase,
  validatePhase,
  unifiedPolicyCheckPhase,
  buildPhase,
  syncPhase,
  verifyPhase,
  readBuildCheckpoint,
  writeBuildCheckpoint,
  clearBuildCheckpoint,
  buildOptionsFingerprint,
  DEFAULT_BUILD_CHECKPOINT_PATH,
  SELECTOR_BUILD_PHASE_ORDER,
} from "@/lib/selector-core/selector-build-orchestrator";
export type {
  BuildOrchestratorResult,
  BuildOrchestratorOptions,
  BuildPhaseName,
  BuildPhaseResult,
  BuildCheckpoint,
} from "@/lib/selector-core/selector-build-orchestrator";

/** @advisory v6.0 — unified policy check (Node/build-time only) */
export {
  runUnifiedPolicyCheck,
  assertCognitiveClusterApiBoundary,
} from "@/lib/selector-core/selector-api-usage-enforcer";
export type { UnifiedPolicyCheckResult } from "@/lib/selector-core/selector-api-usage-enforcer";
export { assertUnifiedPolicyCiGate } from "@/lib/selector-core/selector-api-usage-enforcer";

/** @advisory v6.2/v6.3 — observation layer + Cursor debug DSL (Node/build-time only) */
export {
  SelectorObservationIndex,
  OBSERVATION_EVENT_TYPES,
  resolveObservationDomainSlug,
  resolveDocMapForDomain,
  getSelectorObservationDocMap,
} from "@/lib/selector-core/selector-observation-registry";
export type {
  ObservationDomain,
  ObservationEventType,
  ObservationDocEntry,
  ObservationDocDomain,
} from "@/lib/selector-core/selector-observation-registry";
export {
  parseDebugQuery,
  executeDebugQuery,
  resolveTraceFlow,
  resolveModuleLookup,
  resolveImpactAnalysis,
} from "@/lib/selector-core/selector-debug-dsl-engine";
export type {
  CursorDebugResult,
  TraceFlowResolution,
  ModuleLookupResolution,
  ImpactAnalysisResolution,
  ParsedDebugQuery,
  DebugQueryKind,
} from "@/lib/selector-core/selector-debug-dsl-engine";
export { debugObservation } from "@/lib/selector-core/selector-debug-observation";

/** @advisory v6.3 — self-healing observation registry + explanation kernel */
export {
  DEBUG_DSL_REGISTRY,
} from "@/lib/selector-core/selector-debug-dsl-registry";
export type { DebugDslCommandKind } from "@/lib/selector-core/selector-debug-dsl-registry";
export {
  getObservationRegistry,
  rebuildObservationRegistry,
  refreshObservationRegistryArtifact,
} from "@/lib/selector-core/selector-observation-registry";
export {
  buildObservationRegistry,
  writeObservationRegistryArtifact,
} from "@/lib/selector-core/selector-observation-registry-builder";
export {
  resolveExplanation,
  resolveNavigationPath,
  traceObservation,
} from "@/lib/selector-core/selector-explanation-kernel";
export type {
  ExplanationResult,
  NavigationPathResult,
  ImpactAnalysisResult,
  TraceObservationInput,
  TraceObservationResult,
} from "@/lib/selector-core/selector-explanation-kernel";
export {
  reconstructArchitectureAt,
  reconstructSnapshotAt,
} from "@/lib/selector-core/selector-architecture-time-machine";
export type { ArchitectureTimeSnapshot } from "@/lib/selector-core/selector-architecture-time-machine";
export {
  rankObservationHints,
  flattenRankedHints,
} from "@/lib/selector-core/selector-observation-ranking-engine";
export type { RankedHints, ObservationDepth } from "@/lib/selector-core/selector-observation-ranking-engine";
/** @advisory v5.3.1 — build dependency guards (Node only) */
export {
  assertBoundedBundle,
  assertArtifactsVerifiable,
  assertNoImplicitOrdering,
} from "@/lib/selector-core/selector-build-dependency-guard";

/** @advisory v5.3.1 — runtime version resolver */
export {
  resolveEffectiveVersion,
  resolveActiveVersion,
  __resetVersionResolverForTests,
} from "@/lib/selector-core/selector-runtime-version-resolver";

/** @advisory v5.3.1 — runtime snapshot revalidation */
export {
  revalidateRuntimeSnapshot,
} from "@/lib/selector-core/selector-runtime-snapshot-revalidator";
export type {
  RuntimeRevalidationInput,
  RuntimeRevalidationResult,
} from "@/lib/selector-core/selector-runtime-snapshot-revalidator";

/** @advisory v5.3.2 — runtime sanity guard + drift detection */
export {
  isRuntimeSnapshotStructurallyValid,
  validateAtRuntime,
  detectRuntimeBundleDrift,
  predictDriftRisk,
} from "@/lib/selector-core/selector-runtime-sanity-guard";
export type {
  RuntimeDriftResult,
  DriftRiskLevel,
  DriftRiskResult,
} from "@/lib/selector-core/selector-runtime-sanity-guard";

/** @advisory v5.7 — frozen explainability entrypoint (intent via getExplanation second arg) */
export {
  getExplanation,
  getFallbackExplanation,
  getGcExplanation,
  getGcExplanationFromPlan,
  getSelectorExplanation,
  resolveExplainability,
  reconstructFallbackChain,
  resolveFallbackExplainability,
  toLegacyDegradationMode,
  traceFallbackResolution,
  getLastFallbackTrace,
  setLastFallbackTrace,
  isFallbackExplainabilityEnabled,
  __resetFallbackTraceForTests,
} from "@/lib/selector-core/selector-explainability";
export type {
  UnifiedExplanation,
  GcExplanation,
  LegacyExplainabilityDegradationMode,
  ExplainabilityDegradationMode,
  FallbackExplainabilityResult,
  ReconstructFallbackInput,
  FallbackTrace,
  FallbackSource,
  FallbackTraceInput,
  FallbackRejectedSource,
  CausalSemanticIntent,
} from "@/lib/selector-core/selector-explainability";

/** @advisory v5.5 — unified determinism gate */
export {
  assertPreResolutionConsistency,
  validateDeterminism,
  compareDeterminismContexts,
  evaluateDeterminismGate,
} from "@/lib/selector-core/selector-determinism-gate";
export { auditSelectorSystemComplexity } from "@/lib/selector-core/selector-determinism-gate-audit";
export type {
  PreResolutionInput,
  PreResolutionResult,
  DeterminismValidationResult,
  DeterminismDriftRiskLevel,
  DeterminismIntegrityResult,
  ComplexityAuditResult,
} from "@/lib/selector-core/selector-determinism-gate";

/** @advisory v5.3.3 — unified snapshot availability index */
export {
  getSnapshotAvailabilityMap,
  isVersionAvailable,
} from "@/lib/selector-core/selector-unified-snapshot-index";
export type {
  SnapshotAvailabilityEntry,
  SnapshotAvailabilityInput,
} from "@/lib/selector-core/selector-unified-snapshot-index";

/** @advisory v5.3.4 — runtime context snapshot for replay */
export {
  ALLOWED_ENV_KEYS,
  computeRegistryHash,
  buildEnvFingerprint,
  captureRuntimeContextSnapshot,
  getLastRuntimeContextSnapshot,
  __resetRuntimeContextSnapshotForTests,
} from "@/lib/selector-core/selector-runtime-context-snapshot";
export type {
  SelectorRuntimeContext,
  CaptureRuntimeContextInput,
} from "@/lib/selector-core/selector-runtime-context-snapshot";

/** @advisory v5.3.4 — distributed checkpoint manifest (Node only) */
export {
  resolveNodeId,
  readDistributedCheckpointManifest,
  writeDistributedCheckpointManifest,
  clearDistributedCheckpointManifest,
  recordNodeCheckpoint,
  readReconciledBuildCheckpoint,
  reconcileAndPersistCheckpoints,
  mergeDistributedManifests,
  DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH,
} from "@/lib/selector-core/selector-distributed-checkpoint-manager";
export type {
  NodeCheckpoint,
  DistributedCheckpointManifest,
  ReconcileResult,
} from "@/lib/selector-core/selector-distributed-checkpoint-manager";

/** @advisory v5.3 — snapshot store (Node only) */
export {
  DEFAULT_SNAPSHOT_STORE_DIR,
  DEFAULT_SNAPSHOT_MANIFEST_PATH,
  DEFAULT_ACTIVE_POINTER_PATH,
  listSnapshots,
  getSnapshot,
  saveSnapshot,
  validateSnapshotVersion,
  stageSnapshot,
  activateSnapshot,
  rollbackSnapshot,
  buildAndPublishSnapshot,
  readManifest,
  seedBaseSnapshots,
} from "@/lib/selector-core/selector-snapshot-registry";

/** @advisory v5.2 — snapshot consistency (Node only) */
export {
  buildEffectiveSelectorConfig,
  validateSnapshotConsistency,
  checkSnapshotConsistency,
  assertRuntimeSnapshotsMatch,
  assertSnapshotsMatch,
} from "@/lib/selector-core/selector-config-enforcer";

/** @advisory v5.2 */
export {
  assertRegistryApprovalGate,
  assertDeterministicFallback,
  assertNoOrphanApprovedProposals,
  assertSingleActiveSnapshot,
  assertSnapshotImmutability,
  runPrePublishGuardrails,
  snapshotsEqual,
  diffSnapshots,
} from "@/lib/selector-core/selector-hard-guardrails";

export {
  SELECTOR_SECURITY_GRADUAL_ENABLED,
  type SelectOnlyPolicyContext,
} from "@/lib/selector-core/selector-domain-policy";

export {
  runSelectorUsageScan,
  scanLegacyAutocompleteUsage,
  scanAddettiPillUsage,
  scanOperationalSelectOnlySites,
  assertMigrationGuardrail,
  SELECTOR_MIGRATION_MAX_COMPONENTS_PER_PR,
  type SelectorUsageScanReport,
  type SelectorUsageTarget,
} from "@/lib/selector-core/selector-usage-scan";

export { LEGACY_SELECTOR_ADAPTER_PHASE } from "@/lib/selector-core/legacy-selector-adapters";

export { deriveQuerySurface } from "@/lib/selector-core/derive-query-surface";
