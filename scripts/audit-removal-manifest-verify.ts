#!/usr/bin/env npx tsx
/**
 * Verify removal manifest integrity before delete.
 *
 * Usage: npx tsx scripts/audit-removal-manifest-verify.ts [--manifest path]
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_DIR = path.join(ROOT, "artifacts", "audit", "removal-manifests");

type RemovedFile = {
  path: string;
  previousHash?: string;
  consumerCount?: number;
  confidenceScore?: number;
  evidence?: string[];
};

type RemovalManifestV2 = {
  batchId?: string;
  batch?: string;
  phase?: string;
  removedFiles?: RemovedFile[];
  items?: { path: string; staticEvidence?: string[] }[];
};

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
}

function loadConsumerCounts(): Map<string, number> {
  const graphPath = path.join(ROOT, "artifacts", "audit", "dependency-graph", "after.graph.json");
  const map = new Map<string, number>();
  if (!fs.existsSync(graphPath)) return map;
  const graph = JSON.parse(fs.readFileSync(graphPath, "utf8")) as {
    nodes?: { id: string; consumerCount: number }[];
  };
  for (const n of graph.nodes ?? []) {
    map.set(n.id.replace(/\\/g, "/"), n.consumerCount);
  }
  return map;
}

function verifyManifest(manifestPath: string, postDelete: boolean): string[] {
  const errors: string[] = [];
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as RemovalManifestV2;
  const batchId = raw.batchId ?? raw.batch;
  if (!batchId) errors.push("missing batchId/batch");

    const files: RemovedFile[] =
    raw.removedFiles ??
    (raw.items ?? []).map((i) => ({
      path: i.path,
      evidence: i.staticEvidence ?? [],
      consumerCount: 0,
    }));

  if (files.length === 0) errors.push("no removedFiles/items");

  const consumers = loadConsumerCounts();

  for (const item of files) {
    const rel = item.path.replace(/\\/g, "/");
    const full = path.join(ROOT, rel);
    const exists = fs.existsSync(full);

    if (!postDelete && !exists) {
      if (!item.previousHash) continue;
      errors.push(`${rel}: file missing pre-delete verification`);
      continue;
    }

    if (postDelete && exists) errors.push(`${rel}: file still exists post-delete`);

    if (!postDelete && exists && item.previousHash) {
      const hash = sha256File(full);
      if (hash !== item.previousHash) {
        errors.push(`${rel}: hash mismatch (expected ${item.previousHash}, got ${hash})`);
      }
    }

    const cc = consumers.get(rel);
    if (item.consumerCount !== undefined && cc !== undefined && cc !== item.consumerCount) {
      errors.push(`${rel}: consumerCount ${item.consumerCount} != graph ${cc}`);
    }

    if (item.confidenceScore !== undefined && item.confidenceScore < 85) {
      errors.push(`${rel}: confidenceScore ${item.confidenceScore} < 85 (manual review required)`);
    }

    if (!item.evidence || item.evidence.length === 0) {
      errors.push(`${rel}: missing evidence[]`);
    }
  }

  return errors;
}

function main(): void {
  const manifestArg = process.argv.indexOf("--manifest");
  const postDelete = process.argv.includes("--post");
  const targets: string[] = [];

  if (manifestArg >= 0) {
    targets.push(process.argv[manifestArg + 1]!);
  } else if (fs.existsSync(MANIFEST_DIR)) {
    targets.push(
      ...fs
        .readdirSync(MANIFEST_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(MANIFEST_DIR, f)),
    );
  }

  if (targets.length === 0) {
    console.error("No manifests found");
    process.exit(1);
  }

  let failed = 0;
  for (const m of targets) {
    const errors = verifyManifest(m, postDelete);
    if (errors.length === 0) {
      console.log(`PASS: ${path.basename(m)}`);
    } else {
      failed++;
      console.error(`FAIL: ${path.basename(m)}`);
      for (const e of errors) console.error(`  - ${e}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
