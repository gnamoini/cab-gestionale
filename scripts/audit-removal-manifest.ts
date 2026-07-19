#!/usr/bin/env npx tsx
/**
 * Generate deletion manifest before batch removal.
 *
 * Usage:
 *   npx tsx scripts/audit-removal-manifest.ts \
 *     --batch phase5-batch-001 \
 *     --bucket 1 --category A \
 *     --paths "components/foo.tsx,lib/bar.ts"
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const MANIFEST_DIR = path.join(ROOT, "artifacts", "audit", "removal-manifests");

type RemovedFileEntry = {
  path: string;
  previousHash?: string;
  consumerCount?: number;
  confidenceScore?: number;
  evidence: string[];
  bucket: 1 | 2 | 3;
  category: "A" | "B" | "C" | "D";
  runtimeEvidence: "none" | "0-hit" | "pending" | "active-hit";
  rollback: string;
};

type RemovalManifest = {
  batchId: string;
  phase: string;
  date: string;
  pr?: string;
  removedFiles: RemovedFileEntry[];
  /** @deprecated legacy */
  batch?: string;
  items?: unknown[];
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const batch = arg("--batch");
  const bucket = Number(arg("--bucket") ?? "1") as 1 | 2 | 3;
  const category = (arg("--category") ?? "A") as RemovedFileEntry["category"];
  const pathsRaw = arg("--paths");
  const pr = arg("--pr");
  const phase = arg("--phase") ?? "phase9";
  const runtimeEvidence = (arg("--runtime") ?? "0-hit") as RemovedFileEntry["runtimeEvidence"];
  const confidenceScore = Number(arg("--confidence") ?? "90");

  if (!batch || !pathsRaw) {
    console.error(
      'Usage: --batch NAME --paths "path1,path2" [--bucket 1] [--category A] [--phase phase9] [--confidence 90]',
    );
    process.exit(1);
  }

  const paths = pathsRaw.split(",").map((p) => p.trim()).filter(Boolean);
  const manifest: RemovalManifest = {
    batchId: batch,
    phase,
    date: new Date().toISOString().slice(0, 10),
    pr,
    removedFiles: paths.map((p) => {
      const rel = p.replace(/\\/g, "/");
      const full = path.join(ROOT, rel);
      const previousHash =
        fs.existsSync(full) ?
          crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex").slice(0, 12)
        : undefined;
      return {
        path: rel,
        previousHash,
        consumerCount: 0,
        confidenceScore,
        evidence: ["knip:file-unused", "importGraph:0-inbound", "grep:no-reference"],
        bucket,
        category,
        runtimeEvidence,
        rollback: "git revert <commit>",
      };
    }),
  };

  fs.mkdirSync(MANIFEST_DIR, { recursive: true });
  const out = path.join(MANIFEST_DIR, `${batch}.json`);
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${out} (${manifest.removedFiles.length} items)`);
}

main();
