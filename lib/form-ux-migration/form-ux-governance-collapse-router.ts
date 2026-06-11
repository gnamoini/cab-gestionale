import {
  getFormUxAuthoritativeDecision,
  getFormUxAuthoritativePhaseGlobal,
} from "@/lib/form-ux-migration/form-ux-governance-authority";
import {
  getFormUxDecisionInternal,
  readBoundaryPhaseInput,
  readPlatformPhaseInput,
  resolveGovernanceState,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  emitFormUxGovernanceCollapseEvent,
  emitFormUxSgclRoutingEvent,
} from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxAuthoritativeDecision,
  FormUxCollapsedGovernanceDecision,
  FormUxCollapseMode,
  FormUxCollapseSource,
  FormUxFormId,
  FormUxGovernanceDecision,
  FormUxGovernancePhase,
  FormUxSgclResolvedSource,
} from "@/lib/form-ux-migration/types";

const CACHE_TTL_MS = 5_000;

let gamlRuntimeAvailableOverride: boolean | null = null;
let fallbackHopGuard = false;

type CacheEntry = {
  decision: FormUxCollapsedGovernanceDecision;
  resolvedSource: FormUxSgclResolvedSource;
  cachedAt: number;
};

const decisionCache = new Map<string, CacheEntry>();
const previousDecisionByForm = new Map<string, FormUxCollapsedGovernanceDecision>();

export function isGamlRuntimeAvailable(): boolean {
  if (gamlRuntimeAvailableOverride != null) return gamlRuntimeAvailableOverride;
  return true;
}

export function setGamlRuntimeAvailableForTests(available: boolean | null): void {
  gamlRuntimeAvailableOverride = available;
}

function mapFromGaml(auth: FormUxAuthoritativeDecision): FormUxCollapsedGovernanceDecision {
  return {
    phase: auth.phase,
    mode: auth.mode,
    enforcement: auth.enforcement,
    routing: auth.routing,
    blocked: auth.blocked,
    authoritySource: "gaml",
    collapsed: true,
  };
}

function mapFromUgp(
  ugp: FormUxGovernanceDecision,
  blocked = false,
): FormUxCollapsedGovernanceDecision {
  return {
    phase: ugp.phase,
    mode: ugp.mode,
    enforcement: ugp.enforcement,
    routing: ugp.routing,
    blocked,
    authoritySource: "gaml",
    collapsed: true,
  };
}

