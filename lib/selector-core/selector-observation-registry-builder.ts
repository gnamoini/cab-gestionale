/**
 * @advisory v6.3 — self-healing observation registry builder (Node/fs only).
 */
import fs from "node:fs";
import path from "node:path";
import {
  OBSERVATION_DOMAINS,
  OBSERVATION_EVENT_TYPES,
  type ObservationDomain,
  type ObservationRegistrySnapshot,
} from "@/lib/selector-core/selector-observation-types";

const ROOT = process.cwd();
const SELECTOR_CORE = "lib/selector-core";

const IMPORT_FROM_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
const REQUIRE_RE = /require\s*\(\s*["']([^"']+)["']\s*\)/g;

const RUNTIME_MODULE_HINTS = new Set([
  "selector-decision-engine",
  "selector-config-runtime-loader",
  "selector-engine-config",
  "selector-telemetry-bridge",
  "selector-determinism-gate",
  "selector-runtime-version-resolver",
  "selector-fallback-trace",
  "selector-safe-fallback",
]);

const DOMAIN_DOC_KEYS: Record<ObservationDomain, string> = {
  gc: "GC",
  policy: "Policy",
  snapshot: "Snapshot",
  runtime: "Runtime",
  explainability: "Explainability",
  fallback: "Fallback",
  build: "Build",
};

const BASE_DOMAIN_ALIASES: Record<string, ObservationDomain> = {
  gc: "gc",
  policy: "policy",
  convergence: "policy",
  ruleset: "policy",
  snapshot: "snapshot",
  snapshots: "snapshot",
  runtime: "runtime",
  decision: "runtime",
  engine: "runtime",
  explainability: "explainability",
  explain: "explainability",
  fallback: "fallback",
  build: "build",
  orchestrator: "build",
};

function walkSelectorCoreFiles(acc: string[] = []): string[] {
  const abs = path.join(ROOT, SELECTOR_CORE);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "generated" || entry.name === "node_modules") continue;
    const rel = path.join(SELECTOR_CORE, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      for (const sub of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
        if (!sub.isFile()) continue;
        if (!/^selector-.*\.ts$/.test(sub.name)) continue;
        if (sub.name.endsWith(".test.ts")) continue;
        acc.push(path.join(rel, sub.name).replace(/\\/g, "/"));
      }
    } else if (/^selector-.*\.ts$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      acc.push(rel);
    }
  }
  return acc.sort();
}

function moduleSlugFromPath(relPath: string): string {
  return path.basename(relPath, ".ts");
}

