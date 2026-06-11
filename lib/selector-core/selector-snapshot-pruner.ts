/**
 * @advisory v5.3.2 — bounded bundle version selection via lifecycle manager.
 */
import { selectVersionsForBundleFromLifecycle } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import type { SelectorSnapshotManifest, SelectorSnapshotPointer } from "@/lib/selector-core/types";

export const MAX_BUNDLED_SNAPSHOTS = 5;

const SNAP_NUMERIC = /^snap-(\d+)$/i;

export function compareSnapshotVersionRecency(a: string, b: string): number {
  const aMatch = SNAP_NUMERIC.exec(a);
  const bMatch = SNAP_NUMERIC.exec(b);
  if (aMatch && bMatch) {
    return Number(bMatch[1]) - Number(aMatch[1]);
  }
  if (aMatch) return -1;
  if (bMatch) return 1;
  return b.localeCompare(a);
}

export function sortVersionsByRecency(versions: string[]): string[] {
  return [...versions].sort(compareSnapshotVersionRecency);
}

export function selectVersionsForBundle(
  storeVersions: string[],
  pointer: SelectorSnapshotPointer,
  manifest: SelectorSnapshotManifest,
): string[] {
  return selectVersionsForBundleFromLifecycle(storeVersions, pointer, manifest);
}
