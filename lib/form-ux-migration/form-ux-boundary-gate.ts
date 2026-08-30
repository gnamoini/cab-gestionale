import { coordinateFormScopedRollback } from "@/lib/form-ux-migration/cross-form-rollback-coordinator";
import { evaluateBoundaryPolicy } from "@/lib/form-ux-migration/form-ux-enforcement-policy";
import {
  getFormUxCollapseAdoptionPhase,
  getFormUxGovernanceDecision,
  runGovernanceShadowPipeline,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import {
  orchestrateFieldEvaluation,
  beginOrchestratedSubmit,
} from "@/lib/form-ux-migration/form-ux-orchestrator";
import type { FormUxExecutionToken } from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  recordLegacyBypassAttempt,
  runInsideBoundaryGate,
} from "@/lib/form-ux-migration/form-ux-legacy-guard";
import {
  routeBeginSubmitTransaction,
  routeFormSubmitPayload,
} from "@/lib/form-ux-migration/form-ux-submit-router";
import type { AtomicRolloutTransactionResult } from "@/lib/form-ux-migration/atomic-rollout-transaction";
import type { FormUxFrozenSnapshot } from "@/lib/form-ux-migration/form-ux-snapshot";
import type { RolloutTransitionReason } from "@/lib/form-ux-migration/rollout-rollback-executor";
import type { RolloutState } from "@/lib/form-ux-migration/rollout-state-machine";
import type {
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
} from "@/lib/form-ux-migration/types";

const REGISTERED_FORM_IDS = new Set<FormUxFormId>([
  "ricambio",
  "scheda-ingresso",
  "lavorazioni",
  "mezzi",
  "preventivi",
  "settings",
]);

const FORM_UX_ID_ATTR = "data-form-ux-id";
const BOUNDARY_SEEN_ATTR = "data-form-ux-boundary-seen";

let interceptorsInstalled = false;
const gateSubmitSeen = new Set<string>();

export function resolveFormIdFromDomTarget(target: EventTarget | null): FormUxFormId | null {
  if (target == null || typeof (target as Node).nodeType !== "number") return null;

  const element = target as Element;
  const form = element.closest?.("form");
  if (!form) return null;

  const raw = form.getAttribute(FORM_UX_ID_ATTR);
  if (!raw || !REGISTERED_FORM_IDS.has(raw as FormUxFormId)) return null;
  return raw as FormUxFormId;
}

function markDomBoundarySeen(formId: FormUxFormId): void {
  gateSubmitSeen.add(formId);
  queueMicrotask(() => gateSubmitSeen.delete(formId));
}

export function gateBeginSubmit(formId: FormUxFormId): FormUxExecutionToken {
  runGovernanceShadowPipeline(formId);
  markDomBoundarySeen(formId);
  return runInsideBoundaryGate(() => routeBeginSubmitTransaction(formId));
}

export function gateFormSubmit<T extends Record<string, unknown>>(
  formId: FormUxFormId,
  legacyState: T,
  submitToken?: FormUxExecutionToken,
): T {
  runGovernanceShadowPipeline(formId);
  markDomBoundarySeen(formId);

  if (getFormUxCollapseAdoptionPhase() >= 3) {
    const decision = getFormUxGovernanceDecision(formId);
    if (decision.blocked) {
      recordLegacyBypassAttempt({
        path: "modal_internal_submit",
        formId,
      });
      return legacyState;
    }
  }

  const policy = evaluateBoundaryPolicy({
    operation: "submit",
    formId,
    interceptedPath: "gateFormSubmit",
    isLegacyBypass: false,
  });

  if (policy.action === "block" && policy.reason === "unregistered_form") {
    recordLegacyBypassAttempt({
      path: "modal_internal_submit",
      formId,
    });
    return legacyState;
  }

  return runInsideBoundaryGate(() => routeFormSubmitPayload(formId, legacyState, submitToken));
}

export function gateFieldEvaluation(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  token: FormUxExecutionToken;
  legacyState?: Record<string, unknown>;
  onCompute: (ctx: FormUxFrozenSnapshot) => void;
}): AtomicRolloutTransactionResult<void> {
  runGovernanceShadowPipeline(input.formId);

  if (getFormUxCollapseAdoptionPhase() >= 3) {
    const decision = getFormUxGovernanceDecision(input.formId);
    if (decision.blocked) {
      recordLegacyBypassAttempt({
        path: "direct_atomicRolloutTransaction",
        formId: input.formId,
      });
      return {
        ok: false,
        stale: true,
        executionToken: input.token,
        snapshotHash: "",
      };
    }
  }

  const policy = evaluateBoundaryPolicy({
    operation: "evaluation",
    formId: input.formId,
    interceptedPath: "gateFieldEvaluation",
    isLegacyBypass: false,
  });

  if (policy.action === "block" && policy.reason === "unregistered_form") {
    recordLegacyBypassAttempt({
      path: "direct_atomicRolloutTransaction",
      formId: input.formId,
    });
    return {
      ok: false,
      stale: true,
      executionToken: input.token,
      snapshotHash: "",
    };
  }

  return runInsideBoundaryGate(() => orchestrateFieldEvaluation(input));
}

export function gateRollbackDispatch(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  currentState: RolloutState;
  fromState: RolloutState;
  action: "off" | "downgrade_one";
  reason: RolloutTransitionReason;
  rollbackReason?: string;
}): RolloutState | null {
  return runInsideBoundaryGate(() => {
    const result = coordinateFormScopedRollback(input);
    return result;
  });
}

export function installFormUxGlobalInterceptors(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }
  if (interceptorsInstalled) {
    return () => {};
  }
  interceptorsInstalled = true;

  const handleSubmit = (event: Event) => {
    const formId = resolveFormIdFromDomTarget(event.target);
    if (!formId) {
      const phase = evaluateBoundaryPolicy({
        operation: "submit",
        interceptedPath: "dom_submit_unmarked",
        isLegacyBypass: true,
      });
      if (phase.action !== "passive") {
        recordLegacyBypassAttempt({ path: "dom_submit_unmarked" });
      }
      return;
    }

    const form = (event.target as HTMLFormElement) ?? null;
    if (form) {
      form.setAttribute(BOUNDARY_SEEN_ATTR, "1");
    }

    if (!gateSubmitSeen.has(formId)) {
      const action = recordLegacyBypassAttempt({
        path: "dom_submit_unmarked",
        formId,
      });
      if (action === "block") {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  const handleSubmitClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[type="submit"], input[type="submit"]');
    if (!button) return;

    const formId = resolveFormIdFromDomTarget(button);
    if (!formId) return;

    if (!gateSubmitSeen.has(formId)) {
      recordLegacyBypassAttempt({
        path: "dom_submit_unmarked",
        formId,
      });
    }
  };

  document.addEventListener("submit", handleSubmit, true);
  document.addEventListener("click", handleSubmitClick, true);

  return () => {
    document.removeEventListener("submit", handleSubmit, true);
    document.removeEventListener("click", handleSubmitClick, true);
    interceptorsInstalled = false;
  };
}

/** Re-export for orchestrated submit when boundary routes explicitly. */
export { beginOrchestratedSubmit };

/** Test helper. */
export function resetFormUxBoundaryGate(): void {
  gateSubmitSeen.clear();
  interceptorsInstalled = false;
}
