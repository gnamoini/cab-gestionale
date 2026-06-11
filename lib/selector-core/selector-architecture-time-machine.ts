/**
 * @advisory v6.3 — read-only architecture reconstruction at a point in time.
 */
import fs from "node:fs";
import path from "node:path";
import { RULESET_VERSION } from "@/lib/selector-core/selector-enforcement-ruleset";
import { DEFAULT_SNAPSHOT_STORE_DIR } from "@/lib/selector-core/selector-snapshot-registry";
import type { TemporalLineageGraph } from "@/lib/selector-core/selector-core-causal-model";

export type TemporalLineageNode = {
  version: string;
  validFrom: number;
  validUntil: number | null;
};

function wasSnapshotValidAt(
  version: string,
  timestamp: number,
  graph: TemporalLineageGraph,
): boolean {
  const node = graph.nodes.find((n) => n.version === version);
  if (!node) return false;
  if (timestamp < node.validFrom) return false;
  if (node.validUntil !== null && timestamp <= node.validUntil) return false;

  const activeAtTimestamp = Object.keys(graph.activeAt)
    .map(Number)
    .filter((t) => t <= timestamp)
    .sort((a, b) => b - a)[0];

  if (activeAtTimestamp === undefined) {
    return node.validUntil === null;
  }

  const activeVersion = graph.activeAt[activeAtTimestamp];
  if (!activeVersion) return node.validUntil === null;

  const activeIndex = graph.nodes.findIndex((n) => n.version === activeVersion);
  const versionIndex = graph.nodes.findIndex((n) => n.version === version);
  if (activeIndex === -1 || versionIndex === -1) return false;

  return versionIndex <= activeIndex;
}

const ROOT = process.cwd();

export type ArchitectureTimeSnapshot = {
  queriedAt: number;
  activeSnapshot: { version: string; schemaHash?: string };
  pointerState: { activeVersion: string; previousVersion: string; updatedAt: number };
  policyState: { rulesetVersion: string; converged: boolean | "unknown" };
  rollbackAvailability: string[];
  temporalLineage: { version: string; validFrom?: number; validUntil?: number | null }[];
  confidence: number;
};

type PointerJson = {
  activeVersion?: string;
  previousVersion?: string;
  updatedAt?: number;
};

type BundleManifestJson = {
  versions?: string[];
  schemaHashes?: Record<string, string>;
  generatedAt?: string;
};

function readJson<T>(rel: string): T | null {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function parseRollbackVersions(): string[] {
  const rel = "lib/selector-core/generated/selector-rollback-registry.generated.ts";
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  const source = fs.readFileSync(abs, "utf8");
  const versions: string[] = [];
  const re = /["'](v\d+)["']\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    versions.push(match[1]!);
  }
  return [...new Set(versions)];
}

function buildLineageFromStoreManifest(): TemporalLineageGraph | null {
  const manifestPath = path.join(ROOT, DEFAULT_SNAPSHOT_STORE_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      activeVersion?: string;
      versions?: string[];
      lifecycle?: Record<string, string>;
    };
    const versions = manifest.versions ?? [];
    const nodes = versions.map((version, index) => ({
      version,
      validFrom: index * 1000,
      validUntil: index < versions.length - 1 ? (index + 1) * 1000 : null,
    }));
    const activeAt: Record<number, string> = {};
    for (let i = 0; i < versions.length; i++) {
      activeAt[i * 1000] = versions[i]!;
    }
    return { nodes, activeAt };
  } catch {
    return null;
  }
}

export function reconstructArchitectureAt(input: {
  timestamp?: number;
  version?: string;
  versionTimestamp?: number;
}): ArchitectureTimeSnapshot {
  const queriedAt = input.versionTimestamp ?? input.timestamp ?? Date.now();
  const pointer = readJson<PointerJson>("lib/selector-core/generated/selector-active-pointer.json");
  const bundle = readJson<BundleManifestJson>(
    "lib/selector-core/generated/selector-bundle-manifest.json",
  );

  const pointerUpdatedAt = pointer?.updatedAt ?? 0;
  const activeVersion = pointer?.activeVersion ?? bundle?.versions?.[0] ?? "v0";
  const schemaHash = bundle?.schemaHashes?.[activeVersion];

  let confidence = 0.5;
  if (pointer && bundle) confidence += 0.2;
  if (pointerUpdatedAt > 0 && queriedAt >= pointerUpdatedAt) confidence += 0.2;
  if (input.version) confidence += 0.05;
  confidence = Math.min(confidence, 1);

  const lineageGraph = buildLineageFromStoreManifest();
  const temporalLineage =
    lineageGraph?.nodes.map((n) => ({
      version: n.version,
      validFrom: n.validFrom,
      validUntil: n.validUntil,
    })) ?? [{ version: activeVersion, validFrom: 0, validUntil: null }];

  const versionForSnapshot = input.version ?? activeVersion;
  let versionValid: boolean | "unknown" = "unknown";
  if (lineageGraph && input.version) {
    versionValid = wasSnapshotValidAt(input.version, queriedAt, lineageGraph);
  }

  return {
    queriedAt,
    activeSnapshot: { version: versionForSnapshot, schemaHash },
    pointerState: {
      activeVersion: pointer?.activeVersion ?? activeVersion,
      previousVersion: pointer?.previousVersion ?? activeVersion,
      updatedAt: pointerUpdatedAt,
    },
    policyState: {
      rulesetVersion: RULESET_VERSION,
      converged: versionValid === true ? true : versionValid === false ? false : "unknown",
    },
    rollbackAvailability: parseRollbackVersions(),
    temporalLineage,
    confidence,
  };
}

export function reconstructSnapshotAt(input: {
  version: string;
  timestamp: number;
}): ArchitectureTimeSnapshot {
  return reconstructArchitectureAt({
    version: input.version,
    versionTimestamp: input.timestamp,
  });
}