function decisionsEqual(
  a: FormUxCollapsedGovernanceDecision,
  b: FormUxCollapsedGovernanceDecision,
): boolean {
  return (
    a.phase === b.phase &&
    a.mode === b.mode &&
    a.enforcement === b.enforcement &&
    a.routing === b.routing &&
    a.blocked === b.blocked
  );
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

function emitCollapseFallbackEvent(
  formId: FormUxFormId,
  ugp: FormUxGovernanceDecision,
): void {
  emitFormUxGovernanceCollapseEvent({
    formId,
    previousSource: "gaml",
    newSource: "ugp",
    phaseAfter: ugp.phase,
    collapseMode: "fallback",
    divergenceHistoryHash: computeDivergenceHistoryHash({
      platformPhase: readPlatformPhaseInput(),
      boundaryPhase: readBoundaryPhaseInput(),
      registryPhase: resolveGovernanceState(formId).registryPhase,
      ugpPhase: ugp.phase,
      gamlPhase: ugp.phase,
    }),
    ts: Date.now(),
  });
}

type GamlAttempt = {
  decision: FormUxAuthoritativeDecision | null;
  fallbackReason?: "gaml_unavailable" | "gaml_threw";
};

function tryGamlDecision(formId: FormUxFormId): GamlAttempt {
  if (!isGamlRuntimeAvailable()) {
    return { decision: null, fallbackReason: "gaml_unavailable" };
  }
  try {
    return { decision: getFormUxAuthoritativeDecision(formId) };
  } catch {
    return { decision: null, fallbackReason: "gaml_threw" };
  }
}

export type RoutedGovernanceDecision = {
  decision: FormUxCollapsedGovernanceDecision;
  resolvedSource: FormUxSgclResolvedSource;
  routingLatencyMs: number;
  fallbackReason?: string;
};

function commitAndEmit(
  formId: FormUxFormId,
  decision: FormUxCollapsedGovernanceDecision,
  resolvedSource: FormUxSgclResolvedSource,
  routingLatencyMs: number,
  fallbackReason?: string,
): RoutedGovernanceDecision {
  const previous = previousDecisionByForm.get(formId);
  const divergenceWithPreviousDecision =
    previous != null && !decisionsEqual(previous, decision);

  decisionCache.set(formId, {
    decision,
    resolvedSource,
    cachedAt: Date.now(),
  });
  previousDecisionByForm.set(formId, decision);

  emitFormUxSgclRoutingEvent({
    formId,
    resolvedSource,
    collapseDecision: decision,
    routingLatencyMs,
    fallbackReason,
    divergenceWithPreviousDecision,
    ts: Date.now(),
  });

  return { decision, resolvedSource, routingLatencyMs, fallbackReason };
}

/** Uncached GAML → UGP resolution for shadow mode (phase 1–2). */
export function resolveCollapsedGovernanceDecisionUncached(formId: FormUxFormId): {
  decision: FormUxCollapsedGovernanceDecision;
  source: FormUxCollapseSource;
  collapseMode: FormUxCollapseMode;
} {
  const gamlAttempt = tryGamlDecision(formId);
  if (gamlAttempt.decision != null) {
    return {
      decision: mapFromGaml(gamlAttempt.decision),
      source: "gaml",
      collapseMode: "active",
    };
  }

  const ugp = getFormUxDecisionInternal(formId);
  emitCollapseFallbackEvent(formId, ugp);

  return {
    decision: mapFromUgp(ugp),
    source: "ugp",
    collapseMode: "fallback",
  };
}

/** Phase 3 runtime router — cache → GAML → UGP fallback (max 1 hop). */
export function routeGovernanceDecision(formId: FormUxFormId): RoutedGovernanceDecision {
  const start = Date.now();
  const cached = decisionCache.get(formId);
  const now = Date.now();

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return {
      decision: cached.decision,
      resolvedSource: "sgcl-cache",
      routingLatencyMs: Date.now() - start,
    };
  }

  if (fallbackHopGuard) {
    if (cached) {
      return {
        decision: cached.decision,
        resolvedSource: cached.resolvedSource,
        routingLatencyMs: Date.now() - start,
        fallbackReason: "fallback_loop_guard",
      };
    }
    const degraded = mapFromUgp(getFormUxDecisionInternal(formId));
    return commitAndEmit(formId, degraded, "ugp-fallback", Date.now() - start, "fallback_loop_guard");
  }

  fallbackHopGuard = true;
  try {
    const gamlAttempt = tryGamlDecision(formId);
    if (gamlAttempt.decision != null) {
      return commitAndEmit(
        formId,
        mapFromGaml(gamlAttempt.decision),
        "gaml",
        Date.now() - start,
      );
    }

    const ugp = getFormUxDecisionInternal(formId);
    emitCollapseFallbackEvent(formId, ugp);
    return commitAndEmit(
      formId,
      mapFromUgp(ugp),
      "ugp-fallback",
      Date.now() - start,
      gamlAttempt.fallbackReason,
    );
  } finally {
    fallbackHopGuard = false;
  }
}

export function routeGovernancePhaseGlobal(): FormUxGovernancePhase {
  if (isGamlRuntimeAvailable()) {
    try {
      return getFormUxAuthoritativePhaseGlobal();
    } catch {
      // fall through to UGP global
    }
  }
  return resolveGovernanceState().resolvedPhase;
}

export function tryGamlDecisionForShadow(formId: FormUxFormId): FormUxAuthoritativeDecision | null {
  return tryGamlDecision(formId).decision;
}

export function invalidateSgclCache(formId?: FormUxFormId): void {
  if (formId != null) {
    decisionCache.delete(formId);
    return;
  }
  decisionCache.clear();
}

export function resetSgclRouterCache(): void {
  decisionCache.clear();
  previousDecisionByForm.clear();
  gamlRuntimeAvailableOverride = null;
  fallbackHopGuard = false;
}
