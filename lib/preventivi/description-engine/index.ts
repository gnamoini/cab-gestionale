export type {
  AiPolishConstraints,
  AiPolishResult,
  AiRejectReason,
  ComposedDescription,
  ConfidenceFactors,
  ConfidenceTier,
  DescriptionActivityOverride,
  DescriptionEngineInput,
  DescriptionEngineMeta,
  DescriptionSourceType,
  DetailLevel,
  GeneratedDescriptionLine,
  OverrideAction,
  OverrideStatus,
} from "./types";

export {
  generatePreventivoDescription,
  generateLegacyOnlyDescription,
  ensureTkbSeedPublished,
  resetDescriptionEngineDevState,
} from "./description-engine";

export { buildGenerationContextHash, newGenerationId, nextGenerationSequence } from "./generation-identity";
export { validateNoAnonymousLines, linesToClienteText } from "./provenance";
export { applyOperatorOverrides, diffOverridesFromEdit, markOverridesObsolete } from "./operator-overrides";
export { polishDescriptionWithAi, DEFAULT_AI_POLISH_CONSTRAINTS } from "./ai-polish";
export { DEFAULT_STYLE_PROFILE, resolveDetailLevel } from "./style-profile";

export { buildPersistGenerationPayload, persistGenerationClient } from "./generation-persist";

export {
  queueDescriptionSuggestion,
  approveDescriptionSuggestion,
  rejectDescriptionSuggestion,
  listPendingSuggestions,
} from "./learning-suggestions";

export { computeOperatorAcceptanceRate, countTechnicalHallucinations } from "./usage-metrics";
