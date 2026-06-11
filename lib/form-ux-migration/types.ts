/** Input kind supported by the form UX migration engine. */
export type FormUxInputKind =
  | "text"
  | "number"
  | "select"
  | "textarea"
  | "checkbox"
  | "numberStepper";

/** Stable form identifiers for rollout and telemetry. */
export type FormUxFormId =
  | "ricambio"
  | "scheda-ingresso"
  | "lavorazioni"
  | "mezzi"
  | "preventivi"
  | "settings";

/** Business domain for multi-form orchestration. */
export type FormUxDomain =
  | "ricambio"
  | "lavorazioni"
  | "mezzi"
  | "settings"
  | "preventivi";

export type FormUxCrossFormEventType =
  | "orchestrator_eval"
  | "orchestrator_submit"
  | "isolation_violation_blocked"
  | "rollback_scoped";

export type FormUxBoundaryPhase = 1 | 2 | 3 | 4;

export type FormUxGovernancePhase = 1 | 2 | 3 | 4;

export type FormUxGovernanceDriftType =
  | "boundary_platform"
  | "registry_resolved"
  | "multi_axis";

export type FormUxGovernanceDriftEvent = {
  formId?: FormUxFormId;
  platformPhase: FormUxGovernancePhase;
  boundaryPhase: FormUxGovernancePhase;
  registryPhase: FormUxGovernancePhase;
  resolvedPhase: FormUxGovernancePhase;
  driftType: FormUxGovernanceDriftType;
  autoReconciled: boolean;
  ts: number;
};

export type FormUxMapCompatibilityStatus = "CURRENT" | "LEGACY" | "FUTURE_INCOMPATIBLE";

export type FormUxMapVersionEvent = {
  fieldKey?: string;
  classifierVersion: string;
  eligibilityVersion: string;
  mapVersion: number;
  compatibilityStatus: FormUxMapCompatibilityStatus;
  ts: number;
};

export type FormUxGovernanceDecision = {
  phase: FormUxGovernancePhase;
  mode: "legacy" | "shadow" | "enforced";
  enforcement: "off" | "warn" | "soft" | "hard";
  routing: "legacy" | "orchestrator";
};

export type FormUxGovernanceState = {
  platformPhase: FormUxGovernancePhase;
  boundaryPhase: FormUxGovernancePhase;
  registryPhase: FormUxGovernancePhase;
  resolvedPhase: FormUxGovernancePhase;
  driftDetected: boolean;
  lastReconciliationAt: number;
};

export type GovernanceLayer = "boundary" | "platform" | "registry";

export type FormUxAuthorityViolationType =
  | "registry_escalation_attempt"
  | "platform_over_boundary"
  | "authority_ugp_divergence"
  | "enforcement_block"
  | "invalid_phase_escalation";

export type FormUxGovernanceAuthorityViolationEvent = {
  formId?: FormUxFormId;
  violatingLayer: GovernanceLayer;
  expectedAuthority: GovernanceLayer;
  actualAuthority: GovernanceLayer;
  violationType: FormUxAuthorityViolationType;
  severity: "info" | "warn" | "critical";
  ugpPhase?: FormUxGovernancePhase;
  authorityPhase?: FormUxGovernancePhase;
  ts: number;
};

export type FormUxAuthoritativeDecision = {
  phase: FormUxGovernancePhase;
  authoritySource: GovernanceLayer;
  mode: "legacy" | "shadow" | "enforced";
  enforcement: "off" | "warn" | "soft" | "hard";
  routing: "legacy" | "orchestrator";
  blocked: boolean;
};

export type FormUxCollapseMode = "shadow" | "active" | "fallback";
export type FormUxCollapseSource = "gaml" | "ugp";

export type FormUxCollapsedGovernanceDecision = {
  phase: FormUxGovernancePhase;
  mode: "legacy" | "shadow" | "enforced";
  enforcement: "off" | "warn" | "soft" | "hard";
  routing: "legacy" | "orchestrator";
  blocked: boolean;
  authoritySource: "gaml";
  collapsed: true;
};

export type FormUxGovernanceCollapseEvent = {
  formId?: FormUxFormId;
  previousSource: FormUxCollapseSource;
  newSource: FormUxCollapseSource;
  phaseBefore?: FormUxGovernancePhase;
  phaseAfter: FormUxGovernancePhase;
  collapseMode: FormUxCollapseMode;
  divergenceHistoryHash?: string;
  ts: number;
};

export type FormUxSgclResolvedSource = "sgcl-cache" | "gaml" | "ugp-fallback";

export type FormUxSgclRoutingEvent = {
  formId: FormUxFormId;
  resolvedSource: FormUxSgclResolvedSource;
  collapseDecision: FormUxCollapsedGovernanceDecision;
  routingLatencyMs: number;
  fallbackReason?: string;
  divergenceWithPreviousDecision?: boolean;
  ts: number;
};

