/**
 * @advisory v6.3 — observation registry accessor + index/doc-map views (generated snapshot SSOT).
 */
import { OBSERVATION_REGISTRY_SNAPSHOT } from "@/lib/selector-core/generated/selector-observation-registry.generated";
import {
  buildObservationRegistry,
  writeObservationRegistryArtifact,
} from "@/lib/selector-core/selector-observation-registry-builder";
import {
  OBSERVATION_EVENT_TYPES,
  type ObservationDocEntry,
  type ObservationDomain,
  type ObservationEventType,
  type ObservationRegistrySnapshot,
} from "@/lib/selector-core/selector-observation-types";

export type { ObservationDomain, ObservationEventType, ObservationDocEntry };
export type ObservationDocDomain =
  | "GC"
  | "Policy"
  | "Snapshot"
  | "Runtime"
  | "Explainability"
  | "Fallback"
  | "Build";
export { OBSERVATION_EVENT_TYPES };

let cached: ObservationRegistrySnapshot | null = null;

export function getObservationRegistry(): ObservationRegistrySnapshot {
  if (!cached) {
    cached = OBSERVATION_REGISTRY_SNAPSHOT;
  }
  return cached;
}

export function rebuildObservationRegistry(): ObservationRegistrySnapshot {
  cached = buildObservationRegistry();
  return cached;
}

export function refreshObservationRegistryArtifact(): ObservationRegistrySnapshot {
  cached = writeObservationRegistryArtifact();
  return cached;
}

export function __resetObservationRegistryForTests(snapshot?: ObservationRegistrySnapshot): void {
  cached = snapshot ?? OBSERVATION_REGISTRY_SNAPSHOT;
}

const SEMANTIC_DOMAIN_ALIASES: Record<ObservationDomain, Record<string, string>> = {
  runtime: {
    engine: "selector-decision-engine",
    snapshotLoader: "loadLatestSelectorSnapshot",
    determinism: "selector-determinism-gate",
    versionResolver: "selector-runtime-version-resolver",
    telemetryBridge: "selector-telemetry-bridge",
    engineConfig: "selector-engine-config",
  },
  policy: {
    ruleset: "selector-enforcement-ruleset",
    unifiedCheck: "runUnifiedPolicyCheck",
    convergence: "deriveConvergenceReport",
    canonicalArtifacts: "selector-system-canonical-artifacts",
    ciGate: "assertUnifiedPolicyCiGate",
    enforcer: "selector-api-usage-enforcer",
  },
  snapshot: {
    pointer: "lib/selector-core/generated/selector-active-pointer.json",
    bundleManifest: "lib/selector-core/generated/selector-bundle-manifest.json",
    registry: "lib/selector-core/generated/selector-snapshot-registry.generated.ts",
    rollbackRegistry: "lib/selector-core/generated/selector-rollback-registry.generated.ts",
    store: "selector-snapshot-registry",
    bundleSync: "selector-snapshot-bundle-sync",
    atomicSwitch: "selector-snapshot-atomic-switch",
  },
  explainability: {
    entry: "getExplanation",
    facade: "selector-explainability",
    router: "selector-causal-semantic-router",
    fallbackTrace: "selector-fallback-trace",
  },
  gc: {
    policy: "selector-snapshot-gc-policy",
    lifecycle: "selector-snapshot-lifecycle-manager",
    lineage: "selector-core-causal-model",
    pruner: "selector-snapshot-pruner",
  },
  build: {
    orchestrator: "selector-build-orchestrator",
    checkpoint: "selector-distributed-checkpoint-manager",
    consistency: "selector-bundle-registry-consistency-check",
    phaseOrder: "validate → build → sync → verify → unifiedPolicyCheck",
  },
  fallback: {
    trace: "selector-fallback-trace",
    safeFallback: "selector-safe-fallback",
    determinismGate: "selector-determinism-gate",
  },
};

const DOMAIN_TO_DOC_KEY: Record<ObservationDomain, string> = {
  gc: "GC",
  policy: "Policy",
  snapshot: "Snapshot",
  runtime: "Runtime",
  explainability: "Explainability",
  fallback: "Fallback",
  build: "Build",
};

function buildIndexView() {
  const registry = getObservationRegistry();
  const toRecord = (domain: ObservationDomain) => {
    const entry = registry.domains[domain];
    const record: Record<string, string> = { ...SEMANTIC_DOMAIN_ALIASES[domain] };
    for (const mod of entry.modules) {
      const key = mod.replace(/^selector-/, "").replace(/-/g, "_");
      if (!(key in record)) record[key] = mod;
    }
    return record;
  };

  return {
    runtime: toRecord("runtime"),
    policy: toRecord("policy"),
    snapshot: toRecord("snapshot"),
    explainability: toRecord("explainability"),
    gc: toRecord("gc"),
    build: toRecord("build"),
    fallback: toRecord("fallback"),
  } as const;
}

export const SelectorObservationIndex = buildIndexView();

export function resolveObservationDomainSlug(slug: string): ObservationDomain | null {
  const normalized = slug.trim().toLowerCase();
  const registry = getObservationRegistry();
  return registry.domainAliases[normalized] ?? null;
}

export function getSelectorObservationDocMap(): Record<string, ObservationDocEntry> {
  return getObservationRegistry().docMap;
}

export function resolveDocMapForDomain(domain: string): ObservationDocEntry {
  const registry = getObservationRegistry();
  const resolved = resolveObservationDomainSlug(domain);
  if (resolved) {
    return registry.docMap[DOMAIN_TO_DOC_KEY[resolved]] ?? { code: [], docs: [], tests: [] };
  }
  if (domain in registry.docMap) {
    return registry.docMap[domain]!;
  }
  return { code: [], docs: [], tests: [] };
}
