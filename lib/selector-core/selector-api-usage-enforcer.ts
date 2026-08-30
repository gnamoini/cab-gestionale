/**
 * @advisory v5.7 — static import-graph enforcement for cognitive cluster API freeze.
 * @advisory v5.8 — dual-mode enforcement (STRICT_CI / ADVISORY_DEV) + structured reports.
 * @advisory v6.0 — unified policy check (enforcement + convergence + canonical artifacts).
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildApiEnforcerReport,
  serializeEnforcerReport,
  type ApiEnforcerReport,
  type EnforcerMode,
  type ImportViolation,
} from "@/lib/selector-core/selector-api-enforcer-report";
import {
  COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS,
  computeRuntimeExportFingerprint,
  DEFAULT_ALLOWLIST_PREFIXES,
  DEFAULT_SCAN_ROOTS,
  deriveConvergenceReport,
  extractCognitiveClusterExports,
  extractRuntimeSnapshotDescriptor,
  FORBIDDEN_EXTERNAL_IMPORT_PATHS,
  getCanonicalEnforcementRuleset,
  isAllowedInternalLegacyImport,
  isAllowedLegacyImporter,
  isLegacyShimModule,
  normalizeModuleSegment,
  type PolicyRuntimeConvergenceResult,
} from "@/lib/selector-core/selector-enforcement-ruleset";
import {
  computeCanonicalArtifacts,
  type SelectorSystemCanonicalArtifacts,
} from "@/lib/selector-core/selector-system-canonical-artifacts";

export type { ApiEnforcerReport, EnforcerMode, ImportViolation } from "@/lib/selector-core/selector-api-enforcer-report";
export { serializeEnforcerReport } from "@/lib/selector-core/selector-api-enforcer-report";
export type { ConvergenceSeverity, PolicyRuntimeConvergenceResult } from "@/lib/selector-core/selector-enforcement-ruleset";
export { extractCognitiveClusterExports, computeRuntimeExportFingerprint };

const ROOT = process.cwd();

const IMPORT_FROM_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
const REQUIRE_RE = /require\s*\(\s*["']([^"']+)["']\s*\)/g;

export function resolveEnforcerMode(explicit?: EnforcerMode): EnforcerMode {
  if (explicit) return explicit;
  if (process.env.SELECTOR_ENFORCER_MODE === "STRICT_CI") return "STRICT_CI";
  if (process.env.CI === "true") return "STRICT_CI";
  return "ADVISORY_DEV";
}

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "generated") {
      continue;
    }
    const rel = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      walkSourceFiles(rel, acc);
    } else if (/\.(ts|tsx|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      acc.push(rel);
    }
  }
  return acc;
}

function isInternalScope(relPath: string, allowlist: readonly string[]): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  return allowlist.some((prefix) => normalized.startsWith(prefix));
}

function collectImportPaths(source: string): string[] {
  const paths: string[] = [];
  for (const re of [IMPORT_FROM_RE, REQUIRE_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      paths.push(match[1]!);
    }
  }
  return paths;
}

function resolveForbiddenSegment(importPath: string): string | null {
  const normalized = importPath.replace(/\\/g, "/");
  for (const forbidden of FORBIDDEN_EXTERNAL_IMPORT_PATHS) {
    if (
      normalized.includes(forbidden) ||
      normalized.endsWith(`/${forbidden}`) ||
      normalized.endsWith(`/${forbidden}.ts`)
    ) {
      return forbidden;
    }
  }
  return null;
}

function collectBarrelViolations(indexSource: string): string[] {
  const found: string[] = [];
  for (const forbidden of COGNITIVE_CLUSTER_BARREL_FORBIDDEN_EXPORTS) {
    const exportRe = new RegExp(`\\b${forbidden}\\b`);
    if (exportRe.test(indexSource)) {
      found.push(forbidden);
    }
  }
  return found;
}

export function scanAndClassifyImports(options?: {
  rootDirs?: readonly string[];
  allowlistPrefixes?: readonly string[];
}): Pick<
  ApiEnforcerReport,
  "violations" | "internalUsage" | "legacyShimUsage" | "safeBypassCandidates"
> {
  const rootDirs = options?.rootDirs ?? DEFAULT_SCAN_ROOTS;
  const allowlist = options?.allowlistPrefixes ?? DEFAULT_ALLOWLIST_PREFIXES;

  const violations: ImportViolation[] = [];
  const internalUsage: ImportViolation[] = [];
  const legacyShimUsage: ImportViolation[] = [];
  const safeBypassCandidates: ImportViolation[] = [];

  for (const root of rootDirs) {
    for (const relFile of walkSourceFiles(root)) {
      const source = fs.readFileSync(path.join(ROOT, relFile), "utf8");
      const isInternal = isInternalScope(relFile, allowlist);

      for (const importPath of collectImportPaths(source)) {
        const matched = resolveForbiddenSegment(importPath);
        if (!matched) continue;

        const entry: ImportViolation = { file: relFile, importPath, matchedForbidden: matched };
        const segment = normalizeModuleSegment(importPath);

        if (isInternal) {
          internalUsage.push(entry);
          continue;
        }

        if (isLegacyShimModule(segment) || isLegacyShimModule(matched)) {
          legacyShimUsage.push(entry);
          continue;
        }

        if (isAllowedInternalLegacyImport(segment) || isAllowedInternalLegacyImport(matched)) {
          if (isAllowedLegacyImporter(relFile)) {
            safeBypassCandidates.push(entry);
          } else {
            legacyShimUsage.push(entry);
          }
          continue;
        }

        violations.push(entry);
      }
    }
  }

  return { violations, internalUsage, legacyShimUsage, safeBypassCandidates };
}

export function scanForbiddenExternalImports(options?: {
  rootDirs?: readonly string[];
  allowlistPrefixes?: readonly string[];
}): ImportViolation[] {
  return scanAndClassifyImports(options).violations;
}

export function assertIndexBarrelRespectsFreeze(indexSource: string): void {
  const barrelViolations = collectBarrelViolations(indexSource);
  if (barrelViolations.length > 0) {
    throw new Error(
      `index.ts barrel violates v5.7 freeze: forbidden export "${barrelViolations[0]}"`,
    );
  }
}

export type UnifiedPolicyCheckResult = {
  mode: EnforcerMode;
  enforcementReport: ApiEnforcerReport;
  convergenceReport: PolicyRuntimeConvergenceResult;
  canonicalArtifacts: SelectorSystemCanonicalArtifacts;
  shouldFail: boolean;
};

function emitEnforcementAdvisory(
  mode: EnforcerMode,
  report: ApiEnforcerReport,
  barrelViolations: string[],
  violationCount: number,
): void {
  if (mode === "STRICT_CI") return;
  if (report.shouldFail || barrelViolations.length > 0 || violationCount > 0) {
    const detail = [
      ...barrelViolations.map((e) => `barrel: ${e}`),
      ...report.violations.slice(0, 10).map((v) => `${v.file} → ${v.importPath}`),
    ].join("\n");
    console.warn(
      `[selector-core v6.0] API enforcement advisory (${violationCount} violation(s), ${barrelViolations.length} barrel issue(s))${detail ? `:\n${detail}` : ""}`,
    );
  }
}

export function runUnifiedPolicyCheck(options?: {
  mode?: EnforcerMode;
  rootDirs?: readonly string[];
  allowlistPrefixes?: readonly string[];
  indexPath?: string;
  reportPath?: string;
}): UnifiedPolicyCheckResult {
  const mode = resolveEnforcerMode(options?.mode);
  const indexPath = options?.indexPath ?? "lib/selector-core/index.ts";
  const indexSource = fs.readFileSync(path.join(ROOT, indexPath), "utf8");
  const barrelViolations = collectBarrelViolations(indexSource);
  const classified = scanAndClassifyImports(options);

  const enforcementReport = buildApiEnforcerReport({
    mode,
    barrelViolations,
    ...classified,
  });

  if (options?.reportPath) {
    fs.writeFileSync(
      path.join(ROOT, options.reportPath),
      serializeEnforcerReport(enforcementReport),
      "utf8",
    );
  }

  emitEnforcementAdvisory(
    mode,
    enforcementReport,
    barrelViolations,
    classified.violations.length,
  );

  const ruleset = getCanonicalEnforcementRuleset();
  const descriptor = extractRuntimeSnapshotDescriptor(indexSource);
  const convergenceReport = deriveConvergenceReport(
    ruleset,
    descriptor,
    enforcementReport,
  );
  const canonicalArtifacts = computeCanonicalArtifacts({
    rulesetHash: convergenceReport.rulesetHash,
    runtimeExportFingerprint: convergenceReport.runtimeExportFingerprint,
    enforcementReport,
    convergenceReport,
  });
  const shouldFail =
    mode === "STRICT_CI" &&
    (enforcementReport.shouldFail || convergenceReport.severity === "HIGH");

  return {
    mode,
    enforcementReport,
    convergenceReport,
    canonicalArtifacts,
    shouldFail,
  };
}

/** @deprecated v6.0 — use runUnifiedPolicyCheck().enforcementReport */
export function runApiEnforcement(options?: {
  mode?: EnforcerMode;
  rootDirs?: readonly string[];
  allowlistPrefixes?: readonly string[];
  indexPath?: string;
  reportPath?: string;
}): ApiEnforcerReport {
  return runUnifiedPolicyCheck(options).enforcementReport;
}