export type FormUxBoundaryViolationType =
  | "direct_submit_bypass"
  | "direct_eval_bypass"
  | "direct_rollback_bypass"
  | "unregistered_form"
  | "dual_execution_prevented";

export type FormUxBoundaryViolationEvent = {
  violationType: FormUxBoundaryViolationType;
  formId?: FormUxFormId;
  interceptedPath: string;
  fallbackTriggered: boolean;
  phase: FormUxBoundaryPhase;
  stackTrace?: string;
  ts: number;
};

export type FormUxCrossFormEvent = {
  formId: FormUxFormId;
  domain: FormUxDomain;
  executionToken?: string;
  eventType: FormUxCrossFormEventType;
  rollbackOccurred: boolean;
  latencyMs: number;
  snapshotHash?: string;
  shadowMode?: boolean;
  ts: number;
};

/** Field id within a form (namespaced in telemetry as `formId.fieldId`). */
export type FormUxFieldId = string;

/** Migration mode per field (render path). */
export type FormUxMigrationMode = "legacy" | "shadow" | "hybrid" | "ssot";

export type FormUxEnforcementLevel =
  | "off"
  | "warn"
  | "soft-ssot"
  | "hard-ssot"
  | "kill-legacy";

export type FormUxDeviceClass = "desktop" | "mobile" | "ios";

export type FormUxSubmitPrecedence = "ssot-wins" | "legacy-wins" | "last-write-wins";

export type FormUxDivergenceType = "none" | "soft" | "hard";

export type FormUxFallbackMode = "legacy" | "shadow";

export type FormUxResolvedComponent = "legacy" | "ssot";

export type FormUxFieldRollout = {
  kind: FormUxInputKind;
  mode: FormUxMigrationMode;
  enforcement?: FormUxEnforcementLevel;
  devices?: FormUxDeviceClass[];
  fallback?: FormUxFallbackMode;
  submitPrecedence?: FormUxSubmitPrecedence;
  critical?: boolean;
  stateKey?: string;
};

export type FormUxFormRollout = {
  defaultMode: FormUxMigrationMode;
  fields: Partial<Record<FormUxFieldId, FormUxFieldRollout>>;
};

export type ShadowEvaluationTrigger = "change" | "blur" | "commit";

export type FormUxMigrationEventType =
  | "evaluation"
  | "ROLLBACK_TRIGGERED"
  | "AUTO_ROLLBACK_TRIGGERED"
  | "submit_reconciliation"
  | "form_ux_rollout_state_event";

export type FormUxRolloutStateEvent = {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  fromState: FormUxEnforcementLevel;
  toState: FormUxEnforcementLevel;
  reason: string;
  deviceContext: FormUxDeviceClass;
  rollbackTriggered: boolean;
  ts: number;
  executionToken?: string;
  snapshotHash?: string;
  isStaleEvaluation?: boolean;
};

export type FormUxMigrationEvent = {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  mode: FormUxMigrationMode;
  resolvedComponent: FormUxResolvedComponent;
  enforcement?: FormUxEnforcementLevel;
  legacyValue?: string;
  ssotValue?: string;
  divergenceType?: FormUxDivergenceType;
  deviceContext?: FormUxDeviceClass;
  trigger?: ShadowEvaluationTrigger;
  evaluation?: "event-driven";
  eventType?: FormUxMigrationEventType;
  rollbackReason?: string;
  mismatch?: { legacy: string; ssot: string };
  executionToken?: string;
  snapshotHash?: string;
  isStaleEvaluation?: boolean;
  ts: number;
};

export type FormUxFieldModeResolution = {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  mode: FormUxMigrationMode;
  effectiveMode: FormUxMigrationMode;
  enforcement: FormUxEnforcementLevel;
  effectiveEnforcement: FormUxEnforcementLevel;
  rollbackActive: boolean;
  showLegacy: boolean;
  showSsot: boolean;
  activeOnChange: FormUxResolvedComponent;
};

export type FormUxFieldEnforcementResolution = {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  enforcement: FormUxEnforcementLevel;
  effectiveEnforcement: FormUxEnforcementLevel;
  submitPrecedence: FormUxSubmitPrecedence;
  critical: boolean;
  stateKey?: string;
  deviceContext: FormUxDeviceClass;
  rollbackActive: boolean;
  fallback: FormUxFallbackMode;
};

export type FormUxFieldSnapshot = {
  legacy: string;
  ssot: string;
  normalizedLegacy: string;
  normalizedSsot: string;
  lastWrite: FormUxResolvedComponent;
  ts: number;
};
