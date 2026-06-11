/**
 * @advisory v5.9 — single source of truth for all enforcement rule definitions.
 * @advisory v6.0 — convergence derivation lives here (no separate drift logic).
 */
import crypto from "node:crypto";
import type { ApiEnforcerReport } from "@/lib/selector-core/selector-api-enforcer-report";

export const RULESET_VERSION = "v6.0";

export const ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API = [
  "loadLatestSelectorSnapshot",
  "resolveSelectorEngineConfig",
  "getExplanation",
] as const;

export const COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS = [
  "buildUnifiedSelectorCausalModel",
  "queryCausalModel",
  "serializeCausalModel",
  "hashCausalModel",
  "isGcReachableInCausalModel",
  "createEmptyCausalModel",
  "buildGcLineageInput",
  "isLineageReachableFromActive",
  "wasSnapshotValidAtInCausalModel",
  "getDecisionView",
  "getFallbackView",
  "getGcView",
  "getTemporalView",
  "getFullCausalView",
  "getCausalModel",
  "getCausalView",
  "routeCausalExplanation",
  "routeExistingCausalModel",
  "countRoutedEvents",
  "getUserExplanationBundle",
  "getDebugExplanationBundle",
  "getAuditExplanationBundle",
  "getSystemExplanationBundle",
  "measureCognitiveSurface",
] as const;

export const FORBIDDEN_EXTERNAL_IMPORT_PATHS = [
  "selector-causal-semantic-router",
  "selector-causal-model-interface",
  "selector-core-causal-model",
  "selector-cognitive-surface-metrics",
] as const;

export const LEGACY_SHIM_MODULES = [] as const;

export const ALLOWED_INTERNAL_LEGACY = [
  "selector-causal-semantic-router",
  "selector-fallback-trace",
] as const;

export const ALLOWED_LEGACY_IMPORTER_PREFIXES = [
  "scripts/selector-",
  "lib/selector-core/",
  "lib/regression/",
] as const;

export const DEFAULT_SCAN_ROOTS = [
  "components",
  "lib",
  "scripts",
  "app",
  "src",
] as const;

export const DEFAULT_ALLOWLIST_PREFIXES = [
  "lib/selector-core/",
  "lib/regression/",
] as const;

export type SelectorEnforcementRuleset = {
  version: string;
  allowedCognitiveClusterPublicApi: readonly string[];
  cognitiveClusterBarrelForbiddenExports: readonly string[];
  cognitiveClusterV56PublicExports: readonly string[];
  forbiddenExternalImportPaths: readonly string[];
  legacyShimModules: readonly string[];
  allowedInternalLegacy: readonly string[];
  allowedLegacyImporterPrefixes: readonly string[];
  defaultScanRoots: readonly string[];
  defaultAllowlistPrefixes: readonly string[];
};

export type ConvergenceSeverity = "LOW" | "MEDIUM" | "HIGH";

export type RuntimeSnapshotDescriptor = {
  indexSource: string;
  runtimeExportFingerprint: string;
  cognitiveClusterExports: string[];
};

export type PolicyRuntimeConvergenceResult = {
  isConverged: boolean;
  driftPoints: string[];
  severity: ConvergenceSeverity;
  rulesetHash: string;
  runtimeExportFingerprint: string;
};

export function normalizeModuleSegment(importPath: string): string {
  const normalized = importPath.replace(/\\/g, "/");
  const segment = normalized.split("/").pop() ?? normalized;
  return segment.replace(/\.tsx?$/, "");
}

export function isAllowedInternalLegacyImport(moduleSegment: string): boolean {
  const normalized = normalizeModuleSegment(moduleSegment);
  return (ALLOWED_INTERNAL_LEGACY as readonly string[]).includes(normalized);
}

export function isLegacyShimModule(moduleSegment: string): boolean {
  const normalized = normalizeModuleSegment(moduleSegment);
  return (LEGACY_SHIM_MODULES as readonly string[]).includes(normalized);
}

export function isAllowedLegacyImporter(relFilePath: string): boolean {
  const normalized = relFilePath.replace(/\\/g, "/");
  return ALLOWED_LEGACY_IMPORTER_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function collectBarrelExportSymbols(indexSource: string): string[] {
  const symbols = new Set<string>();
  const exportBlockRe = /export\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = exportBlockRe.exec(indexSource)) !== null) {
    const block = match[1]!;
    for (const part of block.split(",")) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith("type ")) continue;
      const aliasMatch = trimmed.match(/\bas\s+(\w+)\s*$/);
      const name = aliasMatch
        ? aliasMatch[1]!
        : trimmed.replace(/^type\s+/, "").split(/\s+/).pop() ?? trimmed;
      if (/^\w+$/.test(name)) symbols.add(name);
    }
  }
  return [...symbols];
}

export function extractCognitiveClusterExports(indexSource: string): string[] {
  const allExports = collectBarrelExportSymbols(indexSource);
  const clusterSet = new Set<string>([
    ...ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API,
    ...COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS,
  ]);
  return allExports.filter((symbol) => clusterSet.has(symbol));
}