export function runPolicyRuntimeConvergenceCheck(options?: {
  indexPath?: string;
  indexSource?: string;
  enforcerReport?: ApiEnforcerReport;
}): PolicyRuntimeConvergenceResult {
  const indexSource =
    options?.indexSource ??
    fs.readFileSync(
      path.join(ROOT, options?.indexPath ?? "lib/selector-core/index.ts"),
      "utf8",
    );
  const ruleset = getCanonicalEnforcementRuleset();
  const descriptor = extractRuntimeSnapshotDescriptor(indexSource);
  const enforcementReport = options?.enforcerReport ?? {
    mode: "STRICT_CI" as const,
    violations: [],
    internalUsage: [],
    legacyShimUsage: [],
    safeBypassCandidates: [],
    barrelViolations: [],
    shouldFail: false,
    generatedAt: new Date(0).toISOString(),
  };

  return deriveConvergenceReport(ruleset, descriptor, enforcementReport);
}

export function shouldFailConvergenceGate(result: PolicyRuntimeConvergenceResult): boolean {
  return result.severity === "HIGH";
}

export function assertUnifiedPolicyCiGate(options?: {
  mode?: EnforcerMode;
  indexPath?: string;
}): UnifiedPolicyCheckResult {
  const result = runUnifiedPolicyCheck({
    mode: options?.mode ?? "STRICT_CI",
    indexPath: options?.indexPath,
  });

  if (result.shouldFail) {
    throw new Error(
      `Unified policy CI gate failed (severity=${result.convergenceReport.severity}): ${result.convergenceReport.driftPoints.join("; ")}`,
    );
  }

  return result;
}

export function assertCognitiveClusterApiBoundary(options?: {
  rootDirs?: readonly string[];
  allowlistPrefixes?: readonly string[];
  indexPath?: string;
}): void {
  const result = runUnifiedPolicyCheck({ ...options, mode: "STRICT_CI" });
  if (result.shouldFail) {
    const report = result.enforcementReport;
    const detail = [
      ...report.barrelViolations.map((e) => `forbidden barrel export: ${e}`),
      ...report.violations
        .slice(0, 10)
        .map((v) => `${v.file} → ${v.importPath} (${v.matchedForbidden})`),
      ...result.convergenceReport.driftPoints.map((p) => `convergence: ${p}`),
    ].join("\n");
    throw new Error(`Cognitive cluster API boundary violated:\n${detail}`);
  }
}
