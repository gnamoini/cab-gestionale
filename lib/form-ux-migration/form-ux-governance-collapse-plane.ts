import {
  isGamlRuntimeAvailable,
  resolveCollapsedGovernanceDecisionUncached,
  resetSgclRouterCache,
  routeGovernanceDecision,
  routeGovernancePhaseGlobal,
  setGamlRuntimeAvailableForTests,
  tryGamlDecisionForShadow,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-router";
import { runAuthorityShadowEvaluation } from "@/lib/form-ux-migration/form-ux-governance-authority";
import {
  getFormUxDecisionInternal,
  reconcileGovernanceState,
  runUgpShadowEvaluation,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import { isFormUxRolloutEnabled } from "@/lib/form-ux-migration/form-ux-registry";
import {
  getFormUxPlatformPhase,
  isFormUxOrchestratorRoutingActive,
  isFormUxOrchestratorShadowMode,
} from "@/lib/form-ux-migration/form-ux-platform-config";
import { emitFormUxGovernanceCollapseEvent } from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxCollapseMode,
  FormUxCollapseSource,
  FormUxCollapsedGovernanceDecision,
  FormUxFormId,
  FormUxGovernancePhase,
} from "@/lib/form-ux-migration/types";

const VALID_PHASES = new Set<FormUxGovernancePhase>([1, 2, 3, 4]);

let collapseAdoptionOverride: FormUxGovernancePhase | null = null;

function parsePhase(raw: string | undefined, fallback: FormUxGovernancePhase): FormUxGovernancePhase {
  const n = Number(raw ?? String(fallback));
  if (VALID_PHASES.has(n as FormUxGovernancePhase)) {
    return n as FormUxGovernancePhase;
  }
  return fallback;
}

function computeDivergenceHistoryHash(input: {
  platformPhase: FormUxGovernancePhase;
  boundaryPhase: FormUxGovernancePhase;
  registryPhase: FormUxGovernancePhase;
  ugpPhase: FormUxGovernancePhase;
  gamlPhase: FormUxGovernancePhase;
}): string {
  const raw = `${input.platformPhase}:${input.boundaryPhase}:${input.registryPhase}:${input.ugpPhase}:${input.gamlPhase}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(hash).toString(16)}`;
}

function emitCollapseEvent(input: {
  formId?: FormUxFormId;
  previousSource: FormUxCollapseSource;
  newSource: FormUxCollapseSource;
  phaseBefore?: FormUxGovernancePhase;
  phaseAfter: FormUxGovernancePhase;
  collapseMode: FormUxCollapseMode;
  divergenceHistoryHash?: string;
}): void {
  emitFormUxGovernanceCollapseEvent({ ...input, ts: Date.now() });
}

export function getFormUxCollapseAdoptionPhase(): FormUxGovernancePhase {
  return collapseAdoptionOverride ?? parsePhase(process.env.NEXT_PUBLIC_FORM_UX_COLLAPSE_PHASE, 2);
}

export { isGamlRuntimeAvailable, setGamlRuntimeAvailableForTests };

export type CollapsedGovernanceResolution = {
  decision: FormUxCollapsedGovernanceDecision;
  source: FormUxCollapseSource;
  collapseMode: FormUxCollapseMode;
};

/** Shadow parity path — no SGCL cache (phase 1–2). */
export function resolveCollapsedGovernanceDecision(
  formId: FormUxFormId,
): CollapsedGovernanceResolution {
  return resolveCollapsedGovernanceDecisionUncached(formId);
}

export function getFormUxGovernanceDecision(
  formId: FormUxFormId,
): FormUxCollapsedGovernanceDecision {
  if (getFormUxCollapseAdoptionPhase() >= 3) {
    return routeGovernanceDecision(formId).decision;
  }
  return resolveCollapsedGovernanceDecision(formId).decision;
}

/** @deprecated Internal adapter — runtime consumers must use getFormUxGovernanceDecision. */
export function getFormUxGovernanceDecisionInternal(
  formId: FormUxFormId,
): FormUxCollapsedGovernanceDecision {
  return routeGovernanceDecision(formId).decision;
}

export function getFormUxGovernancePhaseGlobal(): FormUxGovernancePhase {
  return routeGovernancePhaseGlobal();
}

export type RuntimeGovernanceView = {
  phase: FormUxGovernancePhase;
  mode: FormUxCollapsedGovernanceDecision["mode"];
  routing: FormUxCollapsedGovernanceDecision["routing"];
  blocked: boolean;
};

function envLegacyGovernanceView(formId: FormUxFormId): RuntimeGovernanceView {
  const phase = getFormUxPlatformPhase();
  const rollout = isFormUxRolloutEnabled(formId);
  let routing: RuntimeGovernanceView["routing"] = "legacy";
  if (phase <= 1) {
    routing = "legacy";
  } else if (phase === 2) {
    routing = "orchestrator";
  } else {
    routing = isFormUxOrchestratorRoutingActive(rollout) ? "orchestrator" : "legacy";
  }

  let mode: RuntimeGovernanceView["mode"] = "legacy";
  if (isFormUxOrchestratorShadowMode()) {
    mode = "shadow";
  } else if (phase >= 3) {
    mode = "enforced";
  }

  return { phase, mode, routing, blocked: false };
}

/** Consumer hot-path — SGCL at collapse >= 3, env legacy otherwise (no GAML/UGP). */
export function resolveConsumerGovernanceView(formId: FormUxFormId): RuntimeGovernanceView {
  if (getFormUxCollapseAdoptionPhase() >= 3) {
    const d = getFormUxGovernanceDecision(formId);
    return { phase: d.phase, mode: d.mode, routing: d.routing, blocked: d.blocked };
  }
  return envLegacyGovernanceView(formId);
}

/** @deprecated Use resolveConsumerGovernanceView. */
export function resolveCollapsedRuntimeView(formId: FormUxFormId): RuntimeGovernanceView {
  return resolveConsumerGovernanceView(formId);
}

/** @deprecated Use resolveConsumerGovernanceView. */
export function resolveRuntimeGovernanceView(formId: FormUxFormId): RuntimeGovernanceView {
  return resolveConsumerGovernanceView(formId);
}

/** Shadow UGP vs GAML — collapse adoption >= 2, runtime unchanged. */
export function runCollapseShadowEvaluation(formId: FormUxFormId): void {
  if (getFormUxCollapseAdoptionPhase() < 2) return;

  const ugpState = reconcileGovernanceState(formId);
  const ugp = getFormUxDecisionInternal(formId);
  const gaml = tryGamlDecisionForShadow(formId);

  if (gaml == null) return;

  if (ugp.phase !== gaml.phase) {
    emitCollapseEvent({
      formId,
      previousSource: "ugp",
      newSource: "gaml",
      phaseBefore: ugp.phase,
      phaseAfter: gaml.phase,
      collapseMode: "shadow",
      divergenceHistoryHash: computeDivergenceHistoryHash({
        platformPhase: ugpState.platformPhase,
        boundaryPhase: ugpState.boundaryPhase,
        registryPhase: ugpState.registryPhase,
        ugpPhase: ugp.phase,
        gamlPhase: gaml.phase,
      }),
    });
  }
}

/** Shadow pipeline — collapse 4 uses SGCL only; else triple shadow at phase 2+. */
export function runGovernanceShadowPipeline(formId: FormUxFormId): void {
  const collapsePhase = getFormUxCollapseAdoptionPhase();

  if (collapsePhase >= 4) {
    runCollapseShadowEvaluation(formId);
    return;
  }

  if (collapsePhase >= 2) {
    runCollapseShadowEvaluation(formId);
  }

  runUgpShadowEvaluation(formId);
  runAuthorityShadowEvaluation(formId);
}

export function setFormUxCollapseAdoptionPhaseForTests(
  phase: FormUxGovernancePhase | null,
): void {
  collapseAdoptionOverride = phase;
}

export function resetFormUxGovernanceCollapsePlane(): void {
  collapseAdoptionOverride = null;
  resetSgclRouterCache();
}
