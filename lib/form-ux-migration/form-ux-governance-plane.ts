import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import {
  computeRolloutEnforcement,
} from "@/lib/form-ux-migration/rollout-controller";
import {
  deriveRegistryPhase,
  getFormUxRegistryEntry,
  isFormUxRolloutEnabled,
} from "@/lib/form-ux-migration/form-ux-registry";
import {
  getFormUxCollapseAdoptionPhase,
  getFormUxGovernanceDecision,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import { emitFormUxGovernanceDriftEvent } from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxEnforcementLevel,
  FormUxFormId,
  FormUxGovernanceDecision,
  FormUxGovernanceDriftType,
  FormUxGovernancePhase,
  FormUxGovernanceState,
} from "@/lib/form-ux-migration/types";

const VALID_PHASES = new Set<FormUxGovernancePhase>([1, 2, 3, 4]);
const RECONCILE_THROTTLE_MS = 10_000;
const GLOBAL_RECONCILE_KEY = "__global__";

let adoptionPhaseOverride: FormUxGovernancePhase | null = null;
let platformPhaseOverride: FormUxGovernancePhase | null = null;
let boundaryPhaseOverride: FormUxGovernancePhase | null = null;

type ReconciliationCache = {
  resolvedPhase: FormUxGovernancePhase;
  reconciledAt: number;
};

const reconcileCache = new Map<string, ReconciliationCache>();

function parsePhase(raw: string | undefined, fallback: FormUxGovernancePhase): FormUxGovernancePhase {
  const n = Number(raw ?? String(fallback));
  if (VALID_PHASES.has(n as FormUxGovernancePhase)) {
    return n as FormUxGovernancePhase;
  }
  return fallback;
}

function maxPhase(...phases: FormUxGovernancePhase[]): FormUxGovernancePhase {
  return Math.max(...phases) as FormUxGovernancePhase;
}

/** Raw platform axis — env input layer (no UGP delegation). */
export function readPlatformPhaseInput(): FormUxGovernancePhase {
  return platformPhaseOverride ?? parsePhase(process.env.NEXT_PUBLIC_FORM_UX_PLATFORM_PHASE, 1);
}

/** Raw boundary axis — env input layer (no UGP delegation). */
export function readBoundaryPhaseInput(): FormUxGovernancePhase {
  return boundaryPhaseOverride ?? parsePhase(process.env.NEXT_PUBLIC_FORM_UX_BOUNDARY_PHASE, 2);
}

export function getFormUxGovernanceAdoptionPhase(): FormUxGovernancePhase {
  return adoptionPhaseOverride ?? parsePhase(process.env.NEXT_PUBLIC_FORM_UX_GOVERNANCE_PHASE, 2);
}

function classifyDrift(state: Omit<FormUxGovernanceState, "lastReconciliationAt">): FormUxGovernanceDriftType {
  const axes = [
    state.boundaryPhase !== state.platformPhase,
    state.registryPhase !== state.resolvedPhase,
    state.platformPhase !== state.resolvedPhase,
  ];
  const count = axes.filter(Boolean).length;
  if (count > 1) return "multi_axis";
  if (state.registryPhase !== state.resolvedPhase) return "registry_resolved";
  return "boundary_platform";
}

function collapseEnforcement(level: FormUxEnforcementLevel): FormUxGovernanceDecision["enforcement"] {
  switch (level) {
    case "warn":
      return "warn";
    case "soft-ssot":
      return "soft";
    case "hard-ssot":
    case "kill-legacy":
      return "hard";
    default:
      return "off";
  }
}

function formHasShadowFields(formId: FormUxFormId): boolean {
  const fields = FORM_UX_ROLLOUT[formId]?.fields ?? {};
  return Object.values(fields).some((f) => f?.mode === "shadow");
}

/** @deprecated runtime — observability / drift analytics only at collapse phase 4+. */
export function resolveGovernanceState(formId?: FormUxFormId): FormUxGovernanceState {
  const platformPhase = readPlatformPhaseInput();
  const boundaryPhase = readBoundaryPhaseInput();
  const registryPhase =
    formId != null && getFormUxRegistryEntry(formId) != null
      ? deriveRegistryPhase(formId)
      : 1;

  const resolvedPhase = maxPhase(platformPhase, boundaryPhase, registryPhase);

  const driftDetected =
    boundaryPhase !== platformPhase ||
    registryPhase !== resolvedPhase ||
    platformPhase !== resolvedPhase;

  const cacheKey = formId ?? GLOBAL_RECONCILE_KEY;

  return {
    platformPhase,
    boundaryPhase,
    registryPhase,
    resolvedPhase,
    driftDetected,
    lastReconciliationAt: reconcileCache.get(cacheKey)?.reconciledAt ?? 0,
  };
}

