import type {
  FormUxBoundaryViolationEvent,
  FormUxCrossFormEvent,
  FormUxGovernanceAuthorityViolationEvent,
  FormUxGovernanceCollapseEvent,
  FormUxGovernanceDriftEvent,
  FormUxMapVersionEvent,
  FormUxMigrationEvent,
  FormUxRolloutStateEvent,
  FormUxSgclRoutingEvent,
} from "@/lib/form-ux-migration/types";

export const FORM_UX_MIGRATION_LOG_PREFIX = "[form-ux-migration]";

const MAX_BUFFER = 200;
const buffer: FormUxMigrationEvent[] = [];
const rolloutStateBuffer: FormUxRolloutStateEvent[] = [];
const crossFormBuffer: FormUxCrossFormEvent[] = [];
const boundaryViolationBuffer: FormUxBoundaryViolationEvent[] = [];
const governanceDriftBuffer: FormUxGovernanceDriftEvent[] = [];
const authorityViolationBuffer: FormUxGovernanceAuthorityViolationEvent[] = [];
const governanceCollapseBuffer: FormUxGovernanceCollapseEvent[] = [];
const sgclRoutingBuffer: FormUxSgclRoutingEvent[] = [];
const mapVersionBuffer: FormUxMapVersionEvent[] = [];

declare global {
  interface Window {
    __FORM_UX_MIGRATION__?: {
      events: FormUxMigrationEvent[];
      rolloutStateEvents: FormUxRolloutStateEvent[];
      crossFormEvents: FormUxCrossFormEvent[];
      boundaryViolations: FormUxBoundaryViolationEvent[];
      governanceDriftEvents: FormUxGovernanceDriftEvent[];
      authorityViolationEvents: FormUxGovernanceAuthorityViolationEvent[];
      governanceCollapseEvents: FormUxGovernanceCollapseEvent[];
      sgclRoutingEvents: FormUxSgclRoutingEvent[];
      mapVersionEvents: FormUxMapVersionEvent[];
      mismatchCount: number;
      enforcementRollbacks: number;
      mismatchRateByField: Record<string, number>;
    };
  }
}

function syncDevGlobal(): void {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return;

  const mismatchRateByField: Record<string, number> = {};
  const fieldStats = new Map<string, { total: number; mismatches: number }>();

  for (const event of buffer) {
    const key = `${event.formId}.${event.fieldId}`;
    const stats = fieldStats.get(key) ?? { total: 0, mismatches: 0 };
    stats.total += 1;
    if (event.mismatch || event.divergenceType === "soft" || event.divergenceType === "hard") {
      stats.mismatches += 1;
    }
    fieldStats.set(key, stats);
  }

  for (const [key, stats] of fieldStats) {
    mismatchRateByField[key] = stats.total > 0 ? stats.mismatches / stats.total : 0;
  }

  window.__FORM_UX_MIGRATION__ = {
    events: [...buffer],
    rolloutStateEvents: [...rolloutStateBuffer],
    crossFormEvents: [...crossFormBuffer],
    boundaryViolations: [...boundaryViolationBuffer],
    governanceDriftEvents: [...governanceDriftBuffer],
    authorityViolationEvents: [...authorityViolationBuffer],
    governanceCollapseEvents: [...governanceCollapseBuffer],
    sgclRoutingEvents: [...sgclRoutingBuffer],
    mapVersionEvents: [...mapVersionBuffer],
    mismatchCount: buffer.filter(
      (e) => e.mismatch != null || e.divergenceType === "soft" || e.divergenceType === "hard",
    ).length,
    enforcementRollbacks: buffer.filter(
      (e) => e.eventType === "ROLLBACK_TRIGGERED" || e.eventType === "AUTO_ROLLBACK_TRIGGERED",
    ).length,
    mismatchRateByField,
  };
}

export function emitFormUxRolloutStateEvent(event: FormUxRolloutStateEvent): void {
  rolloutStateBuffer.push(event);
  if (rolloutStateBuffer.length > MAX_BUFFER) rolloutStateBuffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  console.info(FORM_UX_MIGRATION_LOG_PREFIX, "form_ux_rollout_state_event", {
    form: event.formId,
    field: event.fieldId,
    from: event.fromState,
    to: event.toState,
    reason: event.reason,
    device: event.deviceContext,
    rollbackTriggered: event.rollbackTriggered,
  });
}

