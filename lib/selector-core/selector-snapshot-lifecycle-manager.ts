/**
 * @advisory v5.3.2 — snapshot lifecycle classification, bundle + rollback-safe selection.
 */
import {
  MAX_BUNDLED_SNAPSHOTS,
  sortVersionsByRecency,
} from "@/lib/selector-core/selector-snapshot-pruner";
import type {
  SelectorSnapshotManifest,
  SelectorSnapshotPointer,
  SnapshotRetentionClass,
} from "@/lib/selector-core/types";

export const MIN_ROLLBACK_BUFFER = 3;

export type LifecycleClassification = {
  retention: Record<string, SnapshotRetentionClass>;
  bundleVersions: string[];
  rollbackSafeVersions: string[];
  rollbackOnlyVersions: string[];
};

export type ClassifySnapshotVersionsOptions = {
  minRollbackBuffer?: number;
  maxBundled?: number;
};

function uniqueSorted(versions: string[]): string[] {
  return sortVersionsByRecency([...new Set(versions.filter((v) => v?.trim()))]);
}

export function classifySnapshotVersions(
  storeVersions: string[],
  pointer: SelectorSnapshotPointer,
  manifest: SelectorSnapshotManifest,
  options: ClassifySnapshotVersionsOptions = {},
): LifecycleClassification {
  const minRollbackBuffer = options.minRollbackBuffer ?? MIN_ROLLBACK_BUFFER;
  const maxBundled = options.maxBundled ?? MAX_BUNDLED_SNAPSHOTS;
  const storeSet = new Set(storeVersions);
  const pinned = new Set(manifest.pinnedVersions ?? []);
  const active = pointer.activeVersion?.trim() ?? "";
  const previous = pointer.previousVersion?.trim() ?? "";

  const retention: Record<string, SnapshotRetentionClass> = {
    ...(manifest.retention ?? {}),
  };

  for (const version of storeVersions) {
    if (version === active) {
      retention[version] = "active";
    } else if (version === previous && previous !== active) {
      retention[version] = "previous_safe";
    } else if (pinned.has(version)) {
      retention[version] = "pinned";
    } else if (!retention[version]) {
      retention[version] = "archived";
    }
  }

  const requiredBundle = new Set<string>();
  if (active && storeSet.has(active)) requiredBundle.add(active);
  if (previous && storeSet.has(previous)) requiredBundle.add(previous);
  for (const version of pinned) {
    if (storeSet.has(version)) requiredBundle.add(version);
  }

  const candidates = sortVersionsByRecency(
    manifest.versions.length > 0 ? manifest.versions : storeVersions,
  ).filter((version) => storeSet.has(version));

  const bundleSet = new Set<string>(requiredBundle);
  for (const version of candidates) {
    if (bundleSet.size >= maxBundled) break;
    bundleSet.add(version);
  }

  const rollbackSet = new Set<string>(requiredBundle);
  for (const version of pinned) {
    if (storeSet.has(version)) rollbackSet.add(version);
  }
  for (const version of candidates) {
    if (rollbackSet.size >= minRollbackBuffer) break;
    rollbackSet.add(version);
  }
  if (previous && storeSet.has(previous)) rollbackSet.add(previous);

  const bundleVersions = uniqueSorted([...bundleSet]);
  const rollbackSafeVersions = uniqueSorted([...rollbackSet]);
  const bundleVersionSet = new Set(bundleVersions);
  const rollbackOnlyVersions = rollbackSafeVersions.filter((version) => !bundleVersionSet.has(version));

  return {
    retention,
    bundleVersions,
    rollbackSafeVersions,
    rollbackOnlyVersions,
  };
}

export function selectVersionsForBundleFromLifecycle(
  storeVersions: string[],
  pointer: SelectorSnapshotPointer,
  manifest: SelectorSnapshotManifest,
): string[] {
  return classifySnapshotVersions(storeVersions, pointer, manifest).bundleVersions;
}
