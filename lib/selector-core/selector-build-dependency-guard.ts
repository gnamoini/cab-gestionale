/**
 * @advisory v5.3.1 — build-time artifact and bundle bounds guards. Node/fs only.
 */
import fs from "node:fs";
import path from "node:path";
import { readPointer, DEFAULT_POINTER_PATH } from "@/lib/selector-core/selector-snapshot-atomic-switch";
import {
  DEFAULT_BUNDLE_MANIFEST_PATH,
  DEFAULT_GENERATED_SNAPSHOTS_DIR,
  DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH,
} from "@/lib/selector-core/selector-bundle-registry-consistency-check";
import { MAX_BUNDLED_SNAPSHOTS } from "@/lib/selector-core/selector-snapshot-pruner";
import type { SelectorBundleManifest } from "@/lib/selector-core/selector-bundle-registry-consistency-check";
import type { SelectorSnapshotPointer } from "@/lib/selector-core/types";

export function assertBoundedBundle(count: number): void {
  if (count > MAX_BUNDLED_SNAPSHOTS) {
    throw new Error(
      `Bundled snapshot count ${count} exceeds MAX_BUNDLED_SNAPSHOTS (${MAX_BUNDLED_SNAPSHOTS})`,
    );
  }
}

export function assertArtifactsVerifiable(options?: {
  pointerPath?: string;
  manifestPath?: string;
  registryGeneratedPath?: string;
  generatedSnapshotsDir?: string;
}): void {
  const pointerPath = options?.pointerPath ?? DEFAULT_POINTER_PATH;
  const manifestPath = options?.manifestPath ?? DEFAULT_BUNDLE_MANIFEST_PATH;
  const registryGeneratedPath =
    options?.registryGeneratedPath ?? DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH;
  const generatedSnapshotsDir =
    options?.generatedSnapshotsDir ?? DEFAULT_GENERATED_SNAPSHOTS_DIR;

  if (!fs.existsSync(pointerPath)) {
    throw new Error(`Missing pointer artifact: ${pointerPath}`);
  }
  const pointer = JSON.parse(fs.readFileSync(pointerPath, "utf8")) as SelectorSnapshotPointer;
  if (!pointer.activeVersion?.trim()) {
    throw new Error("Pointer activeVersion is empty");
  }

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing bundle manifest: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SelectorBundleManifest;
  if (!Array.isArray(manifest.versions) || manifest.versions.length === 0) {
    throw new Error("Bundle manifest has no versions");
  }

  if (!fs.existsSync(registryGeneratedPath)) {
    throw new Error(`Missing registry.generated.ts: ${registryGeneratedPath}`);
  }
  if (!fs.readFileSync(registryGeneratedPath, "utf8").includes("SNAPSHOT_REGISTRY")) {
    throw new Error("registry.generated.ts missing SNAPSHOT_REGISTRY export");
  }

  const activeSnapshotPath = path.join(generatedSnapshotsDir, `${pointer.activeVersion}.json`);
  if (!fs.existsSync(activeSnapshotPath)) {
    throw new Error(`Missing active bundled snapshot: ${activeSnapshotPath}`);
  }
  JSON.parse(fs.readFileSync(activeSnapshotPath, "utf8"));
}

/** Static audit helper — runtime modules must not import Node-only build pipeline. */
export function assertNoImplicitOrdering(moduleSource: string, moduleLabel: string): void {
  const forbidden = [
    "selector-build-orchestrator",
    "selector-snapshot-pruner",
    "selector-bundle-registry-consistency-check",
  ];
  for (const token of forbidden) {
    if (moduleSource.includes(token)) {
      throw new Error(`${moduleLabel} must not import ${token}`);
    }
  }
}
