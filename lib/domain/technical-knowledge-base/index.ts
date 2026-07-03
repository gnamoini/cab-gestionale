export type {
  BenchmarkCase,
  BenchmarkReport,
  CatalogActivity,
  CatalogActivityType,
  InterventoActivityOverride,
  PublishTkbResult,
  RicambioMatchQuality,
  TkbBuildReport,
  TkbCategoria,
  TkbCompatibilita,
  TkbComponente,
  TkbDraftBundle,
  TkbIntervento,
  TkbKbStats,
  TkbMatchInput,
  TkbMatchResult,
  TkbProcedure,
  TkbPublishStatus,
  TkbPublishedSnapshot,
  TkbRicambioMapEntry,
  TkbSearchIndex,
  TkbSintomo,
  TkbSourceFragment,
} from "./types";

export { canonicalizeDraftBundle, canonicalizeSlug } from "./canonicalize";
export { TKB_PIPELINE_VERSION, TKB_BUILDER_VERSION, TKB_BUILD_VERSION } from "./versions";

export { sha256Canonical, canonicalJsonStringify } from "./hash";
export {
  computeAggregateConfidence,
  confidenceTierFromScore,
  emptyConfidenceFactors,
} from "./confidence-model";
export type { ConfidenceTier } from "./confidence-model";
export {
  filterActivitiesByDetailLevel,
  resolveInterventoActivities,
  sortResolvedActivities,
} from "./procedure-resolver";
export { matchInterventi, pickPrimaryMatch } from "./tkb-matcher";
export {
  buildPublishedSnapshot,
  hashDraftBundle,
  hashPublishedSnapshot,
  validateTkbDraftBundle,
  TkbValidationError,
} from "./tkb-snapshot-builder";
export { createTkbSeedDraft } from "./tkb-seed";
export {
  getLatestMemorySnapshot,
  getMemorySnapshotByVersion,
  listMemorySnapshots,
  loadPublishedTkbSnapshot,
  publishTkbDraft,
  resetMemorySnapshots,
} from "./tkb-publish";
