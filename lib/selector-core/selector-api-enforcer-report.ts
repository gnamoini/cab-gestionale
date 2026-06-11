/**
 * @advisory v5.8 — structured enforcement report (policy layer only).
 */
import { getMaxLegacyShimSeverity } from "@/lib/selector-core/selector-api-surface-registry";

export type EnforcerMode = "STRICT_CI" | "ADVISORY_DEV";

export type ImportViolation = {
  file: string;
  importPath: string;
  matchedForbidden: string;
};

export type ApiEnforcerReport = {
  mode: EnforcerMode;
  violations: ImportViolation[];
  internalUsage: ImportViolation[];
  legacyShimUsage: ImportViolation[];
  safeBypassCandidates: ImportViolation[];
  barrelViolations: string[];
  shouldFail: boolean;
  generatedAt: string;
};

export type BuildApiEnforcerReportInput = {
  mode: EnforcerMode;
  violations: ImportViolation[];
  internalUsage: ImportViolation[];
  legacyShimUsage: ImportViolation[];
  safeBypassCandidates: ImportViolation[];
  barrelViolations: string[];
};

export function buildApiEnforcerReport(input: BuildApiEnforcerReportInput): ApiEnforcerReport {
  const shimSeverityExceeded = getMaxLegacyShimSeverity() === "fail";
  const shouldFail =
    input.mode === "STRICT_CI" &&
    (input.barrelViolations.length > 0 ||
      input.violations.length > 0 ||
      shimSeverityExceeded);

  return {
    mode: input.mode,
    violations: input.violations,
    internalUsage: input.internalUsage,
    legacyShimUsage: input.legacyShimUsage,
    safeBypassCandidates: input.safeBypassCandidates,
    barrelViolations: input.barrelViolations,
    shouldFail,
    generatedAt: new Date().toISOString(),
  };
}

export function serializeEnforcerReport(report: ApiEnforcerReport): string {
  return JSON.stringify(report, null, 2);
}