export function getFormUxRolloutStateEvents(): readonly FormUxRolloutStateEvent[] {
  return rolloutStateBuffer;
}

export function emitFormUxCrossFormEvent(event: FormUxCrossFormEvent): void {
  crossFormBuffer.push(event);
  if (crossFormBuffer.length > MAX_BUFFER) crossFormBuffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  console.info(FORM_UX_MIGRATION_LOG_PREFIX, "form_ux_cross_form_event", {
    form: event.formId,
    domain: event.domain,
    type: event.eventType,
    token: event.executionToken,
    rollback: event.rollbackOccurred,
    latencyMs: event.latencyMs,
    snapshot: event.snapshotHash,
    shadow: event.shadowMode,
  });
}

export function getFormUxCrossFormEvents(): readonly FormUxCrossFormEvent[] {
  return crossFormBuffer;
}

export function emitFormUxBoundaryViolationEvent(
  event: FormUxBoundaryViolationEvent,
): void {
  boundaryViolationBuffer.push(event);
  if (boundaryViolationBuffer.length > MAX_BUFFER) boundaryViolationBuffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  console.warn(FORM_UX_MIGRATION_LOG_PREFIX, "form_ux_boundary_violation_event", {
    type: event.violationType,
    form: event.formId,
    path: event.interceptedPath,
    fallback: event.fallbackTriggered,
    phase: event.phase,
  });
}

export function getFormUxBoundaryViolationEvents(): readonly FormUxBoundaryViolationEvent[] {
  return boundaryViolationBuffer;
}

export function emitFormUxGovernanceDriftEvent(event: FormUxGovernanceDriftEvent): void {
  governanceDriftBuffer.push(event);
  if (governanceDriftBuffer.length > MAX_BUFFER) governanceDriftBuffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  console.info(FORM_UX_MIGRATION_LOG_PREFIX, "form_ux_governance_drift_event", {
    form: event.formId,
    driftType: event.driftType,
    platform: event.platformPhase,
    boundary: event.boundaryPhase,
    registry: event.registryPhase,
    resolved: event.resolvedPhase,
    autoReconciled: event.autoReconciled,
  });
}

export function getFormUxGovernanceDriftEvents(): readonly FormUxGovernanceDriftEvent[] {
  return governanceDriftBuffer;
}

export function emitFormUxGovernanceAuthorityViolationEvent(
  event: FormUxGovernanceAuthorityViolationEvent,
): void {
  authorityViolationBuffer.push(event);
  if (authorityViolationBuffer.length > MAX_BUFFER) authorityViolationBuffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  console.warn(FORM_UX_MIGRATION_LOG_PREFIX, "form_ux_governance_authority_violation_event", {
    form: event.formId,
    type: event.violationType,
    violating: event.violatingLayer,
    expected: event.expectedAuthority,
    actual: event.actualAuthority,
    severity: event.severity,
    ugpPhase: event.ugpPhase,
    authorityPhase: event.authorityPhase,
  });
}

export function getFormUxGovernanceAuthorityViolationEvents(): readonly FormUxGovernanceAuthorityViolationEvent[] {
  return authorityViolationBuffer;
}

export function emitFormUxGovernanceCollapseEvent(event: FormUxGovernanceCollapseEvent): void {
  governanceCollapseBuffer.push(event);
  if (governanceCollapseBuffer.length > MAX_BUFFER) governanceCollapseBuffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  console.info(FORM_UX_MIGRATION_LOG_PREFIX, "form_ux_governance_collapse_event", {
    form: event.formId,
    previous: event.previousSource,
    new: event.newSource,
    phaseBefore: event.phaseBefore,
    phaseAfter: event.phaseAfter,
    mode: event.collapseMode,
    hash: event.divergenceHistoryHash,
  });
}

