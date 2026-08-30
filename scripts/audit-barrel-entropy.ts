#!/usr/bin/env npx tsx
/**
 * Barrel entropy — public API protection + owner metadata.
 * Output: artifacts/audit/dead-code-baseline/barrel-entropy.json
 */
import fs from "node:fs";
import path from "node:path";
import type { ImportGraph } from "./audit-import-graph";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "artifacts", "audit", "dead-code-baseline", "barrel-entropy.json");

type BarrelConfig = {
  barrel: string;
  owner: string;
  apiStability: "public" | "internal" | "unknown";
};

const TARGET_BARRELS: BarrelConfig[] = [
  { barrel: "components/design-system/index.ts", owner: "design-system", apiStability: "public" },
  { barrel: "components/design-system/loading/index.ts", owner: "design-system", apiStability: "public" },
  { barrel: "components/design-system/layout/index.ts", owner: "design-system", apiStability: "public" },
  { barrel: "components/design-system/global-input/index.ts", owner: "design-system", apiStability: "public" },
  { barrel: "components/report/design-system/index.ts", owner: "report", apiStability: "internal" },
  { barrel: "components/form-ux-migration/index.ts", owner: "forms", apiStability: "unknown" },
];

const EXPORT_RE = /export\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))/g;

function parseExports(barrelPath: string): string[] {
  const content = fs.readFileSync(path.join(ROOT, barrelPath), "utf8");
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  EXPORT_RE.lastIndex = 0;
  while ((m = EXPORT_RE.exec(content))) {
    if (m[1]) {
      for (const part of m[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0]?.trim();
        if (name && /^[A-Za-z_]/.test(name)) names.add(name);
      }
    } else if (m[2]) {
      names.add(m[2]);
    }
  }
  return [...names];
}

function resolveExportFile(barrel: string, exportName: string): string | null {
  const dir = path.dirname(barrel);
  const candidates = [
    `${dir}/${exportName}.tsx`,
    `${dir}/${exportName}.ts`,
    `${dir}/${exportName}/index.ts`,
    `${dir}/${exportName}/index.tsx`,
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(ROOT, c))) return c;
  }
  return null;
}

function barrelVisibility(barrel: string, graph: ImportGraph): "internal-barrel" | "domain-barrel" | "public-barrel" {
  const barrelDir = path.dirname(barrel);
  const importers = graph.nodes.filter((n) => n.imports.includes(barrel));
  if (importers.length === 0) return "internal-barrel";
  const outside = importers.some((n) => !n.id.startsWith(barrelDir + "/") && n.id !== barrel);
  const crossDomain = importers.some((n) => {
    const nDir = n.id.split("/").slice(0, 2).join("/");
    const bDir = barrelDir.split("/").slice(0, 2).join("/");
    return nDir !== bDir;
  });
  if (crossDomain) return "public-barrel";
  if (outside) return "domain-barrel";
  return "internal-barrel";
}

function countImportRefs(graph: ImportGraph, targetFile: string, viaBarrel: string): {
  directImports: number;
  barrelImports: number;
} {
  let direct = 0;
  let via = 0;
  for (const node of graph.nodes) {
    if (node.id === targetFile || node.id === viaBarrel) continue;
    if (node.imports.includes(targetFile)) direct++;
    if (node.imports.includes(viaBarrel) && !node.imports.includes(targetFile)) via++;
  }
  return { directImports: direct, barrelImports: via };
}

function main(): void {
  const graphPath = path.join(ROOT, "artifacts", "audit", "dependency-graph", "after.graph.json");
  if (!fs.existsSync(graphPath)) {
    console.error("Missing after.graph.json — run audit:import-graph --out after");
    process.exit(1);
  }
  const graph = JSON.parse(fs.readFileSync(graphPath, "utf8")) as ImportGraph;

  const barrels = TARGET_BARRELS.map((cfg) => {
    if (!fs.existsSync(path.join(ROOT, cfg.barrel))) {
      return { ...cfg, missing: true, visibility: "internal-barrel" as const, risk: "low", exports: [] };
    }
    const visibility = barrelVisibility(cfg.barrel, graph);
    const exportNames = parseExports(cfg.barrel);
    const exports = exportNames.map((name) => {
      const file = resolveExportFile(cfg.barrel, name);
      const counts =
        file ?
          countImportRefs(graph, file, cfg.barrel)
        : { directImports: 0, barrelImports: 0 };
      const status =
        counts.directImports === 0 && counts.barrelImports === 0 ? "unused"
        : counts.directImports === 0 && counts.barrelImports > 0 ? "active-via-barrel"
        : "active";
      return {
        export: name,
        file,
        ...counts,
        status,
        apiStability: cfg.apiStability,
      };
    });
    const risk =
      visibility === "public-barrel" ? "high"
      : exports.some((e) => e.status === "unused") ? "medium"
      : "low";
    return {
      barrel: cfg.barrel,
      owner: cfg.owner,
      apiStability: cfg.apiStability,
      visibility,
      risk,
      exports,
    };
  });

  const output = { generatedAt: new Date().toISOString(), barrels };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUT_PATH} (${barrels.length} barrels)`);
}

main();
