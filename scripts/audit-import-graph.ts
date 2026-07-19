#!/usr/bin/env npx tsx
/**
 * Repo-wide import graph + runtime edges for dead-code audit.
 * Output: artifacts/audit/dependency-graph/{before|after}.graph.json
 *
 * Usage:
 *   npx tsx scripts/audit-import-graph.ts [--out before|after] [--diff]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "audit", "dependency-graph");

const IMPORT_FROM_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
const RPC_RE = /\.rpc\s*\(\s*["']([^"']+)["']/g;

const SCAN_DIRS = ["app", "components", "lib", "src", "hooks", "context", "types", "scripts"];
const ENTRY_SUFFIXES = ["/page.tsx", "/route.ts", "/layout.tsx", "/loading.tsx", "/error.tsx"];

export type RuntimeEdgeType =
  | "STATIC_IMPORT"
  | "DYNAMIC_IMPORT"
  | "REGISTRY_REFERENCE"
  | "DB_REFERENCE"
  | "FLAG_REFERENCE"
  | "CRON_REFERENCE";

export type GraphNode = {
  id: string;
  imports: string[];
  importedBy: string[];
  consumerCount: number;
  isEntryPoint: boolean;
};

export type RuntimeEdge = {
  from: string;
  to: string;
  type: RuntimeEdgeType;
  key?: string;
};

export type ImportGraph = {
  generatedAt: string;
  nodes: GraphNode[];
  runtimeEdges: RuntimeEdge[];
  summary: {
    totalNodes: number;
    orphanNodes: number;
    maxDepth: number;
    entryPoints: number;
    runtimeEdgeCount: number;
    runtimeEdgeByType: Record<RuntimeEdgeType, number>;
  };
};

function posix(p: string): string {
  return p.split(path.sep).join("/");
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsFiles(full, out);
    else if (/\.(tsx?|mts)$/.test(ent.name)) out.push(full);
  }
  return out;
}

function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith("@/")) return null;
  const rel = spec.slice(2);
  const candidates = [
    path.join(ROOT, rel),
    path.join(ROOT, rel + ".ts"),
    path.join(ROOT, rel + ".tsx"),
    path.join(ROOT, rel, "index.ts"),
    path.join(ROOT, rel, "index.tsx"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return posix(path.relative(ROOT, c));
  }
  return null;
}

function isEntryPoint(id: string): boolean {
  return ENTRY_SUFFIXES.some((s) => id.endsWith(s)) || id === "proxy.ts";
}

function scanRegistryEdges(file: string, content: string, edges: RuntimeEdge[]): void {
  const id = posix(path.relative(ROOT, file));
  if (id.includes("dashboard-widget-registry")) {
    const re = /["']([a-z0-9-]+)["']\s*:\s*\(\)\s*=>\s*import\(["']([^"']+)["']\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      const to = resolveImport(file, m[2]!);
      if (to) edges.push({ from: id, to, type: "REGISTRY_REFERENCE", key: m[1] });
    }
  }
  if (id.includes("report-sections-config") || id.includes("report-section-loaders")) {
    const re = /import\(["']([^"']+)["']\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      const to = resolveImport(file, m[1]!);
      if (to) edges.push({ from: id, to, type: "REGISTRY_REFERENCE" });
    }
  }
  if (id.includes("import-export-registry") || id.includes("import-api-router")) {
    const re = /getImportPluginBySlug|entityIdFromRouteSlug/g;
    if (re.test(content)) {
      edges.push({ from: id, to: "app/api/import/[entity]", type: "REGISTRY_REFERENCE", key: "entity-slug" });
    }
  }
  if (id.includes("pdf-artifact-registry")) {
    edges.push({ from: id, to: "app/api/pdf/artifacts/[type]/route.ts", type: "REGISTRY_REFERENCE", key: "pdf-type" });
  }
}

function scanFlagEdges(file: string, content: string, edges: RuntimeEdge[]): void {
  if (!file.includes("-flag.ts") && !file.includes("notifications-v2-flag") && !file.includes("notifications-ssot")) return;
  const id = posix(path.relative(ROOT, file));
  const branchRe = /from\s+["'](@\/[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = branchRe.exec(content))) {
    const to = resolveImport(file, m[1]!);
    if (to) edges.push({ from: id, to, type: "FLAG_REFERENCE" });
  }
}

function scanCronEdges(): RuntimeEdge[] {
  const edges: RuntimeEdge[] = [];
  const vercelPath = path.join(ROOT, "vercel.json");
  if (fs.existsSync(vercelPath)) {
    const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8")) as {
      crons?: { path: string }[];
    };
    for (const cron of vercel.crons ?? []) {
      const route = cron.path.replace(/^\//, "app/api/") + "/route.ts";
      edges.push({ from: "vercel.json", to: route, type: "CRON_REFERENCE" });
    }
  }
  const migDir = path.join(ROOT, "supabase", "migrations");
  if (fs.existsSync(migDir)) {
    for (const f of fs.readdirSync(migDir)) {
      if (!f.endsWith(".sql")) continue;
      const sql = fs.readFileSync(path.join(migDir, f), "utf8");
      const invokeRe = /\/api\/cron\/([a-z0-9-]+)/g;
      let m: RegExpExecArray | null;
      while ((m = invokeRe.exec(sql))) {
        edges.push({
          from: `supabase/migrations/${f}`,
          to: `app/api/cron/${m[1]}/route.ts`,
          type: "CRON_REFERENCE",
        });
      }
    }
  }
  return edges;
}

function computeMaxDepth(nodes: Map<string, GraphNode>, entryIds: string[]): number {
  const memo = new Map<string, number>();
  function depth(id: string, seen: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const node = nodes.get(id);
    if (!node || node.imports.length === 0) {
      memo.set(id, 1);
      return 1;
    }
    let max = 1;
    for (const imp of node.imports) {
      max = Math.max(max, 1 + depth(imp, seen));
    }
    seen.delete(id);
    memo.set(id, max);
    return max;
  }
  let globalMax = 0;
  for (const e of entryIds) globalMax = Math.max(globalMax, depth(e, new Set()));
  return globalMax;
}

export function buildImportGraph(): ImportGraph {
  const files: string[] = [];
  for (const d of SCAN_DIRS) walkTsFiles(path.join(ROOT, d), files);

  const nodeMap = new Map<string, GraphNode>();
  const runtimeEdges: RuntimeEdge[] = [...scanCronEdges()];

  for (const file of files) {
    const id = posix(path.relative(ROOT, file));
    const content = fs.readFileSync(file, "utf8");
    const imports = new Set<string>();

    let m: RegExpExecArray | null;
    IMPORT_FROM_RE.lastIndex = 0;
    while ((m = IMPORT_FROM_RE.exec(content))) {
      const resolved = resolveImport(file, m[1]!);
      if (resolved) {
        imports.add(resolved);
        runtimeEdges.push({ from: id, to: resolved, type: "STATIC_IMPORT" });
      }
    }
    DYNAMIC_IMPORT_RE.lastIndex = 0;
    while ((m = DYNAMIC_IMPORT_RE.exec(content))) {
      const resolved = resolveImport(file, m[1]!);
      if (resolved) {
        imports.add(resolved);
        runtimeEdges.push({ from: id, to: resolved, type: "DYNAMIC_IMPORT" });
      }
    }
    RPC_RE.lastIndex = 0;
    while ((m = RPC_RE.exec(content))) {
      runtimeEdges.push({ from: id, to: `rpc:${m[1]}`, type: "DB_REFERENCE", key: m[1] });
    }

    scanRegistryEdges(file, content, runtimeEdges);
    scanFlagEdges(file, content, runtimeEdges);

    nodeMap.set(id, {
      id,
      imports: [...imports],
      importedBy: [],
      consumerCount: 0,
      isEntryPoint: isEntryPoint(id),
    });
  }

  for (const node of nodeMap.values()) {
    for (const imp of node.imports) {
      const target = nodeMap.get(imp);
      if (target) target.importedBy.push(node.id);
    }
  }
  for (const node of nodeMap.values()) {
    node.consumerCount = node.importedBy.length;
  }

  const nodes = [...nodeMap.values()];
  const entryIds = nodes.filter((n) => n.isEntryPoint).map((n) => n.id);
  const orphanNodes = nodes.filter((n) => n.consumerCount === 0 && !n.isEntryPoint).length;

  const runtimeEdgeByType = {
    STATIC_IMPORT: 0,
    DYNAMIC_IMPORT: 0,
    REGISTRY_REFERENCE: 0,
    DB_REFERENCE: 0,
    FLAG_REFERENCE: 0,
    CRON_REFERENCE: 0,
  } satisfies Record<RuntimeEdgeType, number>;
  for (const e of runtimeEdges) runtimeEdgeByType[e.type]++;

  return {
    generatedAt: new Date().toISOString(),
    nodes,
    runtimeEdges,
    summary: {
      totalNodes: nodes.length,
      orphanNodes,
      maxDepth: computeMaxDepth(nodeMap, entryIds),
      entryPoints: entryIds.length,
      runtimeEdgeCount: runtimeEdges.length,
      runtimeEdgeByType,
    },
  };
}

function diffGraphs(before: ImportGraph, after: ImportGraph): void {
  const beforeIds = new Set(before.nodes.map((n) => n.id));
  const afterIds = new Set(after.nodes.map((n) => n.id));
  const removed = [...beforeIds].filter((id) => !afterIds.has(id));
  const added = [...afterIds].filter((id) => !beforeIds.has(id));
  console.log("Graph diff:");
  console.log(`  nodes removed: ${removed.length}`);
  console.log(`  nodes added: ${added.length}`);
  console.log(`  orphanNodes: ${before.summary.orphanNodes} → ${after.summary.orphanNodes}`);
  console.log(`  maxDepth: ${before.summary.maxDepth} → ${after.summary.maxDepth}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const outLabel = args.includes("--out")
    ? args[args.indexOf("--out") + 1] ?? "before"
    : "before";
  const diff = args.includes("--diff");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const graph = buildImportGraph();
  const outFile = path.join(OUT_DIR, `${outLabel}.graph.json`);
  const summaryFile = path.join(OUT_DIR, `${outLabel}.summary.json`);
  fs.writeFileSync(outFile, JSON.stringify(graph, null, 2));
  fs.writeFileSync(summaryFile, JSON.stringify(graph.summary, null, 2));
  console.log(`Wrote ${outFile}`);
  console.log(`Summary: ${graph.summary.totalNodes} nodes, ${graph.summary.orphanNodes} orphans`);

  if (diff) {
    const beforeFile = path.join(OUT_DIR, "before.graph.json");
    if (fs.existsSync(beforeFile) && outLabel === "after") {
      const before = JSON.parse(fs.readFileSync(beforeFile, "utf8")) as ImportGraph;
      diffGraphs(before, graph);
    }
  }
}

main();
