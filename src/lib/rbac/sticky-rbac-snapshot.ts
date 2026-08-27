import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import { resolveRole } from "@/lib/auth/rbac";

let stickySnapshot: EffectivePermissionsSnapshot | null = null;

export function readStickyRbacSnapshot(): EffectivePermissionsSnapshot | null {
  return stickySnapshot;
}

export function publishStickyRbacSnapshot(snapshot: EffectivePermissionsSnapshot | null): void {
  if (!snapshot) return;
  if (snapshot.permissionsHydrated) {
    stickySnapshot = snapshot;
    return;
  }
  // ponytail: admin bypass hydration — allineato a permission-guards snapshotAllows
  if (resolveRole(snapshot.roleKey ?? snapshot.role) === "admin") {
    stickySnapshot = snapshot;
  }
}

export function clearStickyRbacSnapshot(): void {
  stickySnapshot = null;
}
