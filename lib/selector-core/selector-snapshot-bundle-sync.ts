/**
 * @advisory v5.3.2 — sync pruned store snapshots + rollback registry. Node/fs only.
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_BUNDLE_MANIFEST_PATH,
  writeBundleManifest,
} from "@/lib/selector-core/selector-bundle-registry-consistency-check";
import { readPointer, DEFAULT_POINTER_PATH } from "@/lib/selector-core/selector-snapshot-atomic-switch";
import { classifySnapshotVersions } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import { selectVersionsForBundle } from "@/lib/selector-core/selector-snapshot-pruner";
import {
  DEFAULT_SNAPSHOT_STORE_DIR,
  getSnapshot,
  listSnapshots,
  readManifest,
} from "@/lib/selector-core/selector-snapshot-registry";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

export const DEFAULT_GENERATED_DIR = path.join(
  process.cwd(),
  "lib",
  "selector-core",
  "generated",
);

export const DEFAULT_GENERATED_SNAPSHOTS_DIR = path.join(
  DEFAULT_GENERATED_DIR,
  "snapshots",
);

export const DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH = path.join(
  DEFAULT_GENERATED_DIR,
  "selector-snapshot-registry.generated.ts",
);

export const DEFAULT_ROLLBACK_REGISTRY_GENERATED_PATH = path.join(
  DEFAULT_GENERATED_DIR,
  "selector-rollback-registry.generated.ts",
);

export type SyncSnapshotBundleResult = {
  bundledVersions: string[];
  rollbackOnlyVersions: string[];
};

function sanitizeVersionKey(version: string): string {
  return version.replace(/[^a-zA-Z0-9_]/g, "_");
}

function writeRegistryFile(
  registryGeneratedPath: string,
  exportName: string,
  versions: string[],
  header: string,
): void {
  const importLines = versions.map((version) => {
    const key = sanitizeVersionKey(version);
    return `import snapshot_${key} from "./snapshots/${version}.json";`;
  });
  const registryEntries = versions.map((version) => {
    const key = sanitizeVersionKey(version);
    return `  "${version}": snapshot_${key} as unknown as SelectorRuntimeSnapshot,`;
  });
  const content = [
    header,
    'import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";',
    ...importLines,
    "",
    `export const ${exportName} = {`,
    ...registryEntries,
    "} as const;",
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(registryGeneratedPath), { recursive: true });
  fs.writeFileSync(registryGeneratedPath, content, "utf8");
}

function writeSnapshotJson(
  generatedSnapshotsDir: string,
  snapshot: SelectorRuntimeSnapshot,
): void {
  const destPath = path.join(generatedSnapshotsDir, `${snapshot.version}.json`);
  fs.writeFileSync(destPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

export function syncSnapshotBundle(
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  generatedSnapshotsDir = DEFAULT_GENERATED_SNAPSHOTS_DIR,
  registryGeneratedPath = DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH,
  versionsToBundle?: string[],
  pointerPath = DEFAULT_POINTER_PATH,
  bundleManifestPath = DEFAULT_BUNDLE_MANIFEST_PATH,
  rollbackRegistryGeneratedPath = DEFAULT_ROLLBACK_REGISTRY_GENERATED_PATH,
): string[] {
  const result = syncSnapshotBundleDetailed(
    storeDir,
    generatedSnapshotsDir,
    registryGeneratedPath,
    versionsToBundle,
    pointerPath,
    bundleManifestPath,
    rollbackRegistryGeneratedPath,
  );
  return result.bundledVersions;
}

export function syncSnapshotBundleDetailed(
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  generatedSnapshotsDir = DEFAULT_GENERATED_SNAPSHOTS_DIR,
  registryGeneratedPath = DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH,
  versionsToBundle?: string[],
  pointerPath = DEFAULT_POINTER_PATH,
  bundleManifestPath = DEFAULT_BUNDLE_MANIFEST_PATH,
  rollbackRegistryGeneratedPath = DEFAULT_ROLLBACK_REGISTRY_GENERATED_PATH,
): SyncSnapshotBundleResult {
  fs.mkdirSync(generatedSnapshotsDir, { recursive: true });

  const pointer = readPointer(pointerPath);
  const manifest = readManifest(path.join(storeDir, "manifest.json"));
  const storeVersions = listSnapshots(storeDir);
  const classification = classifySnapshotVersions(storeVersions, pointer, manifest);
  const versions =
    versionsToBundle ??
    selectVersionsForBundle(storeVersions, pointer, manifest);
  const rollbackOnlyVersions = classification.rollbackOnlyVersions;
  const retainedOnDisk = new Set([...versions, ...rollbackOnlyVersions]);
  const synced: string[] = [];

  for (const version of retainedOnDisk) {
    const snapshot = getSnapshot(version, storeDir);
    writeSnapshotJson(generatedSnapshotsDir, snapshot);
    if (versions.includes(version)) synced.push(version);
  }

  if (fs.existsSync(generatedSnapshotsDir)) {
    for (const file of fs.readdirSync(generatedSnapshotsDir)) {
      if (!file.endsWith(".json")) continue;
      const version = file.replace(/\.json$/, "");
      if (!retainedOnDisk.has(version)) {
        fs.unlinkSync(path.join(generatedSnapshotsDir, file));
      }
    }
  }

  writeRegistryFile(
    registryGeneratedPath,
    "SNAPSHOT_REGISTRY",
    synced,
    "/** @generated v5.3.2 — do not edit manually; run selector:build */",
  );

  writeRegistryFile(
    rollbackRegistryGeneratedPath,
    "ROLLBACK_SNAPSHOT_REGISTRY",
    rollbackOnlyVersions,
    "/** @generated v5.3.2 — rollback-safe versions not in primary bundle */",
  );

  writeBundleManifest(synced, generatedSnapshotsDir, bundleManifestPath, {
    pointer,
    rollbackVersions: rollbackOnlyVersions,
  });

  return { bundledVersions: synced, rollbackOnlyVersions };
}
