#!/usr/bin/env npx tsx
/**
 * Selector System Final Hardening — import graph, dead code, runtime surface, barrel drift.
 * Outputs to lib/selector-core/generated/
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SELECTOR_CORE = "lib/selector-core";
const GENERATED_DIR = path.join(ROOT, SELECTOR_CORE, "generated");

const IMPORT_FROM_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
const REQUIRE_RE = /require\s*\(\s*["']([^"']+)["']\s*\)/g;

const REMOVED_SHIM_SEGMENTS = new Set([
  "selector-api-safe-legacy-registry",
  "selector-config-factory",
  "selector-decision-engine-config",
  "selector-rollout-config",
  "selector-explainability-observation-adapter",
  "selector-policy-runtime-convergence-check",
  "selector-convergence-ci-gate",
  "selector-observation-index",
  "selector-observation-doc-map",
  "selector-observation-trace-navigator",
  "selector-debug-dsl",
  "selector-unified-causal-index",
  "selector-causal-decision-graph",
  "selector-temporal-lineage-graph",
  "selector-explainability-facade",
  "selector-fallback-explainability-engine",
  "selector-pre-resolution-guard",
  "selector-determinism-integrity-check",
  "selector-system-complexity-audit",
]);

const HOT_PATH_ROOTS = [
  "lib/selector-core/selector-decision-engine.ts",
  "lib/selector-core/selector-config-runtime-loader.ts",
  "lib/selector-core/selector-fallback-trace.ts",
  "lib/selector-core/selector-engine-config.ts",
  "lib/selector-core/selector-explainability.ts",
  "lib/selector-core/selector-telemetry-bridge.ts",
  "components/gestionale/global-input/global-select.tsx",
];

const KNOWN_ADVISORY_CYCLES: string[][] = [
  [
    "lib/selector-core/selector-runtime-sanity-guard.ts",
    "lib/selector-core/selector-runtime-snapshot-revalidator.ts",
    "lib/selector-core/selector-runtime-sanity-guard.ts",
  ],
  [
    "lib/selector-core/selector-snapshot-lifecycle-manager.ts",
    "lib/selector-core/selector-snapshot-pruner.ts",
    "lib/selector-core/selector-snapshot-lifecycle-manager.ts",
  ],
  [
    "lib/selector-core/selector-snapshot-bundle-sync.ts",
    "lib/selector-core/selector-snapshot-registry.ts",
    "lib/selector-core/selector-snapshot-bundle-sync.ts",
  ],
  [
    "lib/selector-core/selector-api-enforcer-report.ts",
    "lib/selector-core/selector-api-surface-registry.ts",
    "lib/selector-core/selector-enforcement-ruleset.ts",
    "lib/selector-core/selector-api-enforcer-report.ts",
  ],
];

const RUNTIME_SYMBOLS: Record<
  string,
  { canonicalFile: string; forbiddenShimImports?: string[] }
> = {
  SelectorDecisionEngine: {
    canonicalFile: "lib/selector-core/selector-decision-engine.ts",
    forbiddenShimImports: ["selector-fallback-explainability-engine"],
  },
  loadLatestSelectorSnapshot: {
    canonicalFile: "lib/selector-core/selector-config-runtime-loader.ts",
  },
  resolveSelectorEngineConfig: {
    canonicalFile: "lib/selector-core/selector-config-runtime-loader.ts",
  },
  getExplanation: {
    canonicalFile: "lib/selector-core/selector-explainability.ts",
    forbiddenShimImports: ["selector-explanation-kernel"],
  },
};

const DO_NOT_TOUCH = [
  "lib/selector-core/selector-decision-engine.ts",
  "lib/selector-core/selector-config-runtime-loader.ts",
  "lib/selector-core/selector-explainability.ts",
  "lib/selector-core/selector-enforcement-ruleset.ts",
  "lib/selector-core/selector-build-orchestrator.ts",
  "lib/selector-core/selector-adaptive-analyzer.ts",
  "lib/selector-core/selector-ab-simulator.ts",
  "lib/selector-core/selector-insight-promotion-engine.ts",
];

type GraphNode = {
  file: string;
  imports: string[];
  importedBy: string[];
  brokenImports: { importPath: string; reason: string }[];
};

type DeadCodeEntry = {
  file: string;
  symbol: string;
  kind: "function" | "const" | "type" | "class";
  confidence: number;
  reason: string;
  onHotPath: boolean;
  smokeCovered: boolean;
};

function walkSelectorCoreSourceFiles(): string[] {
  const acc: string[] = [];
  const abs = path.join(ROOT, SELECTOR_CORE);
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "generated" || entry.name === "node_modules") continue;
    const rel = path.join(SELECTOR_CORE, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) continue;
    if (!entry.name.endsWith(".ts")) continue;
    if (entry.name.endsWith(".test.ts")) continue;
    acc.push(rel);
  }
  return acc.sort();
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

function resolveSelectorCorePath(importPath: string): string | null {
  const normalized = importPath.replace(/\\/g, "/");
  if (normalized.startsWith("@/lib/selector-core/")) {
    const rest = normalized.slice("@/lib/selector-core/".length);
    if (rest.endsWith(".json")) {
      return `lib/selector-core/${rest}`;
    }
    const base = rest.replace(/\.tsx?$/, "");
    const candidate = `lib/selector-core/${base}.ts`;
    if (fs.existsSync(path.join(ROOT, candidate))) return candidate;
    const withPrefix = base.startsWith("selector-")
      ? candidate
      : `lib/selector-core/selector-${base}.ts`;
    if (fs.existsSync(path.join(ROOT, withPrefix))) return withPrefix;
    return candidate;
  }
  if (normalized.includes("selector-core/")) {
    const idx = normalized.indexOf("selector-core/");
    const rest = normalized.slice(idx + "selector-core/".length);
    const candidate = `lib/selector-core/${rest.replace(/\.tsx?$/, "")}.ts`;
    return candidate;
  }
  return null;
}

function parseSmokeSelectorTests(): string[] {
  const source = fs.readFileSync(
    path.join(ROOT, "lib/regression/smoke-regression-lists.ts"),
    "utf8",
  );
  const tests = new Set<string>();
  const re = /["'](lib\/(?:regression|selector-core)\/selector-[^"']+\.test\.ts)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    tests.add(match[1]!);
  }
  return [...tests].sort();
}

function walkRepoScanRoots(): string[] {
  const roots = ["components", "lib", "scripts", "app"];
  const files: string[] = [];
  function walk(dir: string): void {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "generated") {
        continue;
      }
      const rel = path.join(dir, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        walk(rel);
      } else if (/\.(ts|tsx|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        files.push(rel);
      }
    }
  }
  for (const root of roots) walk(root);
  return files;
}

function buildImportGraph(files: string[]): Record<string, GraphNode> {
  const graph: Record<string, GraphNode> = {};
  for (const file of files) {
    graph[file] = { file, imports: [], importedBy: [], brokenImports: [] };
  }

  for (const file of files) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    const importPaths = collectImportPaths(source);
    const seen = new Set<string>();

    for (const importPath of importPaths) {
      const segment = importPath.split("/").pop()?.replace(/\.tsx?$/, "") ?? "";
      if (REMOVED_SHIM_SEGMENTS.has(segment)) {
        graph[file]!.brokenImports.push({
          importPath,
          reason: "references_removed_shim",
        });
      }

      const resolved = resolveSelectorCorePath(importPath);
      if (!resolved) continue;
      if (resolved.endsWith(".json")) {
        if (!fs.existsSync(path.join(ROOT, resolved))) {
          graph[file]!.brokenImports.push({
            importPath,
            reason: "missing_json_artifact",
          });
        }
        continue;
      }
      if (!graph[resolved]) {
        if (fs.existsSync(path.join(ROOT, resolved))) {
          graph[resolved] = { file: resolved, imports: [], importedBy: [], brokenImports: [] };
        } else {
          graph[file]!.brokenImports.push({
            importPath,
            reason: "unresolved_selector_core_path",
          });
          continue;
        }
      }
      if (!seen.has(resolved)) {
        seen.add(resolved);
        graph[file]!.imports.push(resolved);
        graph[resolved]!.importedBy.push(file);
      }
    }
  }

  return graph;
}

function cycleKey(cycle: string[]): string {
  return [...cycle].sort().join("|");
}

function cycleTouchesHotPath(cycle: string[]): boolean {
  return cycle.some((f) => HOT_PATH_ROOTS.includes(f));
}

function isKnownAdvisoryCycle(cycle: string[]): boolean {
  const key = cycleKey(cycle);
  return KNOWN_ADVISORY_CYCLES.some((known) => cycleKey(known) === key);
}

function findCycles(graph: Record<string, GraphNode>): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      if (idx >= 0) cycles.push(stack.slice(idx).concat(node));
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const dep of graph[node]?.imports ?? []) {
      if (graph[dep]) dfs(dep);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of Object.keys(graph)) dfs(node);
  return cycles;
}

function bfsReachableFrom(roots: string[], graph: Record<string, GraphNode>): Set<string> {
  const reached = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (reached.has(node)) continue;
    reached.add(node);
    for (const dep of graph[node]?.imports ?? []) {
      if (!reached.has(dep)) queue.push(dep);
    }
  }
  return reached;
}

function extractExports(source: string): { symbol: string; kind: DeadCodeEntry["kind"] }[] {
  const exports: { symbol: string; kind: DeadCodeEntry["kind"] }[] = [];
  const fnRe = /export\s+(?:async\s+)?function\s+(\w+)/g;
  const constRe = /export\s+const\s+(\w+)/g;
  const typeRe = /export\s+type\s+(\w+)/g;
  const classRe = /export\s+class\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(source)) !== null) exports.push({ symbol: m[1]!, kind: "function" });
  while ((m = constRe.exec(source)) !== null) exports.push({ symbol: m[1]!, kind: "const" });
  while ((m = typeRe.exec(source)) !== null) exports.push({ symbol: m[1]!, kind: "type" });
  while ((m = classRe.exec(source)) !== null) exports.push({ symbol: m[1]!, kind: "class" });
  return exports;
}

function countSymbolRefs(symbol: string, repoFiles: string[], excludeFile: string): number {
  const re = new RegExp(`\\b${symbol}\\b`, "g");
  let count = 0;
  for (const file of repoFiles) {
    if (file === excludeFile) continue;
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    const matches = source.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

function buildDeadCodeReport(
  files: string[],
  graph: Record<string, GraphNode>,
  hotReachable: Set<string>,
  smokeTests: string[],
  repoFiles: string[],
): DeadCodeEntry[] {
  const smokeSources = smokeTests.map((t) => fs.readFileSync(path.join(ROOT, t), "utf8"));
  const entries: DeadCodeEntry[] = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    const onHotPath = hotReachable.has(file);
    const smokeCovered = smokeSources.some((s) => s.includes(path.basename(file, ".ts")));

    for (const { symbol, kind } of extractExports(source)) {
      if (symbol.startsWith("__")) continue;
      const refs = countSymbolRefs(symbol, repoFiles, file);
      const indexSource = fs.readFileSync(path.join(ROOT, "lib/selector-core/index.ts"), "utf8");
      const inBarrelOnly =
        refs === 0 && new RegExp(`\\b${symbol}\\b`).test(indexSource) && !onHotPath;

      let confidence = 0;
      let reason = "referenced";
      if (onHotPath || smokeCovered) {
        confidence = Math.min(40, refs > 0 ? 30 : 20);
        reason = onHotPath ? "hot_path_reachable" : "smoke_test_covered";
      } else if (refs === 0 && !inBarrelOnly) {
        confidence = 95;
        reason = "zero_repo_references";
      } else if (refs === 0 && inBarrelOnly) {
        confidence = 88;
        reason = "barrel_only_export";
      } else if (refs <= 2) {
        confidence = 72;
        reason = "script_or_test_only";
      } else {
        confidence = 45;
        reason = "low_usage";
      }

      if (confidence >= 60) {
        entries.push({
          file,
          symbol,
          kind,
          confidence,
          reason,
          onHotPath,
          smokeCovered,
        });
      }
    }
  }

  return entries.sort((a, b) => b.confidence - a.confidence);
}

function parseBarrelExports(indexSource: string): { symbol: string; sourceModule: string }[] {
  const exports: { symbol: string; sourceModule: string }[] = [];
  const blockRe =
    /export\s*\{([^}]+)\}\s*from\s*["']@\/lib\/selector-core\/([^"']+)["']/g;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(indexSource)) !== null) {
    const sourceModule = block[2]!;
    const inner = block[1]!;
    for (const part of inner.split(",")) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith("/**") || trimmed.startsWith("*")) continue;
      const aliasMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
      const sym = aliasMatch ? aliasMatch[2]! : trimmed.replace(/^type\s+/, "").split(/\s/)[0]!;
      if (sym && /^[A-Za-z_]/.test(sym)) {
        exports.push({ symbol: sym, sourceModule });
      }
    }
  }
  return exports;
}

function buildRuntimeSurfaceAudit(repoFiles: string[]): Record<string, unknown> {
  const surfaces: Record<string, unknown> = {};

  for (const [symbol, spec] of Object.entries(RUNTIME_SYMBOLS)) {
    const allImportPaths: string[] = [];
    const directRe = new RegExp(`\\b${symbol}\\b`);

    for (const file of repoFiles) {
      const source = fs.readFileSync(path.join(ROOT, file), "utf8");
      if (directRe.test(source) && file.includes("selector-core")) {
        if (source.includes(symbol)) allImportPaths.push(file);
      }
    }

    const canonicalSource = fs.readFileSync(path.join(ROOT, spec.canonicalFile), "utf8");
    const definesSymbol = new RegExp(`export\\s+(?:const|function|type)?\\s*${symbol}\\b|export\\s*\\{[^}]*\\b${symbol}\\b`).test(
      canonicalSource,
    );

    const aliasChains: string[] = [];
    if (symbol === "SelectorDecisionEngine") {
      const surface = fs.readFileSync(
        path.join(ROOT, "lib/selector-core/resolve-selector-surface.ts"),
        "utf8",
      );
      if (surface.includes("SelectorDecisionEngine.resolve")) {
        aliasChains.push("resolve-selector-surface.ts → SelectorDecisionEngine.resolve");
      }
    }
    if (symbol === "getExplanation") {
      const explain = canonicalSource;
      if (explain.includes("getSelectorExplanation")) {
        aliasChains.push("getSelectorExplanation (deprecated alias in explainability.ts)");
      }
    }

    const duplicateFallbackPaths: string[] = [];
    if (symbol === "SelectorDecisionEngine") {
      if (canonicalSource.includes("selector-fallback-explainability-engine")) {
        duplicateFallbackPaths.push("selector-fallback-explainability-engine");
      }
    }

    const forbiddenHits = (spec.forbiddenShimImports ?? []).filter((shim) =>
      canonicalSource.includes(shim),
    );

    const globalSelect = fs.readFileSync(
      path.join(ROOT, "components/gestionale/global-input/global-select.tsx"),
      "utf8",
    );
    const uiUsesCanonical =
      symbol !== "SelectorDecisionEngine" ||
      globalSelect.includes("selector-decision-engine");

    surfaces[symbol] = {
      canonicalPath: spec.canonicalFile,
      definesSymbol,
      allImportPaths: [...new Set(allImportPaths)].sort(),
      aliasChains,
      duplicateFallbackPaths,
      forbiddenShimImports: forbiddenHits,
      stable:
        definesSymbol &&
        forbiddenHits.length === 0 &&
        duplicateFallbackPaths.length === 0 &&
        (symbol !== "SelectorDecisionEngine" || uiUsesCanonical),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    surfaces,
    allStable: Object.values(surfaces).every((s) => (s as { stable: boolean }).stable),
  };
}

function buildBarrelDriftReport(repoFiles: string[]): Record<string, unknown> {
  const indexSource = fs.readFileSync(path.join(ROOT, "lib/selector-core/index.ts"), "utf8");
  const barrelExports = parseBarrelExports(indexSource);
  const indexConsumers = repoFiles.filter((f) => {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8");
    return /from\s+["']@\/lib\/selector-core\/index["']/.test(s);
  });

  const used: string[] = [];
  const unused: string[] = [];
  const risky: string[] = [];

  const moduleImportRe = (mod: string) =>
    new RegExp(`from\\s+["']@/lib/selector-core/${mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);

  for (const { symbol, sourceModule } of barrelExports) {
    let symbolRefs = 0;
    let moduleImported = false;
    let stringOnlyRefs = 0;
    const modRe = moduleImportRe(sourceModule);

    for (const file of repoFiles) {
      if (file === "lib/selector-core/index.ts") continue;
      const source = fs.readFileSync(path.join(ROOT, file), "utf8");
      if (modRe.test(source)) moduleImported = true;
      if (!new RegExp(`\\b${symbol}\\b`).test(source)) continue;
      if (modRe.test(source)) symbolRefs++;
      else stringOnlyRefs++;
    }

    if (symbolRefs > 0 || moduleImported) used.push(symbol);
    else if (stringOnlyRefs > 0) risky.push(symbol);
    else unused.push(symbol);
  }

  const total = barrelExports.length;
  const unusedPercent = total > 0 ? (unused.length / total) * 100 : 0;

  return {
    generatedAt: new Date().toISOString(),
    barrelExportCount: total,
    indexConsumerCount: indexConsumers.length,
    indexConsumers,
    used,
    unused,
    risky,
    unusedPercent: Math.round(unusedPercent * 100) / 100,
    unusedPercentPass: unusedPercent < 5,
  };
}

function collectSafeActions(
  graph: Record<string, GraphNode>,
  barrel: Record<string, unknown>,
  indexSource: string,
): string[] {
  const actions: string[] = [];
  const dupes = (indexSource.match(/assertSingleActiveSnapshot/g) ?? []).length;
  if (dupes > 1) {
    actions.push("Remove duplicate assertSingleActiveSnapshot export in index.ts");
  }
  const immutDupes = (indexSource.match(/assertSnapshotImmutability/g) ?? []).length;
  if (immutDupes > 1) {
    actions.push("Remove duplicate assertSnapshotImmutability export in index.ts");
  }

  const allBroken = Object.values(graph).flatMap((n) =>
    n.brokenImports.map((b) => `${n.file}: ${b.importPath} (${b.reason})`),
  );
  if (allBroken.length > 0) {
    actions.push(`Fix ${allBroken.length} broken import(s) — see import-graph report`);
  }

  if (!(barrel.unusedPercentPass as boolean)) {
    actions.push(
      `Barrel has ${barrel.unusedPercent}% UNUSED exports — trim advisory-only blocks when safe`,
    );
  }

  actions.push("Run: npx tsx scripts/selector-rebuild-observation-registry.ts");
  return actions;
}

function buildSummaryMd(input: {
  importGraph: Record<string, unknown>;
  runtime: Record<string, unknown>;
  barrel: Record<string, unknown>;
  deadCode: DeadCodeEntry[];
  safeActions: string[];
}): string {
  const ig = input.importGraph;
  const broken = (ig.brokenImportCount as number) ?? 0;
  const hotPathCycles = (ig.hotPathCycles as string[][]) ?? [];
  const unknownCycles = (ig.unknownCycles as string[][]) ?? [];
  const runtimeOk = input.runtime.allStable as boolean;
  const barrelOk = input.barrel.unusedPercentPass as boolean;

  const gates = [
    { name: "Import graph (zero broken)", pass: broken === 0 },
    { name: "Hot-path circular dependencies", pass: hotPathCycles.length === 0 },
    { name: "Unknown advisory cycles", pass: unknownCycles.length === 0 },
    { name: "Runtime surface stable", pass: runtimeOk },
    { name: "Barrel drift < 5% UNUSED", pass: barrelOk },
  ];

  const deadTop = input.deadCode.slice(0, 15);

  return `# Selector Hardening Audit Summary

Generated: ${new Date().toISOString()}

## Executive Status

| Gate | Status |
|------|--------|
${gates.map((g) => `| ${g.name} | ${g.pass ? "PASS" : "FAIL"} |`).join("\n")}

**Overall:** ${gates.every((g) => g.pass) ? "PASS" : "FAIL"}

## Metrics

- Broken imports: ${broken}
- Import cycles (total): ${(ig.cycleCount as number) ?? 0}
- Hot-path cycles: ${hotPathCycles.length}
- Unknown advisory cycles: ${unknownCycles.length}
- Barrel exports: ${input.barrel.barrelExportCount}
- Barrel UNUSED: ${(input.barrel.unused as string[]).length} (${input.barrel.unusedPercent}%)
- Barrel USED: ${(input.barrel.used as string[]).length}
- Barrel RISKY: ${(input.barrel.risky as string[]).length}
- Dead code candidates (confidence >= 60): ${input.deadCode.length}

## SAFE ACTIONS

${input.safeActions.map((a) => `- ${a}`).join("\n")}

## DO NOT TOUCH

${DO_NOT_TOUCH.map((f) => `- \`${f}\` — runtime/build contract or offline script dependency`).join("\n")}

## Dead Code Candidates (report only — do not auto-delete)

| Confidence | Symbol | File | Reason |
|------------|--------|------|--------|
${deadTop.map((d) => `| ${d.confidence} | ${d.symbol} | ${d.file} | ${d.reason} |`).join("\n")}

## Runtime Surface

${Object.entries(input.runtime.surfaces as Record<string, { stable: boolean; canonicalPath: string }>)
  .map(([sym, s]) => `- **${sym}**: ${s.stable ? "stable" : "UNSTABLE"} @ \`${s.canonicalPath}\``)
  .join("\n")}
`;
}

function main(): void {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const files = walkSelectorCoreSourceFiles();
  const repoFiles = walkRepoScanRoots();
  const smokeTests = parseSmokeSelectorTests();
  const graph = buildImportGraph(files);
  const cycles = findCycles(graph);
  const hotPathCycles = cycles.filter((c) => cycleTouchesHotPath(c));
  const advisoryCycles = cycles.filter((c) => !cycleTouchesHotPath(c));
  const unknownCycles = advisoryCycles.filter((c) => !isKnownAdvisoryCycle(c));
  const hotReachable = bfsReachableFrom(HOT_PATH_ROOTS, graph);

  const allBroken: { file: string; importPath: string; reason: string }[] = [];
  for (const node of Object.values(graph)) {
    for (const b of node.brokenImports) {
      allBroken.push({ file: node.file, ...b });
    }
  }

  const orphanModules = files.filter((f) => {
    const n = graph[f];
    if (!n) return false;
    return n.importedBy.length === 0 && n.imports.length === 0 && !hotReachable.has(f);
  });

  const importGraphReport = {
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    nodes: Object.fromEntries(
      Object.entries(graph).map(([k, v]) => [
        k,
        { imports: v.imports, importedBy: v.importedBy, brokenImports: v.brokenImports },
      ]),
    ),
    brokenImports: allBroken,
    brokenImportCount: allBroken.length,
    cycles,
    cycleCount: cycles.length,
    hotPathCycles,
    hotPathCycleCount: hotPathCycles.length,
    advisoryCycles,
    unknownCycles,
    orphanModules,
    hotPathReachable: [...hotReachable].sort(),
    deadCode: [] as DeadCodeEntry[],
  };

  const deadCode = buildDeadCodeReport(files, graph, hotReachable, smokeTests, repoFiles);
  importGraphReport.deadCode = deadCode;

  const runtimeReport = buildRuntimeSurfaceAudit(repoFiles);
  const barrelReport = buildBarrelDriftReport(repoFiles);
  const indexSource = fs.readFileSync(path.join(ROOT, "lib/selector-core/index.ts"), "utf8");
  const safeActions = collectSafeActions(graph, barrelReport, indexSource);
  const summaryMd = buildSummaryMd({
    importGraph: importGraphReport,
    runtime: runtimeReport,
    barrel: barrelReport,
    deadCode,
    safeActions,
  });

  fs.writeFileSync(
    path.join(GENERATED_DIR, "selector-import-graph-report.json"),
    JSON.stringify(importGraphReport, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(GENERATED_DIR, "selector-runtime-surface-audit.json"),
    JSON.stringify(runtimeReport, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(GENERATED_DIR, "selector-barrel-drift-report.json"),
    JSON.stringify(barrelReport, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(GENERATED_DIR, "selector-hardening-audit-summary.md"),
    summaryMd,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        brokenImports: allBroken.length,
        cycles: cycles.length,
        hotPathCycles: hotPathCycles.length,
        unknownCycles: unknownCycles.length,
        runtimeStable: runtimeReport.allStable,
        barrelUnusedPercent: barrelReport.unusedPercent,
        deadCodeCandidates: deadCode.length,
        outputs: [
          "lib/selector-core/generated/selector-import-graph-report.json",
          "lib/selector-core/generated/selector-runtime-surface-audit.json",
          "lib/selector-core/generated/selector-barrel-drift-report.json",
          "lib/selector-core/generated/selector-hardening-audit-summary.md",
        ],
      },
      null,
      2,
    ),
  );
}

main();
