import type {
  FormUxAuthorityViolationType,
  FormUxGovernancePhase,
  GovernanceLayer,
} from "@/lib/form-ux-migration/types";

export type { GovernanceLayer };

export type GovernanceLayerInput = {
  boundaryPhase: FormUxGovernancePhase;
  platformPhase: FormUxGovernancePhase;
  registryPhase: FormUxGovernancePhase;
  rolloutEnabled: boolean;
  registered: boolean;
};

export type AuthorityViolationDescriptor = {
  violationType: FormUxAuthorityViolationType;
  violatingLayer: GovernanceLayer;
  expectedAuthority: GovernanceLayer;
  actualAuthority: GovernanceLayer;
  severity: "info" | "warn" | "critical";
};

export type AuthorityResolution = {
  phase: FormUxGovernancePhase;
  authoritySource: GovernanceLayer;
  appliedRule: "R1" | "R2" | "R3" | "R4";
  violation?: AuthorityViolationDescriptor;
};

/** Hook for future policy evolution without touching authority core. */
export function isFormUxAuthorityPolicyV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_FORM_UX_AUTHORITY_POLICY_V2 === "1";
}

function registryEscalationAttempt(
  input: GovernanceLayerInput,
): AuthorityViolationDescriptor | undefined {
  if (input.rolloutEnabled || !input.registered) return undefined;
  if (input.registryPhase <= input.platformPhase) return undefined;
  return {
    violationType: "registry_escalation_attempt",
    violatingLayer: "registry",
    expectedAuthority: "platform",
    actualAuthority: "registry",
    severity: "info",
  };
}

/** R1 — enforcement dominance: boundary >= 3 wins always. */
export function evaluateEnforcementDominance(
  input: GovernanceLayerInput,
): AuthorityResolution | null {
  if (input.boundaryPhase < 3) return null;
  return {
    phase: input.boundaryPhase,
    authoritySource: "boundary",
    appliedRule: "R1",
  };
}

/** R2 — registry capability gate: no rollout → phase 1 cap. */
export function evaluateRegistryCapabilityGate(
  input: GovernanceLayerInput,
): AuthorityResolution | null {
  if (input.registered && input.rolloutEnabled) return null;
  const violation = registryEscalationAttempt(input);
  return {
    phase: 1,
    authoritySource: "registry",
    appliedRule: "R2",
    violation,
  };
}

/** R3 — boundary soft precedence when boundary > platform. */
export function evaluateBoundarySoftPrecedence(
  input: GovernanceLayerInput,
): AuthorityResolution | null {
  if (input.boundaryPhase <= input.platformPhase) return null;
  return {
    phase: input.boundaryPhase,
    authoritySource: "boundary",
    appliedRule: "R3",
  };
}

/** R4 — platform orchestration (ties go to platform). */
export function evaluatePlatformOrchestration(
  input: GovernanceLayerInput,
): AuthorityResolution {
  return {
    phase: input.platformPhase,
    authoritySource: "platform",
    appliedRule: "R4",
  };
}

/** Ordered policy resolution — semantic precedence, no numeric max(). */
export function resolveAuthorityFromPolicy(
  input: GovernanceLayerInput,
): AuthorityResolution {
  if (isFormUxAuthorityPolicyV2Enabled()) {
    // V2 hook: same rules today; extension point for future rule sets.
  }

  return (
    evaluateEnforcementDominance(input) ??
    evaluateRegistryCapabilityGate(input) ??
    evaluateBoundarySoftPrecedence(input) ??
    evaluatePlatformOrchestration(input)
  );
}
