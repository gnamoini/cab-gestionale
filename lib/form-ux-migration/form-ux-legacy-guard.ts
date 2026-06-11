import {
  evaluateBoundaryPolicy,
  getFormUxBoundaryPhase,
  type BoundaryViolationAction,
} from "@/lib/form-ux-migration/form-ux-enforcement-policy";
import {
  emitFormUxBoundaryViolationEvent,
  FORM_UX_MIGRATION_LOG_PREFIX,
} from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxBoundaryViolationType,
  FormUxFormId,
} from "@/lib/form-ux-migration/types";

export type LegacyBypassPath =
  | "direct_resolveFormSubmitPayload"
  | "direct_atomicRolloutTransaction"
  | "direct_executeRolloutRollback"
  | "dom_submit_unmarked"
  | "modal_internal_submit";

let boundaryGateDepth = 0;

export function isBoundaryGateActive(): boolean {
  return boundaryGateDepth > 0;
}

export function runInsideBoundaryGate<T>(fn: () => T): T {
  boundaryGateDepth += 1;
  try {
    return fn();
  } finally {
    boundaryGateDepth -= 1;
  }
}

function pathToViolationType(path: LegacyBypassPath): FormUxBoundaryViolationType {
  switch (path) {
    case "direct_resolveFormSubmitPayload":
    case "modal_internal_submit":
    case "dom_submit_unmarked":
      return "direct_submit_bypass";
    case "direct_atomicRolloutTransaction":
      return "direct_eval_bypass";
    case "direct_executeRolloutRollback":
      return "direct_rollback_bypass";
    default:
      return "direct_submit_bypass";
  }
}

function pathToOperation(path: LegacyBypassPath): "submit" | "evaluation" | "rollback_dispatch" {
  if (path === "direct_atomicRolloutTransaction") return "evaluation";
  if (path === "direct_executeRolloutRollback") return "rollback_dispatch";
  return "submit";
}

function captureDevStack(): string | undefined {
  if (process.env.NODE_ENV === "development") {
    return new Error().stack?.split("\n").slice(2, 6).join("\n");
  }
  return undefined;
}

export function recordLegacyBypassAttempt(input: {
  path: LegacyBypassPath;
  formId?: FormUxFormId;
  interceptedStack?: string;
}): BoundaryViolationAction {
  if (isBoundaryGateActive()) {
    return "passive";
  }

  const operation = pathToOperation(input.path);
  const policy = evaluateBoundaryPolicy({
    operation,
    formId: input.formId,
    interceptedPath: input.path,
    isLegacyBypass: true,
  });

  const stackTrace = input.interceptedStack ?? captureDevStack();
  const violationType = pathToViolationType(input.path);

  emitFormUxBoundaryViolationEvent({
    violationType,
    formId: input.formId,
    interceptedPath: input.path,
    fallbackTriggered: policy.action === "redirect" || policy.action === "block",
    phase: getFormUxBoundaryPhase(),
    stackTrace,
    ts: Date.now(),
  });

  if (process.env.NODE_ENV === "development" && policy.action !== "passive") {
    console.warn(FORM_UX_MIGRATION_LOG_PREFIX, "boundary_violation", {
      path: input.path,
      formId: input.formId,
      action: policy.action,
      phase: getFormUxBoundaryPhase(),
    });
  }

  return policy.action;
}

/** Test helper. */
export function resetFormUxLegacyGuard(): void {
  boundaryGateDepth = 0;
}
