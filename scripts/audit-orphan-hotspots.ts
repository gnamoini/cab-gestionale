#!/usr/bin/env npx tsx
/**
 * Orphan hotspot report — 4-state taxonomy + confidence per area.
 * Output: artifacts/audit/dead-code-baseline/orphan-hotspots.json
 */
import fs from "node:fs";
import path from "node:path";
import type { ImportGraph } from "./audit-import-graph";
import {
  classifyGraphOrphans,
  summarizeOrphans,
  type ClassifiedOrphan,
} from "./audit-orphan-taxonomy";

const ROOT = process.cwd();
const GRAPH_PATH = path.join(ROOT, "artifacts", "audit", "dependency-graph", "after.graph.json");
const KNIP_PATH = path.join(ROOT, "artifacts", "audit", "dead-code-baseline", "knip-baseline.json");
const OUT_PATH = path.join(ROOT, "artifacts", "audit", "dead-code-baseline", "orphan-hotspots.json");

function loadKnipUnused(): Set<string> {
  if (!fs.existsSync(KNIP_PATH)) return new Set();
  const data = JSON.parse(fs.readFileSync(KNIP_PATH, "utf8")) as {
    files?: string[];
  };
  return new Set((data.files ?? []).map((f) => f.replace(/\\/g, "/")));
}

function areaKey(file: string): string {
  const parts = file.split("/");
  if (parts[0] === "components" || parts[0] === "lib" || parts[0] === "app") {
    return `${parts[0]}/${parts[1] ?? "_"}`;
  }
  return parts[0] ?? "root";
}

function groupByArea(classified: ClassifiedOrphan[]): Record<
  string,
  {
    total: number;
    deadCandidate: number;
    runtimeOnly: number;
    unknown: number;
    highConfidenceDead: number;
    nodes: ClassifiedOrphan[];
  }
> {
  const areas: Record<string, ReturnType<typeof groupByArea>[string]> = {};
  for (const node of classified) {
    const key = areaKey(node.file);
    if (!areas[key]) {
      areas[key] = {
        total: 0,
        deadCandidate: 0,
        runtimeOnly: 0,
        unknown: 0,
        highConfidenceDead: 0,
        nodes: [],
      };
    }
    const a = areas[key]!;
    a.total++;
    if (node.state === "deadCandidate") a.deadCandidate++;
    if (node.state === "runtimeOnly") a.runtimeOnly++;
    if (node.state === "unknown") a.unknown++;
    if (node.state === "deadCandidate" && node.confidenceScore >= 85) a.highConfidenceDead++;
    a.nodes.push(node);
  }
  for (const a of Object.values(areas)) {
    a.nodes.sort((x, y) => y.confidenceScore - x.confidenceScore);
  }
  return areas;
}

function main(): void {
  const graphLabel =
    process.argv.includes("--graph") ?
      process.argv[process.argv.indexOf("--graph") + 1] ?? "after"
    : "after";
  const graphPath = path.join(
    ROOT,
    "artifacts",
    "audit",
    "dependency-graph",
    `${graphLabel}.graph.json`,
  );

  if (!fs.existsSync(graphPath)) {
    console.error(`Missing graph: ${graphPath}. Run audit:import-graph first.`);
    process.exit(1);
  }

  const graph = JSON.parse(fs.readFileSync(graphPath, "utf8")) as ImportGraph;
  const knipUnused = loadKnipUnused();
  const fileContentCache = new Map<string, string>();

  for (const node of graph.nodes) {
    const full = path.join(ROOT, node.id);
    if (fs.existsSync(full)) {
      fileContentCache.set(node.id, fs.readFileSync(full, "utf8"));
    }
  }

  const classified = classifyGraphOrphans(graph, knipUnused, fileContentCache);
  const summary = summarizeOrphans(classified);
  const areas = groupByArea(classified);

  const entryOnlyCount = graph.nodes.filter((n) => n.isEntryPoint && n.consumerCount === 0).length;

  const output = {
    generatedAt: new Date().toISOString(),
    graphLabel,
    orphanNodes: {
      ...summary,
      entryOnly: entryOnlyCount,
    },
    areas,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(
    `Orphans: ${summary.total} (dead=${summary.deadCandidate} runtime=${summary.runtimeOnly} unknown=${summary.unknown} entryOnly=${entryOnlyCount})`,
  );
  console.log(`High-confidence dead (production): ${summary.highConfidenceDeadProduction}`);
}

main();
