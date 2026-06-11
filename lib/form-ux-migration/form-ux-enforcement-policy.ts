import {
  getFormUxCollapseAdoptionPhase,
  getFormUxGovernancePhaseGlobal,
  resolveConsumerGovernanceView,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import { getFormUxRegistryEntry } from "@/lib/form-ux-migration/form-ux-registry";
import type { FormUxBoundaryPhase, FormUxFormId } from "@/lib/form-ux-migration/types";

export type BoundaryViolationAction = "passive" | "warn" | "redirect" | "block";

export type BoundaryPolicyResult = {
  action: BoundaryViolationAction;
  allowLegacy: boolean;
  requireRegistry: boolean;
  reason?: string;
};

const VALID_PHASES = new Set<FormUxBoundaryPhase>([1, 2, 3, 4]);

let boundaryPhaseOverride: FormUxBoundaryPhase | null = null;

function parseBoundaryPhase(raw: string | undefined): FormUxBoundaryPhase {
  const n = Number(raw ?? "2");
  if (VALID_PHASES.has(n as FormUxBoundaryPhase)) {
    return n as FormUxBoundaryPhase;
  }
  return 2;
}

/** Boundary enforcement phase — default 2 (warn-only). */
export function getFormUxBoundaryPhase(): FormUxBoundaryPhase {
  if (boundaryPhaseOverride != null) return boundaryPhaseOverride;
  if (getFormUxCollapseAdoptionPhase() >= 3) {
    return getFormUxGovernancePhaseGlobal();
  }
  return parseBoundaryPhase(process.env.NEXT_PUBLIC_FORM_UX_BOUNDARY_PHASE);
}

function resolveBoundaryPolicyPhase(formId?: FormUxFormId): FormUxBoundaryPhase {
  if (getFormUxCollapseAdoptionPhase() >= 3) {
    if (formId != null) return resolveConsumerGovernanceView(formId).phase;
    return getFormUxGovernancePhaseGlobal();
  }
  return getFormUxBoundaryPhase();
}

export function setFormUxBoundaryPhaseForTests(phase: FormUxBoundaryPhase | null): void {
  boundaryPhaseOverride = phase;
}

function bypassActionForPhase(phase: FormUxBoundaryPhase): BoundaryViolationAction {
  switch (phase) {
    case 1:
      return "passive";
    case 2:
      return "warn";
    case 3:
      return "redirect";
    case 4:
      return "block";
    default:
      return "warn";
  }
}

export function evaluateBoundaryPolicy(input: {
  operation: "submit" | "evaluation" | "rollback_dispatch";
  formId?: FormUxFormId;
  interceptedPath: string;
  isLegacyBypass?: boolean;
}): BoundaryPolicyResult {
  const phase = resolveBoundaryPolicyPhase(input.formId);
  const { operation, formId, isLegacyBypass = false } = input;

  const registered = formId != null && getFormUxRegistryEntry(formId) != null;

  if (phase >= 3 && formId != null && !registered) {
    return {
      action: phase === 4 ? "block" : "redirect",
      allowLegacy: false,
      requireRegistry: true,
      reason: "unregistered_form",
    };
  }

  if (!isLegacyBypass) {
    return {
      action: "passive",
      allowLegacy: true,
      requireRegistry: phase >= 3,
    };
  }

  const action = bypassActionForPhase(phase);

  return {
    action,
    allowLegacy: action === "passive" || action === "warn",
    requireRegistry: phase >= 3,
    reason: `${operation}_legacy_bypass`,
  };
}
