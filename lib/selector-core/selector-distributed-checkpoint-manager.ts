/**
 * @advisory v5.3.4 — distributed checkpoint manifest with deterministic reconcile. Node/fs only.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_POINTER_PATH } from "@/lib/selector-core/selector-snapshot-atomic-switch";

export type BuildPhaseName =
  | "validate"
  | "build"
  | "sync"
  | "verify"
  | "unifiedPolicyCheck"
  /** @deprecated v6.0 */
  | "apiEnforcement"
  /** @deprecated v6.0 */
  | "convergenceCheck";

export type BuildCheckpoint = {
  lastCompletedPhase: BuildPhaseName | null;
  completedAt: string;
  optionsFingerprint: string;
  phaseResults: Partial<Record<BuildPhaseName, { ok: boolean; at: string }>>;
};

export type NodeCheckpoint = BuildCheckpoint & {
  nodeId: string;
  recordedAt: string;
};

export type DistributedCheckpointManifest = {
  checkpointEpoch: number;
  leaderElectionId: string;
  nodes: Record<string, NodeCheckpoint>;
};

export type ReconcileResult = {
  winner: BuildCheckpoint;
  merged: DistributedCheckpointManifest;
  divergent: string[];
};

export const DEFAULT_BUILD_CHECKPOINT_PATH = path.join(
  path.dirname(DEFAULT_POINTER_PATH),
  "selector-build-checkpoint.json",
);

export const DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH = path.join(
  path.dirname(DEFAULT_POINTER_PATH),
  "selector-build-checkpoint-manifest.json",
);

export function resolveNodeId(): string {
  const hostname = typeof os.hostname === "function" ? os.hostname() : "unknown";
  const cwd = typeof process !== "undefined" ? process.cwd() : "";
  return crypto
    .createHash("sha256")
    .update(`${hostname}:${cwd}`)
    .digest("hex")
    .slice(0, 12);
}

function emptyManifest(): DistributedCheckpointManifest {
  return { checkpointEpoch: 0, leaderElectionId: "", nodes: {} };
}

function phaseOrderIndex(phase: BuildPhaseName): number {
  const order: BuildPhaseName[] = [
    "validate",
    "build",
    "sync",
    "verify",
    "unifiedPolicyCheck",
  ];
  const index = order.indexOf(phase);
  if (index >= 0) return index;
  if (phase === "apiEnforcement" || phase === "convergenceCheck") {
    return order.indexOf("unifiedPolicyCheck");
  }
  return -1;
}

function pickLeaderNodeId(manifest: DistributedCheckpointManifest): string {
  const nodeIds = Object.keys(manifest.nodes);
  if (nodeIds.length === 0) return resolveNodeId();
  return [...nodeIds].sort()[0]!;
}

export function readDistributedCheckpointManifest(
  manifestPath = DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH,
): DistributedCheckpointManifest {
  if (!fs.existsSync(manifestPath)) {
    return importLegacyCheckpoint();
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as DistributedCheckpointManifest;
  } catch {
    return emptyManifest();
  }
}

function importLegacyCheckpoint(): DistributedCheckpointManifest {
  if (!fs.existsSync(DEFAULT_BUILD_CHECKPOINT_PATH)) {
    return emptyManifest();
  }
  try {
    const legacy = JSON.parse(
      fs.readFileSync(DEFAULT_BUILD_CHECKPOINT_PATH, "utf8"),
    ) as BuildCheckpoint;
    const nodeId = resolveNodeId();
    return {
      checkpointEpoch: 0,
      leaderElectionId: nodeId,
      nodes: {
        [nodeId]: {
          ...legacy,
          nodeId,
          recordedAt: legacy.completedAt,
        },
      },
    };
  } catch {
    return emptyManifest();
  }
}

export function writeDistributedCheckpointManifest(
  manifest: DistributedCheckpointManifest,
  manifestPath = DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH,
): void {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function clearDistributedCheckpointManifest(
  manifestPath = DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH,
): void {
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
  }
  if (fs.existsSync(DEFAULT_BUILD_CHECKPOINT_PATH)) {
    fs.unlinkSync(DEFAULT_BUILD_CHECKPOINT_PATH);
  }
}