export function getFormUxGovernanceCollapseEvents(): readonly FormUxGovernanceCollapseEvent[] {
  return governanceCollapseBuffer;
}

export function emitFormUxSgclRoutingEvent(event: FormUxSgclRoutingEvent): void {
  sgclRoutingBuffer.push(event);
  if (sgclRoutingBuffer.length > MAX_BUFFER) sgclRoutingBuffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  console.info(FORM_UX_MIGRATION_LOG_PREFIX, "form_ux_sgcl_routing_event", {
    form: event.formId,
    source: event.resolvedSource,
    phase: event.collapseDecision.phase,
    latencyMs: event.routingLatencyMs,
    fallback: event.fallbackReason,
    divergence: event.divergenceWithPreviousDecision,
  });
}

export function getFormUxSgclRoutingEvents(): readonly FormUxSgclRoutingEvent[] {
  return sgclRoutingBuffer;
}

export function emitFormUxMapVersionEvent(event: FormUxMapVersionEvent): void {
  mapVersionBuffer.push(event);
  if (mapVersionBuffer.length > MAX_BUFFER) mapVersionBuffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  console.info(FORM_UX_MIGRATION_LOG_PREFIX, "form_ux_map_version_event", {
    field: event.fieldKey,
    classifierVersion: event.classifierVersion,
    eligibilityVersion: event.eligibilityVersion,
    mapVersion: event.mapVersion,
    compatibilityStatus: event.compatibilityStatus,
  });
}

export function getFormUxMapVersionEvents(): readonly FormUxMapVersionEvent[] {
  return mapVersionBuffer;
}

export function emitFormUxMigrationEvent(event: FormUxMigrationEvent): void {
  buffer.push(event);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  syncDevGlobal();

  if (process.env.NODE_ENV !== "development") return;

  if (event.eventType === "ROLLBACK_TRIGGERED" || event.eventType === "AUTO_ROLLBACK_TRIGGERED") {
    console.warn(FORM_UX_MIGRATION_LOG_PREFIX, event.eventType, {
      form: event.formId,
      field: event.fieldId,
      reason: event.rollbackReason,
      enforcement: event.enforcement,
    });
    return;
  }

  if (event.eventType === "submit_reconciliation") {
    console.info(FORM_UX_MIGRATION_LOG_PREFIX, "submit_reconciliation", {
      form: event.formId,
      field: event.fieldId,
      divergenceType: event.divergenceType,
      legacy: event.legacyValue,
      ssot: event.ssotValue,
    });
    return;
  }

  if (event.mismatch) {
    console.warn(FORM_UX_MIGRATION_LOG_PREFIX, "mismatch", {
      form: event.formId,
      field: event.fieldId,
      mode: event.mode,
      enforcement: event.enforcement,
      trigger: event.trigger,
      evaluation: event.evaluation,
      divergenceType: event.divergenceType,
      device: event.deviceContext,
      legacy: event.mismatch.legacy,
      ssot: event.mismatch.ssot,
    });
  } else if (event.evaluation === "event-driven") {
    console.debug(FORM_UX_MIGRATION_LOG_PREFIX, "evaluation", {
      form: event.formId,
      field: event.fieldId,
      mode: event.mode,
      enforcement: event.enforcement,
      trigger: event.trigger,
      divergenceType: event.divergenceType,
      component: event.resolvedComponent,
    });
  } else {
    console.debug(FORM_UX_MIGRATION_LOG_PREFIX, "render", {
      form: event.formId,
      field: event.fieldId,
      mode: event.mode,
      component: event.resolvedComponent,
    });
  }
}

export function getFormUxMigrationEvents(): readonly FormUxMigrationEvent[] {
  return buffer;
}

export function clearFormUxMigrationEvents(): void {
  buffer.length = 0;
  rolloutStateBuffer.length = 0;
  crossFormBuffer.length = 0;
  boundaryViolationBuffer.length = 0;
  governanceDriftBuffer.length = 0;
  authorityViolationBuffer.length = 0;
  governanceCollapseBuffer.length = 0;
  sgclRoutingBuffer.length = 0;
  mapVersionBuffer.length = 0;
  syncDevGlobal();
}
