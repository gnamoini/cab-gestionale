export type {
  InterventoContext,
  InterventoContextFetchDeps,
  InterventoContextInputs,
  InterventoContextMeta,
  InterventoDisplay,
  InterventoDisplayField,
  InterventoIdent,
  InterventoSourceOfTruth,
  LavorazioneSnapshot,
  MezzoSnapshot,
  SchedaIngressoSnapshot,
} from "@/lib/domain/intervento-context/intervento-context.types";

export {
  buildInterventoContext,
  composeInterventoContext,
  composeInterventoContextFromBundle,
  composeInterventoContextFromDraft,
  composeInterventoContextFromListRow,
  fetchInterventoContextInputs,
} from "@/lib/domain/intervento-context/build-intervento-context";

export {
  interventoClienteLabel,
  interventoMacchinaLabel,
  interventoMezzoIdentLabel,
  resolveInterventoDisplay,
  resolveInterventoIdent,
} from "@/lib/domain/intervento-context/resolve-intervento-display";

export {
  hasInterventoIdentValue,
  interventoIdentEquals,
  normalizeInterventoIdent,
  resolveIdentFromLayers,
} from "@/lib/domain/intervento-context/intervento-ident";

export {
  auditInterventoContext,
  buildIdentDeltaFromContext,
  type InterventoAuditEvent,
  type InterventoAuditPayload,
} from "@/lib/domain/intervento-context/intervento-audit";

export {
  createInterventoTransaction,
  executeInterventoWrite,
  isInterventoWriteV2Enabled,
  isInterventoWriteV2ShadowEnabled,
  type CreateInterventoStage,
  type CreateInterventoTransactionPlan,
  type CreateInterventoTransactionResult,
  type InterventoWriteExecutionOutcome,
  type WriteExecutionTrace,
} from "@/lib/domain/intervento-context/write-contract";

export {
  createWriteExecutionTrace,
  finalizeTrace,
  finalizeWriteTrace,
  logWriteExecutionTraceIfDebug,
  recordTraceStep,
  type WriteExecutionTraceMode,
  type WriteExecutionTraceStep,
  type WriteExecutionTraceStepName,
  type WriteExecutionTraceStepStatus,
} from "@/lib/domain/intervento-context/write-execution-trace";

export type {
  InterventoWritePlan,
  InterventoWriteResult,
  InterventoWriteStage,
} from "@/lib/domain/intervento-context/intervento-write-types";

export {
  resolveInterventoDisplayForSurface,
  resolveInterventoIdentForSurface,
  schedaIngressoFieldsFromDisplay,
  type InterventoDisplaySurface,
  type InterventoDisplaySurfaceInputs,
} from "@/lib/domain/intervento-context/resolve-intervento-display-for-surface";

export {
  canonicalInputsFromPreventivoContext,
  resolveInterventoCanonical,
  type InterventoCanonicalInputs,
  type InterventoCanonicalMode,
  type InterventoCanonicalResult,
} from "@/lib/domain/intervento-context/resolve-intervento-canonical";

export {
  assertInterventoExportAlignment,
} from "@/lib/domain/intervento-context/intervento-export-alignment";

export {
  logInterventoTelemetry,
  type InterventoTelemetryEvent,
  type InterventoTelemetryPayload,
} from "@/lib/domain/intervento-context/intervento-telemetry";
