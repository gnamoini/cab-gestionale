import {
  beginOrchestratedSubmit,
} from "@/lib/form-ux-migration/form-ux-orchestrator";
import {
  beginSubmitTransaction,
  type FormUxExecutionToken,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  getFormUxRegistryEntry,
  isFormUxRolloutEnabled,
} from "@/lib/form-ux-migration/form-ux-registry";
import {
  resolveConsumerGovernanceView,
  runGovernanceShadowPipeline,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import { isFormUxOrchestratorShadowMode } from "@/lib/form-ux-migration/form-ux-platform-config";
import {
  resolveFormSubmitPayload,
} from "@/lib/form-ux-migration/resolve-form-submit-payload";
import { emitFormUxCrossFormEvent } from "@/lib/form-ux-migration/telemetry";
import type { FormUxFormId } from "@/lib/form-ux-migration/types";

function resolveSubmitRouterPhase(formId: FormUxFormId): number {
  return resolveConsumerGovernanceView(formId).phase;
}

function shouldUseOrchestratedSubmit(formId: FormUxFormId): boolean {
  return resolveConsumerGovernanceView(formId).routing === "orchestrator";
}

export function routeFormSubmitPayload<T extends Record<string, unknown>>(
  formId: FormUxFormId,
  legacyState: T,
  submitToken?: FormUxExecutionToken,
): T {
  runGovernanceShadowPipeline(formId);
  const entry = getFormUxRegistryEntry(formId);
  if (!entry) {
    return legacyState;
  }

  const phase = resolveSubmitRouterPhase(formId);

  if (phase >= 3 && shouldUseOrchestratedSubmit(formId) && !isFormUxRolloutEnabled(formId)) {
    return legacyState;
  }

  if (!shouldUseOrchestratedSubmit(formId)) {
    return resolveFormSubmitPayload(formId, legacyState, submitToken);
  }

  const start = Date.now();
  const token = submitToken ?? beginOrchestratedSubmit(formId);
  const payload = resolveFormSubmitPayload(formId, legacyState, token);

  if (phase >= 2) {
    emitFormUxCrossFormEvent({
      formId,
      domain: entry.domain,
      executionToken: String(token.seq),
      eventType: "orchestrator_submit",
      rollbackOccurred: false,
      latencyMs: Date.now() - start,
      shadowMode: isFormUxOrchestratorShadowMode(),
      ts: Date.now(),
    });
  }

  return payload;
}

/** Phase-aware submit token — orchestrated when routing active. */
export function routeBeginSubmitTransaction(formId: FormUxFormId): FormUxExecutionToken {
  runGovernanceShadowPipeline(formId);
  if (shouldUseOrchestratedSubmit(formId)) {
    return beginOrchestratedSubmit(formId);
  }
  return beginSubmitTransaction(formId);
}
