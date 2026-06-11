import {
  getFormUxCollapseAdoptionPhase,
  getFormUxGovernancePhaseGlobal,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";

export type FormUxPlatformPhase = 1 | 2 | 3 | 4;

const VALID_PHASES = new Set<FormUxPlatformPhase>([1, 2, 3, 4]);

let phaseOverride: FormUxPlatformPhase | null = null;

function parsePhase(raw: string | undefined): FormUxPlatformPhase {
  const n = Number(raw ?? "1");
  if (VALID_PHASES.has(n as FormUxPlatformPhase)) {
    return n as FormUxPlatformPhase;
  }
  return 1;
}

/** Platform rollout phase — default Phase 1 (registry read-only, zero routing change). */
export function getFormUxPlatformPhase(): FormUxPlatformPhase {
  if (phaseOverride != null) return phaseOverride;
  if (getFormUxCollapseAdoptionPhase() >= 3) {
    return getFormUxGovernancePhaseGlobal();
  }
  return parsePhase(process.env.NEXT_PUBLIC_FORM_UX_PLATFORM_PHASE);
}

/** Alias for tests — same as getFormUxPlatformPhase when override is set. */
export function getFormUxPlatformPhaseResolved(): FormUxPlatformPhase {
  return getFormUxPlatformPhase();
}

export function isFormUxOrchestratorShadowMode(): boolean {
  return getFormUxPlatformPhase() === 2;
}

export function isFormUxOrchestratorRoutingActive(formRolloutEnabled: boolean): boolean {
  const phase = getFormUxPlatformPhase();
  if (phase <= 1) return false;
  if (phase === 2) return true;
  if (phase === 3) return formRolloutEnabled;
  return true;
}

/** Test helper — override phase without env mutation in parallel tests. */
export function setFormUxPlatformPhaseForTests(phase: FormUxPlatformPhase | null): void {
  phaseOverride = phase;
}
