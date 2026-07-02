export type {
  CatalogActivity,
  CatalogActivityType,
  InterventoActivityOverride,
  PublishTkbResult,
  RicambioMatchQuality,
  TkbCategoria,
  TkbCompatibilita,
  TkbComponente,
  TkbDraftBundle,
  TkbIntervento,
  TkbMatchInput,
  TkbMatchResult,
  TkbProcedure,
  TkbPublishStatus,
  TkbPublishedSnapshot,
  TkbRicambioMapEntry,
  TkbSintomo,
} from "./types";

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
