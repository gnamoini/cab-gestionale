/**
 * @advisory v5.7 — frozen public API boundary for cognitive/explainability cluster.
 * @advisory v6.0 — VIEW over selector-enforcement-ruleset; not a separate rule entity.
 */
import {
  ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API,
  COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS,
  COGNITIVE_CLUSTER_V56_PUBLIC_EXPORTS,
  computeRulesetHash,
  FORBIDDEN_EXTERNAL_IMPORT_PATHS,
  LEGACY_SHIM_MODULES,
  RULESET_VERSION,
} from "@/lib/selector-core/selector-enforcement-ruleset";

export {
  ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API,
  COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS,
  COGNITIVE_CLUSTER_V56_PUBLIC_EXPORTS,
  FORBIDDEN_EXTERNAL_IMPORT_PATHS,
  LEGACY_SHIM_MODULES,
  RULESET_VERSION,
};

export type AllowedCognitiveClusterPublicApi =
  (typeof ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API)[number];

export function getRulesetHash(): string {
  return computeRulesetHash();
}

const warnedShimModules = new Set<string>();
const shimOccurrenceCounts = new Map<string, number>();

export type ShimWarningSeverity = "info" | "warning" | "ci_warning" | "fail";

function normalizeShimModuleId(moduleId: string): string {
  return moduleId.replace(/\\/g, "/").split("/").pop()?.replace(/\.ts$/, "") ?? moduleId;
}

export function getLegacyShimOccurrenceCount(moduleId: string): number {
  const normalized = normalizeShimModuleId(moduleId);
  return shimOccurrenceCounts.get(normalized) ?? 0;
}

function getLegacyShimSeverityFromCount(count: number): ShimWarningSeverity {
  if (count <= 0) return "info";
  if (count <= 3) return "warning";
  if (count <= 10) return "ci_warning";
  return "fail";
}

export function getLegacyShimSeverity(moduleId: string): ShimWarningSeverity {
  return getLegacyShimSeverityFromCount(getLegacyShimOccurrenceCount(moduleId));
}

export function getMaxLegacyShimSeverity(): ShimWarningSeverity {
  let max: ShimWarningSeverity = "info";
  const rank: Record<ShimWarningSeverity, number> = {
    info: 0,
    warning: 1,
    ci_warning: 2,
    fail: 3,
  };
  for (const count of shimOccurrenceCounts.values()) {
    const severity = getLegacyShimSeverityFromCount(count);
    if (rank[severity] > rank[max]) max = severity;
  }
  return max;
}

export function __resetLegacyShimCountsForTests(): void {
  warnedShimModules.clear();
  shimOccurrenceCounts.clear();
}

/** DEV-only warning when a legacy v5.5 shim is imported directly (severity scales with occurrences). */
export function warnLegacyShimImport(moduleId: string): void {
  const normalized = normalizeShimModuleId(moduleId);
  const nextCount = (shimOccurrenceCounts.get(normalized) ?? 0) + 1;
  shimOccurrenceCounts.set(normalized, nextCount);

  if (process.env.NODE_ENV !== "development") return;
  if (warnedShimModules.has(normalized) && nextCount <= 3) return;
  warnedShimModules.add(normalized);

  const severity = getLegacyShimSeverity(normalized);
  const prefix = `[selector-core v6.0] LEGACY SHIM "${normalized}" (${severity}, count=${nextCount})`;
  console.warn(
    `${prefix} is not part of the public contract. ` +
      "Migrate to getExplanation(traceId, intent) or internal selector-core paths.",
  );
}