/** @deprecated runtime — observability / drift analytics only at collapse phase 4+. */
export function reconcileGovernanceState(formId?: FormUxFormId): FormUxGovernanceState {
  const state = resolveGovernanceState(formId);
  const cacheKey = formId ?? GLOBAL_RECONCILE_KEY;
  const now = Date.now();
  const cached = reconcileCache.get(cacheKey);

  if (state.driftDetected) {
    const canReconcile = !cached || now - cached.reconciledAt >= RECONCILE_THROTTLE_MS;
    if (canReconcile) {
      reconcileCache.set(cacheKey, {
        resolvedPhase: state.resolvedPhase,
        reconciledAt: now,
      });
    }

    emitFormUxGovernanceDriftEvent({
      formId,
      platformPhase: state.platformPhase,
      boundaryPhase: state.boundaryPhase,
      registryPhase: state.registryPhase,
      resolvedPhase: state.resolvedPhase,
      driftType: classifyDrift(state),
      autoReconciled: canReconcile,
      ts: now,
    });
  }

  return {
    ...state,
    lastReconciliationAt: reconcileCache.get(cacheKey)?.reconciledAt ?? state.lastReconciliationAt,
  };
}

export function getGovernanceResolvedPhase(formId?: FormUxFormId): FormUxGovernancePhase {
  const cacheKey = formId ?? GLOBAL_RECONCILE_KEY;
  const cached = reconcileCache.get(cacheKey);
  if (cached) return cached.resolvedPhase;
  return reconcileGovernanceState(formId).resolvedPhase;
}

/** @deprecated Router-internal UGP fallback only — runtime consumers must use getFormUxGovernanceDecision. */
export function getFormUxDecisionInternal(formId: FormUxFormId): FormUxGovernanceDecision {
  const state = resolveGovernanceState(formId);
  const adoption = getFormUxGovernanceAdoptionPhase();
  const phase =
    adoption >= 3
      ? getGovernanceResolvedPhase(formId)
      : state.resolvedPhase;

  const rolloutEnabled = isFormUxRolloutEnabled(formId);

  let mode: FormUxGovernanceDecision["mode"] = "legacy";
  if (phase <= 1 || !rolloutEnabled) {
    mode = "legacy";
  } else if (phase >= 3 && rolloutEnabled) {
    mode = "enforced";
  } else if (formHasShadowFields(formId)) {
    mode = "shadow";
  }

  let routing: FormUxGovernanceDecision["routing"] = "legacy";
  if (phase >= 2 && rolloutEnabled) {
    routing = "orchestrator";
  }

  let enforcement: FormUxGovernanceDecision["enforcement"] = "off";
  if (formId === "ricambio" && rolloutEnabled) {
    const pilot = computeRolloutEnforcement(formId, "prezzo-listino");
    enforcement = collapseEnforcement(pilot.effectiveEnforcement);
  }

  return { phase, mode, enforcement, routing };
}

/**
 * @deprecated runtime at collapse phase 4 — telemetry-only wrapper via SGCL.
 * Use getFormUxGovernanceDecision for runtime decisions when collapse >= 3.
 */
export function getFormUxDecision(formId: FormUxFormId): FormUxGovernanceDecision {
  if (getFormUxGovernanceAdoptionPhase() >= 4 || getFormUxCollapseAdoptionPhase() >= 4) {
    reconcileGovernanceState(formId);
    const collapsed = getFormUxGovernanceDecision(formId);
    return {
      phase: collapsed.phase,
      mode: collapsed.mode,
      enforcement: collapsed.enforcement,
      routing: collapsed.routing,
    };
  }

  reconcileGovernanceState(formId);
  return getFormUxDecisionInternal(formId);
}

/** Shadow UGP evaluation — adoption ≥2, runtime unchanged. */
export function runUgpShadowEvaluation(formId: FormUxFormId): void {
  if (getFormUxGovernanceAdoptionPhase() < 2) return;
  reconcileGovernanceState(formId);
  getFormUxDecisionInternal(formId);
}

/** Test helpers. */
export function setFormUxGovernanceAdoptionPhaseForTests(
  phase: FormUxGovernancePhase | null,
): void {
  adoptionPhaseOverride = phase;
}

export function setFormUxGovernanceAxisForTests(input: {
  platform?: FormUxGovernancePhase | null;
  boundary?: FormUxGovernancePhase | null;
}): void {
  platformPhaseOverride = input.platform ?? null;
  boundaryPhaseOverride = input.boundary ?? null;
}

export function resetFormUxGovernancePlane(): void {
  adoptionPhaseOverride = null;
  platformPhaseOverride = null;
  boundaryPhaseOverride = null;
  reconcileCache.clear();
}
