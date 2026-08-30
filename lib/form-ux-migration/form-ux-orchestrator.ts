import {
  atomicFormSubmitTransaction,
  atomicRolloutTransaction,
  type AtomicRolloutTransactionResult,
} from "@/lib/form-ux-migration/atomic-rollout-transaction";
import {
  assertFormUxIsolationBoundary,
  recordSnapshotInContext,
  setContextSubmitToken,
  trackFieldTransactionEnd,
  trackFieldTransactionStart,
} from "@/lib/form-ux-migration/form-ux-execution-context";
import {
  beginSubmitTransaction,
  type FormUxExecutionToken,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  getFormUxRegistryEntry,
} from "@/lib/form-ux-migration/form-ux-registry";
import {
  resolveConsumerGovernanceView,
  runGovernanceShadowPipeline,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import type { FormUxFrozenSnapshot } from "@/lib/form-ux-migration/form-ux-snapshot";
import type { SubmitDivergence } from "@/lib/form-ux-migration/resolve-form-submit-payload";
import { emitFormUxCrossFormEvent } from "@/lib/form-ux-migration/telemetry";
import type { FormUxFieldId, FormUxFormId, FormUxInputKind } from "@/lib/form-ux-migration/types";

function emitOrchestratorEvent(input: {
  formId: FormUxFormId;
  eventType: "orchestrator_eval" | "orchestrator_submit";
  executionToken?: FormUxExecutionToken;
  snapshotHash?: string;
  latencyMs: number;
  shadowMode?: boolean;
  rollbackOccurred?: boolean;
}): void {
  const entry = getFormUxRegistryEntry(input.formId);
  if (!entry) return;

  emitFormUxCrossFormEvent({
    formId: input.formId,
    domain: entry.domain,
    executionToken: input.executionToken ? String(input.executionToken.seq) : undefined,
    eventType: input.eventType,
    rollbackOccurred: input.rollbackOccurred ?? false,
    latencyMs: input.latencyMs,
    snapshotHash: input.snapshotHash,
    shadowMode: input.shadowMode,
    ts: Date.now(),
  });
}

function resolveOrchestratorPhase(formId: FormUxFormId): number {
  return resolveConsumerGovernanceView(formId).phase;
}

function resolveOrchestratorShadowMode(formId: FormUxFormId): boolean {
  return resolveConsumerGovernanceView(formId).mode === "shadow";
}

function shouldRouteThroughOrchestrator(formId: FormUxFormId): boolean {
  return resolveConsumerGovernanceView(formId).routing === "orchestrator";
}

export function beginOrchestratedSubmit(formId: FormUxFormId): FormUxExecutionToken {
  const token = beginSubmitTransaction(formId);
  if (shouldRouteThroughOrchestrator(formId)) {
    setContextSubmitToken(formId, token);
  }
  return token;
}

export function orchestrateFieldEvaluation(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  token: FormUxExecutionToken;
  legacyState?: Record<string, unknown>;
  onCompute: (ctx: FormUxFrozenSnapshot) => void;
}): AtomicRolloutTransactionResult<void> {
  const { formId, fieldId, kind, token, legacyState, onCompute } = input;
  runGovernanceShadowPipeline(formId);
  const entry = getFormUxRegistryEntry(formId);
  if (!entry) {
    return { ok: false, stale: true, executionToken: token, snapshotHash: "" };
  }

  try {
    assertFormUxIsolationBoundary(formId, formId);
  } catch {
    emitFormUxCrossFormEvent({
      formId,
      domain: entry.domain,
      executionToken: String(token.seq),
      eventType: "isolation_violation_blocked",
      rollbackOccurred: false,
      latencyMs: 0,
      ts: Date.now(),
    });
    return { ok: false, stale: true, executionToken: token, snapshotHash: "" };
  }

  const phase = resolveOrchestratorPhase(formId);
  const start = Date.now();
  const shadowMode = resolveOrchestratorShadowMode(formId);
  const routeActive = shouldRouteThroughOrchestrator(formId);

  if (phase >= 3 && routeActive) {
    trackFieldTransactionStart(formId, fieldId);
  }

  const result = atomicRolloutTransaction({
    formId,
    fieldId,
    kind,
    token,
    legacyState,
    mode: "evaluation",
    onCompute,
  });

  if (phase >= 3 && routeActive) {
    trackFieldTransactionEnd(formId, fieldId);
    if (result.snapshotHash) {
      recordSnapshotInContext(formId, result.snapshotHash, Date.now());
    }
  }

  if (phase >= 2) {
    emitOrchestratorEvent({
      formId,
      eventType: "orchestrator_eval",
      executionToken: token,
      snapshotHash: result.snapshotHash || undefined,
      latencyMs: Date.now() - start,
      shadowMode,
    });
  }

  return result;
}

export function orchestrateSubmitTransaction<T extends Record<string, unknown>>(input: {
  formId: FormUxFormId;
  token: FormUxExecutionToken;
  legacyState: T;
  reportDivergences: (divergences: SubmitDivergence[], snapshotHash: string) => void;
}): AtomicRolloutTransactionResult<{ payload: T; divergences: SubmitDivergence[] }> {
  const { formId, token, legacyState, reportDivergences } = input;
  runGovernanceShadowPipeline(formId);
  const entry = getFormUxRegistryEntry(formId);
  if (!entry) {
    return { ok: false, stale: true, executionToken: token, snapshotHash: "" };
  }

  try {
    assertFormUxIsolationBoundary(formId, formId);
  } catch {
    emitFormUxCrossFormEvent({
      formId,
      domain: entry.domain,
      executionToken: String(token.seq),
      eventType: "isolation_violation_blocked",
      rollbackOccurred: false,
      latencyMs: 0,
      ts: Date.now(),
    });
    return { ok: false, stale: true, executionToken: token, snapshotHash: "" };
  }

  const phase = resolveOrchestratorPhase(formId);
  const start = Date.now();
  const shadowMode = resolveOrchestratorShadowMode(formId);
  const routeActive = shouldRouteThroughOrchestrator(formId);

  if (phase >= 3 && routeActive) {
    setContextSubmitToken(formId, token);
  }

  const result = atomicFormSubmitTransaction({
    formId,
    token,
    legacyState,
    reportDivergences,
  });

  if (phase >= 3 && routeActive && result.snapshotHash) {
    recordSnapshotInContext(formId, result.snapshotHash, Date.now());
  }

  if (phase >= 2) {
    emitOrchestratorEvent({
      formId,
      eventType: "orchestrator_submit",
      executionToken: token,
      snapshotHash: result.snapshotHash || undefined,
      latencyMs: Date.now() - start,
      shadowMode,
    });
  }

  return result;
}
