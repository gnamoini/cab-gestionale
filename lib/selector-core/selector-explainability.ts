/**
 * @advisory v5.5 — single explainability entrypoint.
 * @advisory v5.6 — semantic routing + use-case bundles (runtime trace in selector-fallback-trace).
 */
import { SELECTOR_BASE_SNAPSHOT_V0 } from "@/lib/selector-core/selector-config-snapshot";
import {
  routeCausalExplanation,
  routeExistingCausalModel,
  type CausalRoutingResult,
  type CausalSemanticIntent,
} from "@/lib/selector-core/selector-causal-semantic-router";
import { createEmptyCausalModel } from "@/lib/selector-core/selector-core-causal-model";
import type {
  BuildCausalModelInput,
  UnifiedSelectorCausalModel,
} from "@/lib/selector-core/selector-causal-model-interface";
import {
  getTraceById,
  type FallbackTrace,
  type SelectorDecisionTrace,
} from "@/lib/selector-core/selector-decision-trace";
import {
  getLastFallbackTrace,
  recordFallbackTrace,
  traceFallbackResolution,
} from "@/lib/selector-core/selector-fallback-trace";
import { getLastRuntimeContextSnapshot } from "@/lib/selector-core/selector-runtime-context-snapshot";
import type { SelectorRuntimeContext } from "@/lib/selector-core/selector-runtime-context-snapshot";
import type { GcPlan } from "@/lib/selector-core/selector-snapshot-gc-policy";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

export type {
  FallbackSource,
  FallbackTrace,
  FallbackRejectedSource,
  FallbackTraceInput,
} from "@/lib/selector-core/selector-fallback-trace";

export {
  traceFallbackResolution,
  getLastFallbackTrace,
  setLastFallbackTrace,
  isFallbackExplainabilityEnabled,
  __resetFallbackTraceForTests,
} from "@/lib/selector-core/selector-fallback-trace";

export type ExplainabilityDegradationMode = "NORMAL" | "DEGRADED" | "FORENSIC";

/** @deprecated v5.5 — mapped via toLegacyDegradationMode */
export type LegacyExplainabilityDegradationMode =
  | "FULL"
  | "PARTIAL"
  | "MINIMAL"
  | "FORENSIC_RECONSTRUCTED";

export function toLegacyDegradationMode(
  mode: ExplainabilityDegradationMode,
): LegacyExplainabilityDegradationMode {
  if (mode === "NORMAL") return "FULL";
  if (mode === "DEGRADED") return "MINIMAL";
  return "FORENSIC_RECONSTRUCTED";
}

export type FallbackExplainabilityResult = {
  mode: ExplainabilityDegradationMode;
  trace: FallbackTrace;
  warnings: string[];
  valid: true;
};

export type ReconstructFallbackInput = {
  expectedVersion: string;
  runtimeContext?: SelectorRuntimeContext;
  causalGraph?: UnifiedSelectorCausalModel;
  partialRegistry?: Record<string, SelectorRuntimeSnapshot>;
  partialRollback?: Record<string, SelectorRuntimeSnapshot>;
  pointerPrevious?: string;
  pointerEpoch?: number;
  manifestHashes?: Record<string, string>;
};

export type UnifiedExplanation = {
  traceId: string;
  decision?: SelectorDecisionTrace;
  fallback?: FallbackExplainabilityResult;
  gc?: GcExplanation;
  causalModel: UnifiedSelectorCausalModel;
  /** @deprecated v5.5 — use causalModel */
  causalIndex: UnifiedSelectorCausalModel;
  degradationMode: ExplainabilityDegradationMode;
  summary: string[];
  valid: true;
};

export type GcExplanation = {
  blocked: string[];
  temporalBlocked?: string[];
  reasons: string[];
};

function buildCausalInputFromExplainability(input: {
  decisionTrace?: SelectorDecisionTrace;
  fallbackTrace?: FallbackTrace | null;
  runtimeContext?: SelectorRuntimeContext | null;
  registryKeys?: string[];
  expectedVersion?: string;
  pointerEpoch?: number;
}): BuildCausalModelInput {
  const registryKeys = input.registryKeys ?? [];
  return {
    decisionTrace: input.decisionTrace,
    fallbackTrace: input.fallbackTrace,
    runtimeContext: input.runtimeContext,
    gcLineage:
      registryKeys.length > 0
        ? { nodes: registryKeys, edges: [], protected: registryKeys.slice(0, 1) }
        : input.fallbackTrace && !registryKeys.length
          ? undefined
          : input.expectedVersion
            ? {
                nodes: [input.expectedVersion],
                edges: [],
                protected: [input.expectedVersion],
              }
            : undefined,
  };
}