export function computeRuntimeExportFingerprint(indexSource: string): string {
  const exports = extractCognitiveClusterExports(indexSource).sort();
  return crypto.createHash("sha256").update(JSON.stringify(exports)).digest("hex");
}

export function extractRuntimeSnapshotDescriptor(indexSource: string): RuntimeSnapshotDescriptor {
  const cognitiveClusterExports = extractCognitiveClusterExports(indexSource);
  return {
    indexSource,
    runtimeExportFingerprint: computeRuntimeExportFingerprint(indexSource),
    cognitiveClusterExports,
  };
}

function maxSeverity(current: ConvergenceSeverity, next: ConvergenceSeverity): ConvergenceSeverity {
  const rank: Record<ConvergenceSeverity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  return rank[next] > rank[current] ? next : current;
}

export function deriveConvergenceReport(
  ruleset: SelectorEnforcementRuleset,
  descriptor: RuntimeSnapshotDescriptor,
  enforcementReport: ApiEnforcerReport,
): PolicyRuntimeConvergenceResult {
  const rulesetHash = computeRulesetHash(ruleset);
  const driftPoints: string[] = [];
  let severity: ConvergenceSeverity = "LOW";

  for (const forbidden of ruleset.cognitiveClusterBarrelForbiddenExports) {
    if (descriptor.cognitiveClusterExports.includes(forbidden)) {
      driftPoints.push(`barrel exports forbidden symbol: ${forbidden}`);
      severity = "HIGH";
    }
  }

  for (const required of ruleset.allowedCognitiveClusterPublicApi) {
    if (!descriptor.cognitiveClusterExports.includes(required)) {
      driftPoints.push(`barrel missing required public API: ${required}`);
      severity = "HIGH";
    }
  }

  if (enforcementReport.shouldFail) {
    driftPoints.push("enforcer report shouldFail in STRICT mode");
    severity = "HIGH";
  }

  const legacyOutsideRegression = enforcementReport.legacyShimUsage.filter(
    (v) => !v.file.replace(/\\/g, "/").startsWith("lib/regression/"),
  );
  if (legacyOutsideRegression.length > 0 && severity !== "HIGH") {
    driftPoints.push(
      `legacy shim usage outside regression (${legacyOutsideRegression.length} import(s))`,
    );
    severity = maxSeverity(severity, "MEDIUM");
  }

  if (
    driftPoints.length === 0 &&
    enforcementReport.internalUsage.length > 0
  ) {
    severity = "LOW";
  }

  return {
    isConverged: severity !== "HIGH" && driftPoints.length === 0,
    driftPoints,
    severity,
    rulesetHash,
    runtimeExportFingerprint: descriptor.runtimeExportFingerprint,
  };
}

export function getCanonicalEnforcementRuleset(): SelectorEnforcementRuleset {
  return {
    version: RULESET_VERSION,
    allowedCognitiveClusterPublicApi: [...ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API],
    cognitiveClusterBarrelForbiddenExports: [...COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS],
    cognitiveClusterV56PublicExports: [
      ...COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS,
      ...ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API,
    ],
    forbiddenExternalImportPaths: [...FORBIDDEN_EXTERNAL_IMPORT_PATHS],
    legacyShimModules: [...LEGACY_SHIM_MODULES],
    allowedInternalLegacy: [...ALLOWED_INTERNAL_LEGACY],
    allowedLegacyImporterPrefixes: [...ALLOWED_LEGACY_IMPORTER_PREFIXES],
    defaultScanRoots: [...DEFAULT_SCAN_ROOTS],
    defaultAllowlistPrefixes: [...DEFAULT_ALLOWLIST_PREFIXES],
  };
}

function sortStringArray(values: readonly string[]): string[] {
  return [...values].sort();
}

export function computeRulesetHash(ruleset?: SelectorEnforcementRuleset): string {
  const canonical = ruleset ?? getCanonicalEnforcementRuleset();
  const payload = {
    version: canonical.version,
    allowedCognitiveClusterPublicApi: sortStringArray(canonical.allowedCognitiveClusterPublicApi),
    cognitiveClusterBarrelForbiddenExports: sortStringArray(
      canonical.cognitiveClusterBarrelForbiddenExports,
    ),
    cognitiveClusterV56PublicExports: sortStringArray(canonical.cognitiveClusterV56PublicExports),
    forbiddenExternalImportPaths: sortStringArray(canonical.forbiddenExternalImportPaths),
    legacyShimModules: sortStringArray(canonical.legacyShimModules),
    allowedInternalLegacy: sortStringArray(canonical.allowedInternalLegacy),
    allowedLegacyImporterPrefixes: sortStringArray(canonical.allowedLegacyImporterPrefixes),
    defaultScanRoots: sortStringArray(canonical.defaultScanRoots),
    defaultAllowlistPrefixes: sortStringArray(canonical.defaultAllowlistPrefixes),
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** @deprecated v5.9 — use getCanonicalEnforcementRuleset().cognitiveClusterV56PublicExports */
export const COGNITIVE_CLUSTER_V56_PUBLIC_EXPORTS = [
  ...COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS,
  ...ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API,
] as const;
