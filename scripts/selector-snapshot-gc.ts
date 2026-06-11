/**
 * Dry-run or apply snapshot store GC based on lifecycle retention policy.
 *
 * Usage:
 *   npx tsx scripts/selector-snapshot-gc.ts
 *   npx tsx scripts/selector-snapshot-gc.ts --apply
 *   npx tsx scripts/selector-snapshot-gc.ts --at=2026-01-01T00:00:00.000Z
 */
import path from "node:path";
import { readPointer, DEFAULT_POINTER_PATH } from "@/lib/selector-core/selector-snapshot-atomic-switch";
import { classifySnapshotVersions } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import {
  applySnapshotGc,
  planSnapshotGcWithTemporalValidation,
} from "@/lib/selector-core/selector-snapshot-gc-policy";
import {
  DEFAULT_SNAPSHOT_STORE_DIR,
  listSnapshots,
  readManifest,
} from "@/lib/selector-core/selector-snapshot-registry";

function main(): void {
  const apply = process.argv.includes("--apply");
  const atArg = process.argv.find((arg) => arg.startsWith("--at="));
  const atTimestamp = atArg ? Date.parse(atArg.split("=")[1] ?? "") : Date.now();
  const storeDir = DEFAULT_SNAPSHOT_STORE_DIR;
  const pointer = readPointer(DEFAULT_POINTER_PATH);
  const manifest = readManifest(path.join(storeDir, "manifest.json"));
  const storeVersions = listSnapshots(storeDir);
  const classification = classifySnapshotVersions(storeVersions, pointer, manifest);
  const plan = planSnapshotGcWithTemporalValidation(
    classification,
    manifest,
    pointer,
    atTimestamp,
  );
  const result = applySnapshotGc(plan, { apply, storeDir });

  console.log(`GC plan — protected: ${plan.protected.join(", ") || "(none)"}`);
  if (plan.blockedByDependency.length > 0) {
    console.log(`GC plan — blocked by dependency: ${plan.blockedByDependency.join(", ")}`);
  }
  if (plan.temporalBlocked && plan.temporalBlocked.length > 0) {
    console.log(`GC plan — temporal blocked: ${plan.temporalBlocked.join(", ")}`);
  }

  if (atArg) {
    console.log(`GC replay at: ${new Date(atTimestamp).toISOString()}`);
  }

  if (plan.candidates.length === 0) {
    console.log("GC plan — no delete candidates");
  } else {
    for (const entry of plan.candidates) {
      console.log(`  candidate: ${entry.version} (${entry.reason}, class=${entry.retentionClass})`);
    }
  }

  if (apply) {
    console.log(`GC apply — deleted: ${result.deleted.join(", ") || "(none)"}`);
    console.log(`GC apply — skipped: ${result.skipped.join(", ") || "(none)"}`);
  } else {
    console.log("GC dry-run only — pass --apply to delete candidates");
  }
}

main();
