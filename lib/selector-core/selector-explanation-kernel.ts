/**
 * @advisory v6.3 — explanation kernel (SSOT for navigation, impact, explanation hints).
 */
import {
  getObservationRegistry,
  resolveDocMapForDomain,
  resolveObservationDomainSlug,
  SelectorObservationIndex,
} from "@/lib/selector-core/selector-observation-registry";
import {
  flattenRankedHints,
  rankObservationHints,
} from "@/lib/selector-core/selector-observation-ranking-engine";
import type { ObservationEventType } from "@/lib/selector-core/selector-observation-types";

export type ExplanationResult = {
  primaryPath: string[];
  relatedModules: string[];
  recommendedFiles: string[];
  explanationHint: string;
};

export type NavigationPathResult = {
  steps: string[];
  modules: string[];
  fileHints: string[];
};

export type ImpactAnalysisResult = {
  upstream: string[];
  downstream: string[];
  riskZones: string[];
};

const EVENT_DOMAIN: Record<ObservationEventType, string> = {
  gc: "gc",
  policy: "policy",
  snapshot: "snapshot",
  fallback: "fallback",
  decision: "runtime",
};

const EVENT_HINTS: Record<ObservationEventType, string> = {
  gc: "Start from GC plan in validatePhase, then lifecycle classification and pointer consistency.",
  policy:
    "Inspect runUnifiedPolicyCheck output: enforcementReport, convergenceReport, canonicalArtifacts.",
  snapshot: "Trace syncPhase bundled versions against pointer and bundle manifest schemaHashes.",
  fallback: "Follow traceFallbackResolution and pre-resolution guard before engine decision.",
  decision:
    "Decision path: loader resolves snapshot → engine evaluates → telemetry bridge records outcome.",
};

const RISK_ZONE_FILES = new Set([
  "lib/selector-core/selector-determinism-gate.ts",
  "lib/selector-core/selector-fallback-trace.ts",
  "lib/selector-core/selector-enforcement-boundary-guard.ts",
  "lib/selector-core/selector-api-usage-enforcer.ts",
  "lib/selector-core/index.ts",
]);

function normalizeTargetFile(target: string): string | null {
  const registry = getObservationRegistry();
  const normalized = target.trim().toLowerCase().replace(/\.ts$/, "");
  const candidates = Object.keys(registry.importGraph);
  for (const file of candidates) {
    const slug = file.split("/").pop()?.replace(/\.ts$/, "") ?? "";
    if (slug === normalized || slug === `selector-${normalized}` || slug.replace(/^selector-/, "") === normalized) {
      return file;
    }
  }
  const withPrefix = `lib/selector-core/selector-${normalized.replace(/^selector-/, "")}.ts`;
  if (registry.importGraph[withPrefix]) return withPrefix;
  return null;
}

function stepToEventType(step: string): ObservationEventType | null {
  const registry = getObservationRegistry();
  const alias = registry.domainAliases[step.toLowerCase()];
  const map: Record<string, ObservationEventType> = {
    gc: "gc",
    policy: "policy",
    snapshot: "snapshot",
    fallback: "fallback",
    runtime: "decision",
    explainability: "decision",
  };
  if (alias && map[alias]) return map[alias]!;
  return map[step.toLowerCase()] ?? null;
}

export function resolveExplanation(input: {
  type?: ObservationEventType;
  traceId?: string;
  query?: string;
}): ExplanationResult {
  const type = input.type ?? "decision";
  const domain = EVENT_DOMAIN[type];
  const docEntry = resolveDocMapForDomain(domain);
  const index = SelectorObservationIndex[domain as keyof typeof SelectorObservationIndex];
  const relatedModules = index ? Object.values(index).slice(0, 6) : [];

  let explanationHint = EVENT_HINTS[type];
  if (input.traceId) {
    explanationHint += ` TraceId "${input.traceId}": use getExplanation(traceId, intent?) in dev for causal envelope.`;
  }
  if (input.query) {
    explanationHint += ` Query context: ${input.query}.`;
  }

  const ranked = rankObservationHints({
    files: docEntry.code,
    tests: docEntry.tests,
    docs: docEntry.docs,
  });
  const recommendedFiles = flattenRankedHints(ranked, "important").slice(0, 8);

  return {
    primaryPath: [`${domain}.entry`, `${domain}.modules`],
    relatedModules,
    recommendedFiles,
    explanationHint,
  };
}

export function resolveNavigationPath(steps: string[]): NavigationPathResult {
  const modules: string[] = [];
  const fileHints: string[] = [];

  for (const step of steps) {
    const eventType = stepToEventType(step);
    if (eventType) {
      const explanation = resolveExplanation({ type: eventType });
      modules.push(...explanation.relatedModules);
      fileHints.push(...explanation.recommendedFiles);
      continue;
    }
    const domain = resolveObservationDomainSlug(step);
    if (domain) {
      const entry = resolveDocMapForDomain(domain);
      modules.push(...entry.code.map((p) => p.split("/").pop() ?? p));
      fileHints.push(...entry.code);
    }
  }

  return {
    steps,
    modules: [...new Set(modules)],
    fileHints: [...new Set(fileHints)],
  };
}

export function resolveImpactAnalysis(target: string): ImpactAnalysisResult {
  const file = normalizeTargetFile(target);
  if (!file) {
    return { upstream: [], downstream: [], riskZones: [] };
  }
  const registry = getObservationRegistry();
  const entry = registry.importGraph[file];
  if (!entry) {
    return { upstream: [], downstream: [], riskZones: [] };
  }

  const upstream = [...entry.importedBy];
  const downstream = [...entry.imports];
  const connected = new Set([...upstream, ...downstream, file]);
  for (const node of [...connected]) {
    const neighbor = registry.importGraph[node];
    if (!neighbor) continue;
    for (const n of [...neighbor.imports, ...neighbor.importedBy]) {
      connected.add(n);
    }
  }
  const riskZones = [...connected].filter((f) => RISK_ZONE_FILES.has(f));

  return {
    upstream: [...new Set(upstream)].sort(),
    downstream: [...new Set(downstream)].sort(),
    riskZones: [...new Set(riskZones)].sort(),
  };
}

export function resolveModuleLookup(module: string): {
  primaryFiles: string[];
  relatedTests: string[];
  relatedDocs: string[];
} {
  const domain = resolveObservationDomainSlug(module);
  const entry = resolveDocMapForDomain(domain ?? module);
  return {
    primaryFiles: entry.code,
    relatedTests: entry.tests,
    relatedDocs: entry.docs,
  };
}

export type TraceObservationInput = {
  type: ObservationEventType;
  traceId?: string;
};

export type TraceObservationResult = {
  primaryPath: string[];
  relatedModules: string[];
  recommendedFiles: string[];
  explanationHint: string;
};

export function traceObservation(event: TraceObservationInput): TraceObservationResult {
  const result = resolveExplanation({ type: event.type, traceId: event.traceId });
  return {
    primaryPath: result.primaryPath,
    relatedModules: result.relatedModules,
    recommendedFiles: result.recommendedFiles,
    explanationHint: result.explanationHint,
  };
}