function routeForExplainability(
  intent: CausalSemanticIntent,
  buildInput: BuildCausalModelInput,
  existingModel?: UnifiedSelectorCausalModel,
): CausalRoutingResult {
  if (existingModel) {
    return routeExistingCausalModel(intent, existingModel);
  }
  return routeCausalExplanation(intent, buildInput);
}

function isRegistryComplete(
  expectedVersion: string,
  registryKeys: string[],
  registry: Record<string, SelectorRuntimeSnapshot>,
): boolean {
  return registryKeys.includes(expectedVersion) && !!registry[expectedVersion];
}

function buildMinimalForensicTrace(
  expectedVersion: string,
  pointerEpoch: number,
  pointerPrevious?: string,
): FallbackTrace {
  return {
    selectedSource: "v0",
    selectedVersion: SELECTOR_BASE_SNAPSHOT_V0.version,
    rejectedSources: [
      { source: "bundle", version: expectedVersion, reasonCode: "forensic_reconstruction" },
    ],
    reasonCodes: ["forensic_reconstruction", "fallback_to_v0"],
    pointerEpoch,
    recordedAt: Date.now(),
    selectionPath: [
      `forensic:${expectedVersion}:reconstructed`,
      pointerPrevious ? `previous:${pointerPrevious}:attempted` : "previous:none",
      `selected:v0:${SELECTOR_BASE_SNAPSHOT_V0.version}`,
    ],
  };
}

function resolveDegradationMode(input: {
  runtimeContext?: SelectorRuntimeContext;
  registryComplete: boolean;
  causalModel: UnifiedSelectorCausalModel;
}): ExplainabilityDegradationMode {
  if (!input.registryComplete) return "FORENSIC";
  if (!input.runtimeContext) return "DEGRADED";
  if (input.causalModel.events.length > 0) return "NORMAL";
  return "DEGRADED";
}

export function resolveExplainability(
  input: ReconstructFallbackInput,
): FallbackExplainabilityResult {
  const warnings: string[] = [];
  const registry = input.partialRegistry ?? {};
  const rollbackRegistry = input.partialRollback ?? {};
  const registryKeys = Object.keys(registry);
  const registryComplete = isRegistryComplete(
    input.expectedVersion,
    registryKeys,
    registry,
  );
  const pointerEpoch = input.pointerEpoch ?? input.runtimeContext?.pointerEpoch ?? 0;

  const buildInput = buildCausalInputFromExplainability({
    runtimeContext: input.runtimeContext,
    expectedVersion: input.expectedVersion,
    registryKeys,
    pointerEpoch,
    fallbackTrace: registryComplete
      ? undefined
      : {
          selectedSource: "bundle",
          selectedVersion: input.expectedVersion,
          rejectedSources: [],
          reasonCodes: ["partial_reconstruction"],
          pointerEpoch,
          recordedAt: Date.now(),
          selectionPath: [],
        },
  });

  const intent: CausalSemanticIntent = registryComplete ? "UX" : "FORENSIC";
  const routed = routeForExplainability(intent, buildInput, input.causalGraph);
  const causalModel = routed.model;

  const mode = resolveDegradationMode({
    runtimeContext: input.runtimeContext,
    registryComplete,
    causalModel,
  });

  let trace = buildMinimalForensicTrace(
    input.expectedVersion,
    pointerEpoch,
    input.pointerPrevious,
  );

  if (mode === "NORMAL" && registryComplete) {
    trace = traceFallbackResolution({
      expectedVersion: input.expectedVersion,
      registryKeys,
      registry,
      rollbackRegistry,
      pointerPrevious: input.pointerPrevious,
      pointerEpoch,
      manifestHashes: input.manifestHashes,
    });
  } else if (mode === "DEGRADED" && input.runtimeContext) {
    warnings.push("degraded_mode_runtime_context_only");
    trace = recordFallbackTrace(
      buildMinimalForensicTrace(input.expectedVersion, pointerEpoch, input.pointerPrevious),
    );
  } else {
    warnings.push("forensic_reconstruction_applied");
    const fallbackView = routed.views.find((v) => v.viewType === "fallback");
    const snapshotEvents = (fallbackView?.events ?? causalModel.events).filter(
      (e) => e.type === "fallback" || e.metadata.kind === "snapshot",
    );
    let resolved = false;
    for (const event of snapshotEvents) {
      const version = event.node.includes("/")
        ? (event.node.split("/")[1] ?? event.node)
        : event.node;
      if (registry[version] || rollbackRegistry[version]) {
        trace = traceFallbackResolution({
          expectedVersion: version,
          registryKeys: registry[version] ? registryKeys : [...registryKeys, version],
          registry,
          rollbackRegistry,
          pointerPrevious: input.pointerPrevious,
          pointerEpoch,
          manifestHashes: input.manifestHashes,
        });
        resolved = true;
        break;
      }
    }
    if (!resolved) {
      const reconstructed = traceFallbackResolution({
        expectedVersion: input.expectedVersion,
        registryKeys,
        registry,
        rollbackRegistry,
        pointerPrevious: input.pointerPrevious,
        pointerEpoch,
        manifestHashes: input.manifestHashes,
      });
      trace = recordFallbackTrace({
        ...reconstructed,
        reasonCodes: [
          ...reconstructed.reasonCodes,
          "partial_registry_reconstruction",
          input.causalGraph ? "causal_model_inferred" : "causal_model_synthesized",
        ],
        selectionPath:
          reconstructed.selectionPath.length > 0
            ? reconstructed.selectionPath
            : [`forensic:${input.expectedVersion}:reconstructed`],
      });
    }
  }

  return { mode, trace, warnings, valid: true };
}

