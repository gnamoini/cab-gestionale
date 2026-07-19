/**
 * Orphan node taxonomy + confidence scoring (Phase 9 SSOT).
 */
import type { GraphNode, ImportGraph, RuntimeEdge, RuntimeEdgeType } from "./audit-import-graph";

export type OrphanState = "deadCandidate" | "runtimeOnly" | "entryOnly" | "unknown";
export type OrphanConfidence = "high" | "medium" | "low";
export type OrphanEnvironment = "production" | "test" | "tooling" | "e2e";

export type ClassifiedOrphan = {
  file: string;
  state: OrphanState;
  confidence: OrphanConfidence;
  confidenceScore: number;
  dynamicRisk: boolean;
  evidence: string[];
  environment: OrphanEnvironment;
};

const RUNTIME_INBOUND_TYPES = new Set<RuntimeEdgeType>([
  "DYNAMIC_IMPORT",
  "REGISTRY_REFERENCE",
  "DB_REFERENCE",
  "FLAG_REFERENCE",
  "CRON_REFERENCE",
]);

const REGISTRY_ADJACENT_RE =
  /(?:^|\/)(?:control|notifications\/delivery|feature-flags|selector-core|report\/metrics|pdf)\//;

export function classifyEnvironment(file: string): OrphanEnvironment {
  if (file.startsWith("e2e/") || file.includes("/e2e/")) return "e2e";
  if (file.startsWith("scripts/") || file.includes("/scripts/")) return "tooling";
  if (
    file.includes(".test.") ||
    file.includes(".spec.") ||
    file.includes("/__tests__/") ||
    file.includes("/regression/")
  ) {
    return "test";
  }
  return "production";
}

function runtimeInboundTargets(graph: ImportGraph): Map<string, RuntimeEdge[]> {
  const map = new Map<string, RuntimeEdge[]>();
  for (const edge of graph.runtimeEdges) {
    if (!RUNTIME_INBOUND_TYPES.has(edge.type)) continue;
    const list = map.get(edge.to) ?? [];
    list.push(edge);
    map.set(edge.to, list);
  }
  return map;
}

function hasDynamicRisk(file: string, content: string): boolean {
  if (REGISTRY_ADJACENT_RE.test(file)) return true;
  return /\bimport\s*\(/.test(content) || /\.rpc\s*\(/.test(content);
}

export function scoreConfidence(input: {
  knipUnused: boolean;
  importInboundZero: boolean;
  grepZero: boolean;
  runtimeEdgeZero: boolean;
  dynamicRisk: boolean;
  registryAdjacent: boolean;
}): { score: number; evidence: string[] } {
  let score = 0;
  const evidence: string[] = [];
  if (input.knipUnused) {
    score += 25;
    evidence.push("knip:file-unused");
  }
  if (input.importInboundZero) {
    score += 25;
    evidence.push("importGraph:0-inbound");
  }
  if (input.grepZero) {
    score += 20;
    evidence.push("grep:no-reference");
  }
  if (input.runtimeEdgeZero) {
    score += 20;
    evidence.push("runtimeEdges:0");
  }
  if (input.dynamicRisk) {
    score -= 40;
    evidence.push("dynamicRisk:true");
  }
  if (input.registryAdjacent) {
    score -= 20;
    evidence.push("registry-adjacent-directory");
  }
  score = Math.max(0, Math.min(100, score));
  return { score, evidence };
}

export function confidenceLabel(score: number): OrphanConfidence {
  if (score >= 85) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function classifyOrphanNode(
  node: GraphNode,
  runtimeInbound: RuntimeEdge[],
  opts: { knipUnused: boolean; grepZero: boolean; fileContent: string },
): ClassifiedOrphan {
  const environment = classifyEnvironment(node.id);
  const registryAdjacent = REGISTRY_ADJACENT_RE.test(node.id);
  const dynamicRisk = hasDynamicRisk(node.id, opts.fileContent);
  const hasRuntimeInbound = runtimeInbound.length > 0;

  let state: OrphanState;
  if (node.isEntryPoint) {
    state = "entryOnly";
  } else if (node.consumerCount === 0 && hasRuntimeInbound) {
    state = "runtimeOnly";
  } else if (node.consumerCount === 0 && !hasRuntimeInbound) {
    state = "deadCandidate";
  } else {
    state = "unknown";
  }

  const { score, evidence } = scoreConfidence({
    knipUnused: opts.knipUnused,
    importInboundZero: node.consumerCount === 0,
    grepZero: opts.grepZero,
    runtimeEdgeZero: !hasRuntimeInbound,
    dynamicRisk,
    registryAdjacent,
  });

  if (state === "runtimeOnly") evidence.push("state:runtimeOnly");
  if (state === "entryOnly") evidence.push("state:entryOnly");

  return {
    file: node.id,
    state,
    confidence: confidenceLabel(score),
    confidenceScore: score,
    dynamicRisk,
    evidence,
    environment,
  };
}

export function classifyGraphOrphans(
  graph: ImportGraph,
  knipUnusedFiles: Set<string>,
  fileContentCache: Map<string, string>,
): ClassifiedOrphan[] {
  const runtimeInbound = runtimeInboundTargets(graph);
  const orphanNodes = graph.nodes.filter((n) => n.consumerCount === 0 && !n.isEntryPoint);
  const allIds = graph.nodes.map((n) => n.id);

  return orphanNodes.map((node) => {
    const content = fileContentCache.get(node.id) ?? "";
    const basename = node.id.split("/").pop()?.replace(/\.(tsx?|mts)$/, "") ?? "";
    let grepZero = true;
    if (basename.length >= 4) {
      for (const other of allIds) {
        if (other === node.id) continue;
        const c = fileContentCache.get(other);
        if (c?.includes(basename)) {
          grepZero = false;
          break;
        }
      }
    } else {
      grepZero = false;
    }
    return classifyOrphanNode(node, runtimeInbound.get(node.id) ?? [], {
      knipUnused: knipUnusedFiles.has(node.id),
      grepZero,
      fileContent: content,
    });
  });
}

export function summarizeOrphans(classified: ClassifiedOrphan[]): {
  total: number;
  deadCandidate: number;
  runtimeOnly: number;
  entryOnly: number;
  unknown: number;
  byEnvironment: Record<OrphanEnvironment, number>;
  highConfidenceDeadProduction: number;
} {
  const byState = { deadCandidate: 0, runtimeOnly: 0, entryOnly: 0, unknown: 0 };
  const byEnvironment: Record<OrphanEnvironment, number> = {
    production: 0,
    test: 0,
    tooling: 0,
    e2e: 0,
  };
  let highConfidenceDeadProduction = 0;

  for (const o of classified) {
    byState[o.state]++;
    byEnvironment[o.environment]++;
    if (
      o.state === "deadCandidate" &&
      o.environment === "production" &&
      o.confidenceScore >= 85
    ) {
      highConfidenceDeadProduction++;
    }
  }

  return {
    total: classified.length,
    ...byState,
    byEnvironment,
    highConfidenceDeadProduction,
  };
}