function classifyDomain(relPath: string): ObservationDomain {
  const base = moduleSlugFromPath(relPath).toLowerCase();
  if (base.includes("-gc-") || base.endsWith("-gc-policy")) return "gc";
  if (
    base.includes("-enforcement-") ||
    base.includes("-policy-") ||
    base.includes("-convergence-") ||
    base.includes("-enforcer")
  ) {
    return "policy";
  }
  if (base.includes("-snapshot-") || base.includes("-pointer-") || base.includes("-bundle-")) {
    return "snapshot";
  }
  if (base.includes("-explainability") || base.includes("-causal-")) return "explainability";
  if (base.includes("-fallback-")) return "fallback";
  if (
    base.includes("-build-") ||
    base.includes("-checkpoint-") ||
    base.includes("-orchestrator")
  ) {
    return "build";
  }
  if (RUNTIME_MODULE_HINTS.has(moduleSlugFromPath(relPath))) return "runtime";
  if (base.includes("-observation-") || base.includes("-debug-")) return "build";
  return "runtime";
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

function resolveSelectorCoreImport(importPath: string): string | null {
  const normalized = importPath.replace(/\\/g, "/");
  if (!normalized.includes("selector-core") && !normalized.startsWith("@/lib/selector-core")) {
    return null;
  }
  const segment = normalized.split("/").pop()?.replace(/\.tsx?$/, "") ?? "";
  if (!segment.startsWith("selector-")) return null;
  return `lib/selector-core/${segment}.ts`;
}

function parseSmokeRegressionLists(): string[] {
  const source = fs.readFileSync(
    path.join(ROOT, "lib/regression/smoke-regression-lists.ts"),
    "utf8",
  );
  const tests = new Set<string>();
  const re = /["'](lib\/regression\/selector-[^"']+\.test\.ts)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    tests.add(match[1]!);
  }
  for (const rel of fs.readdirSync(path.join(ROOT, "lib/regression"))) {
    if (/^selector-.*\.test\.ts$/.test(rel)) {
      tests.add(`lib/regression/${rel}`);
    }
  }
  return [...tests].sort();
}

function discoverDocs(): { path: string; keywords: string[] }[] {
  const docs: { path: string; keywords: string[] }[] = [];
  const candidates = [
    "docs/selector-post-change-validation.md",
    "docs/selector-usage-baseline.md",
    "docs/selector-adaptive-insights.json",
    "docs/selector/snapshots/manifest.json",
    "docs/selector/snapshots/v0.json",
  ];
  for (const rel of candidates) {
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    const lower = rel.toLowerCase();
    const keywords: string[] = [];
    if (lower.includes("policy") || lower.includes("validation")) keywords.push("policy");
    if (lower.includes("snapshot")) keywords.push("snapshot");
    if (lower.includes("usage") || lower.includes("baseline")) {
      keywords.push("runtime", "explainability");
    }
    if (keywords.length === 0) keywords.push("snapshot", "build");
    docs.push({ path: rel, keywords });
  }
  return docs;
}

function attachTestsToDocMap(
  docMap: Record<string, { code: string[]; docs: string[]; tests: string[] }>,
  smokeTests: string[],
): void {
  const domainKeywords: Record<string, string[]> = {
    GC: ["gc", "v533", "v534", "lifecycle", "pruner"],
    Policy: ["policy", "v58", "v59", "v60", "enforcement", "convergence"],
    Snapshot: ["snapshot", "v531", "v532", "v533", "bundle", "pointer"],
    Runtime: ["adaptive-audit", "v57", "decision-engine", "v534"],
    Explainability: ["v56", "v57", "explainability", "semantic"],
    Fallback: ["fallback", "v534", "safe-fallback"],
    Build: ["v533", "orchestrator", "observability", "v60", "v62", "v63"],
  };

  for (const [key, keywords] of Object.entries(domainKeywords)) {
    const matched = smokeTests.filter((t) =>
      keywords.some((kw) => t.toLowerCase().includes(kw.toLowerCase())),
    );
    docMap[key]!.tests = [...new Set([...docMap[key]!.tests, ...matched])].sort();
  }
}

export function buildObservationRegistry(): ObservationRegistrySnapshot {
  const files = walkSelectorCoreFiles();
  const domains = Object.fromEntries(
    OBSERVATION_DOMAINS.map((d) => [d, { modules: [] as string[], files: [] as string[] }]),
  ) as ObservationRegistrySnapshot["domains"];

  const importGraph: ObservationRegistrySnapshot["importGraph"] = {};
  for (const rel of files) {
    const slug = moduleSlugFromPath(rel);
    importGraph[rel] = { imports: [], importedBy: [] };
    const domain = classifyDomain(rel);
    domains[domain].files.push(rel);
    domains[domain].modules.push(slug);

    const source = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const importPath of collectImportPaths(source)) {
      const resolved = resolveSelectorCoreImport(importPath);
      if (!resolved || resolved === rel) continue;
      importGraph[rel]!.imports.push(resolved);
      if (!importGraph[resolved]) {
        importGraph[resolved] = { imports: [], importedBy: [] };
      }
      importGraph[resolved]!.importedBy.push(rel);
    }
  }

  for (const entry of Object.values(importGraph)) {
    entry.imports = [...new Set(entry.imports)].sort();
    entry.importedBy = [...new Set(entry.importedBy)].sort();
  }

  for (const domain of OBSERVATION_DOMAINS) {
    domains[domain].modules = [...new Set(domains[domain].modules)].sort();
    domains[domain].files = [...new Set(domains[domain].files)].sort();
  }

  const docMap: ObservationRegistrySnapshot["docMap"] = {};
  for (const domain of OBSERVATION_DOMAINS) {
    const key = DOMAIN_DOC_KEYS[domain];
    docMap[key] = {
      code: [...domains[domain].files],
      docs: [],
      tests: [],
    };
  }

  for (const doc of discoverDocs()) {
    for (const kw of doc.keywords) {
      const domain = BASE_DOMAIN_ALIASES[kw];
      if (!domain) continue;
      const key = DOMAIN_DOC_KEYS[domain];
      docMap[key]!.docs.push(doc.path);
    }
  }
  for (const entry of Object.values(docMap)) {
    entry.docs = [...new Set(entry.docs)].sort();
  }

  const smokeTests = parseSmokeRegressionLists();
  attachTestsToDocMap(docMap, smokeTests);

  const generatedArtifacts = [
    "lib/selector-core/generated/selector-active-pointer.json",
    "lib/selector-core/generated/selector-bundle-manifest.json",
    "lib/selector-core/generated/selector-snapshot-registry.generated.ts",
    "lib/selector-core/generated/selector-rollback-registry.generated.ts",
  ];
  for (const artifact of generatedArtifacts) {
    if (fs.existsSync(path.join(ROOT, artifact))) {
      docMap.Snapshot!.code.push(artifact);
    }
  }
  docMap.Snapshot!.code = [...new Set(docMap.Snapshot!.code)].sort();

  return {
    builtAt: new Date().toISOString(),
    domains,
    docMap,
    importGraph,
    domainAliases: { ...BASE_DOMAIN_ALIASES },
    eventTypes: [...OBSERVATION_EVENT_TYPES],
    smokeTests,
  };
}

export function serializeObservationRegistry(snapshot: ObservationRegistrySnapshot): string {
  return `/** @generated v6.3 — self-healing observation registry; do not edit manually */\nimport type { ObservationRegistrySnapshot } from "@/lib/selector-core/selector-observation-types";\n\nexport const OBSERVATION_REGISTRY_SNAPSHOT: ObservationRegistrySnapshot = ${JSON.stringify(snapshot, null, 2)};\n`;
}

export function writeObservationRegistryArtifact(
  outputPath = "lib/selector-core/generated/selector-observation-registry.generated.ts",
): ObservationRegistrySnapshot {
  const snapshot = buildObservationRegistry();
  const abs = path.join(ROOT, outputPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, serializeObservationRegistry(snapshot), "utf8");
  return snapshot;
}