/** @deprecated v5.5 — use resolveExplainability */
export function resolveFallbackExplainability(
  input: ReconstructFallbackInput,
): FallbackExplainabilityResult {
  return resolveExplainability(input);
}

export function reconstructFallbackChain(input: ReconstructFallbackInput): FallbackTrace {
  return resolveExplainability(input).trace;
}

function buildSummary(
  traceId: string,
  mode: ExplainabilityDegradationMode,
  decision?: SelectorDecisionTrace,
  fallback?: FallbackExplainabilityResult,
): string[] {
  const summary = [`traceId=${traceId}`, `degradationMode=${mode}`];
  if (decision?.outputDecision?.surface) {
    summary.push(`surface=${decision.outputDecision.surface}`);
  }
  if (fallback?.trace.selectedSource) {
    summary.push(
      `fallback=${fallback.trace.selectedSource}:${fallback.trace.selectedVersion}`,
    );
  }
  if (fallback?.warnings.length) {
    summary.push(`warnings=${fallback.warnings.join(";")}`);
  }
  return summary;
}

export function getGcExplanationFromPlan(
  plan: GcPlan,
  _model?: UnifiedSelectorCausalModel,
): GcExplanation {
  void _model;
  return {
    blocked: [...plan.blockedByDependency],
    temporalBlocked: plan.temporalBlocked ? [...plan.temporalBlocked] : undefined,
    reasons: plan.candidates.map((c) => `${c.version}:${c.reason}`),
  };
}

export function getGcExplanation(
  traceIdOrPlan: string | GcPlan,
  planOrModel?: GcPlan | UnifiedSelectorCausalModel,
): GcExplanation {
  if (typeof traceIdOrPlan !== "string") {
    return getGcExplanationFromPlan(
      traceIdOrPlan,
      planOrModel as UnifiedSelectorCausalModel | undefined,
    );
  }
  const traceId = traceIdOrPlan;
  if (
    planOrModel &&
    typeof planOrModel === "object" &&
    "candidates" in planOrModel &&
    "blockedByDependency" in planOrModel
  ) {
    return getGcExplanationFromPlan(planOrModel as GcPlan);
  }
  const explanation = getExplanation(traceId);
  return (
    explanation.gc ?? {
      blocked: [],
      reasons: [`no gc plan for traceId=${traceId}`],
    }
  );
}

export function getFallbackExplanation(traceId: string): FallbackExplainabilityResult {
  const decision = getTraceById(traceId);
  const fallbackTrace = getLastFallbackTrace();
  const runtimeContext =
    decision?.runtimeContext ?? getLastRuntimeContextSnapshot() ?? undefined;

  return resolveExplainability({
    expectedVersion: decision?.snapshotVersion ?? fallbackTrace?.selectedVersion ?? "v0",
    runtimeContext,
    partialRegistry: {},
    pointerPrevious: undefined,
    pointerEpoch: runtimeContext?.pointerEpoch ?? fallbackTrace?.pointerEpoch,
  });
}

