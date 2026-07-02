import {
  canAccessPage,
  canRead,
  canWrite,
  hasPermission,
  shouldHideNavHref,
  type CanAccessPageOptions,
  type PermissionKey,
  type RequiredRbacContext,
} from "@/lib/auth/rbac";
import type { Capability } from "@/lib/rbac";
import { canReadModule, canWriteModule, hasResolvedCapability } from "@/src/lib/rbac/resolve-user-permissions";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { ResolvedPermissions } from "@/src/lib/rbac/resolve-user-permissions";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

/** Snapshot con resolved obbligatorio — unico input per controlli runtime. */
export type RbacSnapshotBound = EffectivePermissionsSnapshot & {
  resolved: ResolvedPermissions;
};

export function isRbacSnapshotReady(
  snap: EffectivePermissionsSnapshot | null | undefined,
): snap is RbacSnapshotBound {
  return snap?.resolved != null;
}

export type RbacNavAccess = {
  shouldHideHref: (href: string) => boolean;
  canAccessHref: (href: string) => boolean;
  canAccessRoute: (pathname: string) => boolean;
};

export function createRbacNavAccess(
  snap: RbacSnapshotBound,
  opts?: CanAccessPageOptions,
): RbacNavAccess {
  const ctx = snap.rbacContext as RequiredRbacContext;
  const user = snap.role;
  return {
    shouldHideHref: (href) => shouldHideNavHref(user, href, opts, ctx),
    canAccessHref: (href) => canAccessPage(user, href, opts, ctx),
    canAccessRoute: (pathname) => canAccessRoute({ user, pathname, opts, snapshot: snap }),
  };
}

export function snapshotHasPermission(snap: RbacSnapshotBound, permission: PermissionKey): boolean {
  return hasPermission(snap.role, permission, snap.rbacContext as RequiredRbacContext);
}

export function snapshotHasCapability(snap: RbacSnapshotBound, capability: Capability): boolean {
  return hasResolvedCapability(snap.resolved, capability);
}

export function snapshotCanReadModule(snap: RbacSnapshotBound, module: GestionalePermissionModule): boolean {
  return canReadModule(snap.resolved, module);
}

export function snapshotCanWriteModule(snap: RbacSnapshotBound, module: GestionalePermissionModule): boolean {
  return canWriteModule(snap.resolved, module);
}

export function snapshotCanReadSection(
  snap: RbacSnapshotBound,
  section: Parameters<typeof canRead>[1],
): boolean {
  return canRead(snap.role, section, snap.rbacContext as RequiredRbacContext);
}

export function snapshotCanWriteSection(
  snap: RbacSnapshotBound,
  section: Parameters<typeof canWrite>[1],
): boolean {
  return canWrite(snap.role, section, snap.rbacContext as RequiredRbacContext);
}

/** Bootstrap snapshot (login redirect) — admin bypass; altri ruoli fail-closed fino a hydration DB. */
export function buildBootstrapRbacSnapshot(userId: string, roleKey: string): RbacSnapshotBound {
  const snap = resolveEffectivePermissions({
    userId,
    roleKey,
    rolePermissionKeys: [],
    permissionRows: [],
    pilotDbEnabled: false,
  });
  if (!isRbacSnapshotReady(snap)) {
    throw new Error("buildBootstrapRbacSnapshot: resolved snapshot required");
  }
  return snap;
}
