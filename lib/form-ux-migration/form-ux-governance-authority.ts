import {
  type AuthorityResolution,
  resolveAuthorityFromPolicy,
} from "@/lib/form-ux-migration/form-ux-governance-policy-engine";
import {
  readBoundaryPhaseInput,
  readPlatformPhaseInput,
  reconcileGovernanceState,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  deriveRegistryPhase,
  getFormUxRegistryEntry,
  isFormUxRolloutEnabled,
} from "@/lib/form-ux-migration/form-ux-registry";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import { computeRolloutEnforcement } from "@/lib/form-ux-migration/rollout-controller";
import {
  emitFormUxGovernanceAuthorityViolationEvent,
} from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxAuthoritativeDecision,
  FormUxEnforcementLevel,
  FormUxFormId,
  FormUxGovernanceAuthorityViolationEvent,
  FormUxGovernancePhase,
} from "@/lib/form-ux-migration/types";

const VALID_PHASES = new Set<FormUxGovernancePhase>([1, 2, 3, 4]);

let authorityAdoptionOverride: FormUxGovernancePhase | null = null;

function parsePhase(raw: string | undefined, fallback: FormUxGovernancePhase): FormUxGovernancePhase {
  const n = Number(raw ?? String(fallback));
  if (VALID_PHASES.has(n as FormUxGovernancePhase)) {
    return n as FormUxGovernancePhase;
  }
  return fallback;
}

function collapseEnforcement(
  level: FormUxEnforcementLevel,
): FormUxAuthoritativeDecision["enforcement"] {
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

function buildLayerInput(formId: FormUxFormId) {
  const entry = getFormUxRegistryEntry(formId);
  const registered = entry != null;
  const rolloutEnabled = isFormUxRolloutEnabled(formId);
  return {
    boundaryPhase: readBoundaryPhaseInput(),
    platformPhase: readPlatformPhaseInput(),
    registryPhase: registered ? deriveRegistryPhase(formId) : 1,
    rolloutEnabled,
    registered,
  };
}

function emitViolation(event: Omit<FormUxGovernanceAuthorityViolationEvent, "ts">): void {
  emitFormUxGovernanceAuthorityViolationEvent({ ...event, ts: Date.now() });
}

function emitPolicyViolation(
  formId: FormUxFormId,
  resolution: AuthorityResolution,
): void {
  if (!resolution.violation) return;
  emitViolation({
    formId,
    violatingLayer: resolution.violation.violatingLayer,
    expectedAuthority: resolution.violation.expectedAuthority,
    actualAuthority: resolution.violation.actualAuthority,
    violationType: resolution.violation.violationType,
    severity: resolution.violation.severity,
  });
}

export function getFormUxAuthorityAdoptionPhase(): FormUxGovernancePhase {
  return authorityAdoptionOverride ?? parsePhase(process.env.NEXT_PUBLIC_FORM_UX_AUTHORITY_PHASE, 2);
}

export function resolveAuthoritativePhase(formId: FormUxFormId): AuthorityResolution {
  const input = buildLayerInput(formId);
  const resolution = resolveAuthorityFromPolicy(input);
  emitPolicyViolation(formId, resolution);
  return resolution;
}

function computeBlocked(
  formId: FormUxFormId,
  resolution: AuthorityResolution,
): boolean {
  const entry = getFormUxRegistryEntry(formId);
  const registered = entry != null;

  if (resolution.authoritySource === "boundary" && resolution.phase === 4) {
    if (!registered) {
      emitViolation({
        formId,
        violatingLayer: "boundary",
        expectedAuthority: "boundary",
        actualAuthority: "boundary",
        violationType: "enforcement_block",
        severity: "critical",
        authorityPhase: resolution.phase,
      });
      return true;
    }
  }

  return false;
}

function buildDecisionFromResolution(
  formId: FormUxFormId,
  resolution: AuthorityResolution,
): FormUxAuthoritativeDecision {
  const phase = resolution.phase;
  const rolloutEnabled = isFormUxRolloutEnabled(formId);

  let mode: FormUxAuthoritativeDecision["mode"] = "legacy";
  if (phase <= 1 || !rolloutEnabled) {
    mode = "legacy";
  } else if (phase >= 3 && rolloutEnabled) {
    mode = "enforced";
  } else if (formHasShadowFields(formId)) {
    mode = "shadow";
  }

  let routing: FormUxAuthoritativeDecision["routing"] = "legacy";
  if (phase >= 2 && rolloutEnabled) {
    routing = "orchestrator";
  }

  let enforcement: FormUxAuthoritativeDecision["enforcement"] = "off";
  if (formId === "ricambio" && rolloutEnabled) {
    const pilot = computeRolloutEnforcement(formId, "prezzo-listino");
    enforcement = collapseEnforcement(pilot.effectiveEnforcement);
  }

  const blocked = computeBlocked(formId, resolution);

  return {
    phase,
    authoritySource: resolution.authoritySource,
    mode,
    enforcement,
    routing,
    blocked,
  };
}

/** @deprecated Runtime consumers must use getFormUxGovernanceDecision (SGCL). Internal to collapse router. */
export function getFormUxAuthoritativeDecision(
  formId: FormUxFormId,
): FormUxAuthoritativeDecision {
  const resolution = resolveAuthoritativePhase(formId);
  return buildDecisionFromResolution(formId, resolution);
}

/** Global axis phase — boundary/platform only (no per-form registry cap). */
export function resolveAuthoritativePhaseGlobal(): AuthorityResolution {
  const input = {
    boundaryPhase: readBoundaryPhaseInput(),
    platformPhase: readPlatformPhaseInput(),
    registryPhase: 1 as FormUxGovernancePhase,
    rolloutEnabled: true,
    registered: true,
  };
  return resolveAuthorityFromPolicy(input);
}

export function getFormUxAuthoritativePhaseGlobal(): FormUxGovernancePhase {
  return resolveAuthoritativePhaseGlobal().phase;
}

/** Shadow diff Authority vs UGP — adoption >= 2, runtime unchanged. */
export function runAuthorityShadowEvaluation(formId: FormUxFormId): void {
  if (getFormUxAuthorityAdoptionPhase() < 2) return;

  const authority = getFormUxAuthoritativeDecision(formId);
  const ugpState = reconcileGovernanceState(formId);

  if (authority.phase !== ugpState.resolvedPhase) {
    emitViolation({
      formId,
      violatingLayer: "registry",
      expectedAuthority: authority.authoritySource,
      actualAuthority: "platform",
      violationType: "authority_ugp_divergence",
      severity: "warn",
      ugpPhase: ugpState.resolvedPhase,
      authorityPhase: authority.phase,
    });
  }
}

/** Test helpers. */
export function setFormUxAuthorityAdoptionPhaseForTests(
  phase: FormUxGovernancePhase | null,
): void {
  authorityAdoptionOverride = phase;
}

export function resetFormUxGovernanceAuthority(): void {
  authorityAdoptionOverride = null;
}