export type { CausalSemanticIntent } from "@/lib/selector-core/selector-causal-semantic-router";

function buildForensicExplanation(traceId: string): UnifiedExplanation {
  try {
    const decision = getTraceById(traceId);
    const fallback = getFallbackExplanation(traceId);
    const runtimeContext =
      decision?.runtimeContext ?? getLastRuntimeContextSnapshot() ?? undefined;

    const routed = routeCausalExplanation("FORENSIC", {
      decisionTrace: decision,
      fallbackTrace: fallback.trace,
      runtimeContext,
    });
    const causalModel = routed.model;

    const degradationMode = decision ? fallback.mode : "FORENSIC";
    const summary = decision
      ? buildSummary(traceId, degradationMode, decision, fallback)
      : [
          `traceId=${traceId}`,
          "decision trace not found",
          `degradationMode=${degradationMode}`,
          "forensic envelope returned",
        ];

    return {
      traceId,
      decision,
      fallback,
      causalModel,
      causalIndex: causalModel,
      degradationMode,
      summary,
      valid: true,
    };
  } catch {
    const empty = createEmptyCausalModel();
    return {
      traceId,
      causalModel: empty,
      causalIndex: empty,
      degradationMode: "FORENSIC",
      summary: [`traceId=${traceId}`, "explanation recovered via forensic envelope"],
      valid: true,
    };
  }
}

function buildUxExplanation(traceId: string): UnifiedExplanation {
  const decision = getTraceById(traceId);
  const fallback = getFallbackExplanation(traceId);
  const degradationMode = decision ? fallback.mode : "FORENSIC";
  const empty = createEmptyCausalModel();

  return {
    traceId,
    decision,
    fallback,
    causalModel: empty,
    causalIndex: empty,
    degradationMode,
    summary: decision
      ? buildSummary(traceId, degradationMode, decision, fallback)
      : [`traceId=${traceId}`, "decision trace not found", `degradationMode=${degradationMode}`],
    valid: true,
  };
}

function buildDebugExplanation(traceId: string): UnifiedExplanation {
  const decision = getTraceById(traceId);
  const fallback = getFallbackExplanation(traceId);
  const runtimeContext =
    decision?.runtimeContext ?? getLastRuntimeContextSnapshot() ?? undefined;

  const routing = routeCausalExplanation("DEBUG", {
    decisionTrace: decision,
    fallbackTrace: fallback.trace,
    runtimeContext,
  });

  return {
    traceId,
    decision,
    fallback,
    causalModel: routing.model,
    causalIndex: routing.model,
    degradationMode: decision ? fallback.mode : "FORENSIC",
    summary: [
      ...buildSummary(traceId, fallback.mode, decision, fallback),
      "intent=DEBUG",
      `views=${routing.views.length}`,
    ],
    valid: true,
  };
}

function buildAuditExplanation(traceId: string): UnifiedExplanation {
  const decision = getTraceById(traceId);
  const fallback = getFallbackExplanation(traceId);
  const runtimeContext =
    decision?.runtimeContext ?? getLastRuntimeContextSnapshot() ?? undefined;

  const routing = routeCausalExplanation("AUDIT", {
    decisionTrace: decision,
    fallbackTrace: fallback.trace,
    runtimeContext,
  });

  const gcView = routing.views.find((v) => v.viewType === "gc") ?? routing.views[0]!;

  return {
    traceId,
    decision,
    fallback,
    gc: getGcExplanation(traceId),
    causalModel: routing.model,
    causalIndex: routing.model,
    degradationMode: decision ? fallback.mode : "FORENSIC",
    summary: [`traceId=${traceId}`, "intent=AUDIT", `gcEvents=${gcView.eventCount}`],
    valid: true,
  };
}

/** @advisory v5.7 — single public explainability entrypoint (intent routes internally). */
export function getExplanation(
  traceId: string,
  intent: CausalSemanticIntent = "FORENSIC",
): UnifiedExplanation {
  switch (intent) {
    case "UX":
      return buildUxExplanation(traceId);
    case "DEBUG":
      return buildDebugExplanation(traceId);
    case "AUDIT":
      return buildAuditExplanation(traceId);
    case "FORENSIC":
    default:
      return buildForensicExplanation(traceId);
  }
}

/** @deprecated v5.5 — use getExplanation */
export function getSelectorExplanation(traceId: string): UnifiedExplanation {
  return getExplanation(traceId);
}
