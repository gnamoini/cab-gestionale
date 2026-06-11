/**
 * @advisory v5.8 — hard separation between policy enforcement and runtime execution.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const RUNTIME_SOURCE_FILES = [
  "lib/selector-core/selector-config-runtime-loader.ts",
  "lib/selector-core/selector-decision-engine.ts",
  "lib/selector-core/selector-engine-config.ts",
  "lib/selector-core/selector-telemetry-bridge.ts",
  "lib/selector-core/selector-fallback-trace.ts",
  "lib/selector-core/selector-explainability.ts",
  "components/gestionale/global-input/global-select.tsx",
] as const;

const ENFORCER_SOURCE_FILES = [
  "lib/selector-core/selector-api-usage-enforcer.ts",
  "lib/selector-core/selector-api-enforcer-report.ts",
] as const;

const RUNTIME_FORBIDDEN_IMPORTS = [
  "selector-api-usage-enforcer",
  "selector-api-enforcer-report",
  "selector-enforcement-boundary-guard",
  "selector-enforcement-ruleset",
  "selector-system-canonical-artifacts",
  "selector-debug-dsl-engine",
  "selector-debug-observation",
  "selector-observation-registry-builder",
  "selector-observation-registry",
  "selector-observation-types",
  "selector-explanation-kernel",
  "selector-debug-dsl-registry",
  "selector-observation-ranking-engine",
  "selector-architecture-time-machine",
] as const;

const LOADER_EXTRA_FORBIDDEN = ["selector-build-orchestrator"] as const;

const ENFORCER_FORBIDDEN_IMPORTS = [
  "selector-config-runtime-loader",
  "selector-decision-engine",
] as const;

function readSource(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function findForbiddenImports(
  source: string,
  forbidden: readonly string[],
): string[] {
  const hits: string[] = [];
  for (const pattern of forbidden) {
    if (source.includes(pattern)) hits.push(pattern);
  }
  return hits;
}

export function assertEnforcementRuntimeSeparation(): void {
  for (const rel of RUNTIME_SOURCE_FILES) {
    const source = readSource(rel);
    const forbidden =
      rel === "lib/selector-core/selector-config-runtime-loader.ts"
        ? [...RUNTIME_FORBIDDEN_IMPORTS, ...LOADER_EXTRA_FORBIDDEN]
        : RUNTIME_FORBIDDEN_IMPORTS;
    const hits = findForbiddenImports(source, forbidden);
    if (hits.length > 0) {
      throw new Error(
        `Runtime source "${rel}" must not import policy modules: ${hits.join(", ")}`,
      );
    }
  }

  for (const rel of ENFORCER_SOURCE_FILES) {
    const source = readSource(rel);
    const hits = findForbiddenImports(source, ENFORCER_FORBIDDEN_IMPORTS);
    if (hits.length > 0) {
      throw new Error(
        `Enforcer source "${rel}" must not import runtime loader/engine: ${hits.join(", ")}`,
      );
    }
  }
}
