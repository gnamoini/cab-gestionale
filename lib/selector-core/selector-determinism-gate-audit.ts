/**
 * @advisory v5.5 — build-time complexity audit (Node/fs only).
 */
import fs from "node:fs";
import {
  DEFAULT_BUILD_CHECKPOINT_PATH,
  DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH,
} from "@/lib/selector-core/selector-distributed-checkpoint-manager";
import type { ComplexityAuditResult } from "@/lib/selector-core/selector-determinism-gate";

const LEGACY_SHIM_MODULES: string[] = [];

const TRACE_SIDE_CHANNELS = [
  "selector-decision-trace.ts",
  "selector-explainability.ts",
  "selector-runtime-context-snapshot.ts",
];

const REGISTRY_VIEWS = [
  "selector-snapshot-registry.generated.ts",
  "selector-rollback-registry.generated.ts",
  "selector-unified-snapshot-index.ts",
];

function fileExists(absPath: string): boolean {
  return fs.existsSync(absPath);
}

export function auditSelectorSystemComplexity(): ComplexityAuditResult {
  const redundancyMap: Record<string, string[]> = {
    graph_models: [...LEGACY_SHIM_MODULES.filter((m) => m.includes("graph") || m.includes("causal"))],
    trace_side_channels: [...TRACE_SIDE_CHANNELS],
    checkpoint_sources: [],
    registry_views: [...REGISTRY_VIEWS],
    v55_shims: [...LEGACY_SHIM_MODULES],
  };

  if (fileExists(DEFAULT_BUILD_CHECKPOINT_PATH)) {
    redundancyMap.checkpoint_sources.push("selector-build-checkpoint.json");
  }
  if (fileExists(DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH)) {
    redundancyMap.checkpoint_sources.push("selector-build-checkpoint-manifest.json");
  }

  let complexityScore = 0;
  complexityScore += redundancyMap.v55_shims.length * 5;
  complexityScore += TRACE_SIDE_CHANNELS.length * 10;
  complexityScore += redundancyMap.checkpoint_sources.length * 10;
  complexityScore += REGISTRY_VIEWS.length * 5;

  const collapseSuggestions: string[] = [
    "Use selector-core-causal-model.ts as single causal SSOT",
    "Use selector-explainability.ts getExplanation() as single debug entrypoint",
    "Use selector-determinism-gate.ts for strict runtime and semantic cross-env checks",
    "Remove v5.4/v5.5 shim modules in v5.6 ultra-compressed core",
    "Route GC temporal validation through buildUnifiedSelectorCausalModel only",
  ];

  if (redundancyMap.v55_shims.length > 0) {
    collapseSuggestions.push(
      `Retire shim modules: ${redundancyMap.v55_shims.join(", ")}`,
    );
  }

  return {
    complexityScore: Math.min(100, complexityScore),
    redundancyMap,
    collapseSuggestions: [...new Set(collapseSuggestions)],
  };
}