export function reconcileDistributedCheckpoints(
  manifest: DistributedCheckpointManifest,
): ReconcileResult {
  const nodeIds = Object.keys(manifest.nodes);
  const divergent: string[] = [];
  const fingerprints = new Set(nodeIds.map((id) => manifest.nodes[id]?.optionsFingerprint));

  if (fingerprints.size > 1) {
    divergent.push(...nodeIds);
  }

  const leaderNodeId = pickLeaderNodeId(manifest);
  const winnerNode = manifest.nodes[leaderNodeId];
  const winner: BuildCheckpoint = {
    lastCompletedPhase: winnerNode?.lastCompletedPhase ?? null,
    completedAt: winnerNode?.completedAt ?? new Date().toISOString(),
    optionsFingerprint: winnerNode?.optionsFingerprint ?? "",
    phaseResults: { ...(winnerNode?.phaseResults ?? {}) },
  };

  const mergedNodes: Record<string, NodeCheckpoint> = { ...manifest.nodes };
  const winnerFingerprint = winner.optionsFingerprint;

  for (const nodeId of nodeIds) {
    const node = manifest.nodes[nodeId];
    if (!node || node.optionsFingerprint !== winnerFingerprint) continue;
    for (const [phase, result] of Object.entries(node.phaseResults)) {
      const phaseName = phase as BuildPhaseName;
      const existing = winner.phaseResults[phaseName];
      if (result?.ok && (!existing || !existing.ok)) {
        winner.phaseResults[phaseName] = result;
        if (
          !winner.lastCompletedPhase ||
          phaseOrderIndex(phaseName) > phaseOrderIndex(winner.lastCompletedPhase)
        ) {
          winner.lastCompletedPhase = phaseName;
        }
      }
    }
  }

  if (winnerNode) {
    mergedNodes[leaderNodeId] = {
      ...winnerNode,
      ...winner,
      nodeId: leaderNodeId,
      recordedAt: new Date().toISOString(),
    };
  }

  const merged: DistributedCheckpointManifest = {
    checkpointEpoch: manifest.checkpointEpoch,
    leaderElectionId: `${manifest.checkpointEpoch}-${leaderNodeId}`,
    nodes: mergedNodes,
  };

  return { winner, merged, divergent };
}

export function recordNodeCheckpoint(
  checkpoint: BuildCheckpoint,
  manifestPath = DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH,
): DistributedCheckpointManifest {
  const manifest = readDistributedCheckpointManifest(manifestPath);
  const nodeId = resolveNodeId();
  const nextEpoch = manifest.checkpointEpoch + 1;

  const nodeCheckpoint: NodeCheckpoint = {
    ...checkpoint,
    nodeId,
    recordedAt: new Date().toISOString(),
  };

  const updated: DistributedCheckpointManifest = {
    checkpointEpoch: nextEpoch,
    leaderElectionId: `${nextEpoch}-${nodeId}`,
    nodes: {
      ...manifest.nodes,
      [nodeId]: nodeCheckpoint,
    },
  };

  writeDistributedCheckpointManifest(updated, manifestPath);
  writeLegacyCheckpointMirror(checkpoint);

  return updated;
}

function writeLegacyCheckpointMirror(checkpoint: BuildCheckpoint): void {
  fs.mkdirSync(path.dirname(DEFAULT_BUILD_CHECKPOINT_PATH), { recursive: true });
  fs.writeFileSync(
    DEFAULT_BUILD_CHECKPOINT_PATH,
    `${JSON.stringify(checkpoint, null, 2)}\n`,
    "utf8",
  );
}

export function readReconciledBuildCheckpoint(
  optionsFingerprint?: string,
): BuildCheckpoint | null {
  const manifest = readDistributedCheckpointManifest();
  if (Object.keys(manifest.nodes).length === 0) {
    return null;
  }
  const { winner } = reconcileDistributedCheckpoints(manifest);
  if (optionsFingerprint && winner.optionsFingerprint && winner.optionsFingerprint !== optionsFingerprint) {
    return null;
  }
  return winner;
}

export function reconcileAndPersistCheckpoints(
  manifestPath = DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH,
): ReconcileResult {
  const manifest = readDistributedCheckpointManifest(manifestPath);
  const result = reconcileDistributedCheckpoints(manifest);
  writeDistributedCheckpointManifest(result.merged, manifestPath);
  writeLegacyCheckpointMirror(result.winner);
  return result;
}

export function mergeDistributedManifests(
  left: DistributedCheckpointManifest,
  right: DistributedCheckpointManifest,
): DistributedCheckpointManifest {
  const winnerEpoch = Math.max(left.checkpointEpoch, right.checkpointEpoch);
  const base = left.checkpointEpoch >= right.checkpointEpoch ? left : right;
  const other = base === left ? right : left;
  return {
    checkpointEpoch: winnerEpoch,
    leaderElectionId: `${winnerEpoch}-${pickLeaderNodeId(base)}`,
    nodes: {
      ...other.nodes,
      ...base.nodes,
    },
  };
}
