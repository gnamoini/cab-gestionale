import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";

let stickySnapshot: EffectivePermissionsSnapshot | null = null;

export function readStickyRbacSnapshot(): EffectivePermissionsSnapshot | null {
  return stickySnapshot;
}

export function publishStickyRbacSnapshot(snapshot: EffectivePermissionsSnapshot | null): void {
  if (snapshot && isRbacSnapshotReady(snapshot)) {
    stickySnapshot = snapshot;
  }
}

export function clearStickyRbacSnapshot(): void {
  stickySnapshot = null;
}
