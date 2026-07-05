import type { ResolvedPageAccess } from "@/src/lib/rbac/resolve-page-access";
import {
  canAccessPathname,
  canReadPage,
  canWritePage,
  getPageAccess,
  isPageVisible,
  pathnameToPageAccess,
} from "@/src/lib/rbac/resolve-page-access";
import { pathnameToPage, type GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

export type RbacSnapshotBound = EffectivePermissionsSnapshot & {
  resolved: ResolvedPageAccess;
};

export function isRbacSnapshotReady(
  snap: EffectivePermissionsSnapshot | null | undefined,
): snap is RbacSnapshotBound {
  return snap?.resolved != null;
}

export type RbacNavAccess = {
  shouldHidePageKey: (pageKey: GestionalePageKey) => boolean;
  /** @deprecated Usare shouldHidePageKey */
  shouldHideHref: (href: string) => boolean;
  canAccessHref: (href: string) => boolean;
  canAccessRoute: (pathname: string) => boolean;
};

export function createRbacNavAccess(snap: RbacSnapshotBound): RbacNavAccess {
  const { resolved } = snap;
  return {
    shouldHidePageKey: (pageKey) => !isPageVisible(resolved, pageKey),
    shouldHideHref: (href) => {
      const page = pathnameToPage(href);
      if (!page) return false;
      return !isPageVisible(resolved, page.key as GestionalePageKey);
    },
    canAccessHref: (href) => canAccessPathname(resolved, href),
    canAccessRoute: (pathname) => canAccessPathname(resolved, pathname),
  };
}

export function snapshotCanReadPage(snap: RbacSnapshotBound, pageKey: GestionalePageKey): boolean {
  return canReadPage(snap.resolved, pageKey);
}

/** Portale clienti — accesso pagina. */
export function snapshotHasPageRead(snap: RbacSnapshotBound, pageKey: GestionalePageKey): boolean {
  return snapshotCanReadPage(snap, pageKey);
}

export function snapshotCanWritePage(snap: RbacSnapshotBound, pageKey: GestionalePageKey): boolean {
  return canWritePage(snap.resolved, pageKey);
}

export function snapshotPageAccess(snap: RbacSnapshotBound, pageKey: GestionalePageKey) {
  return getPageAccess(snap.resolved, pageKey);
}

export function snapshotPathAccess(snap: RbacSnapshotBound, pathname: string) {
  return pathnameToPageAccess(snap.resolved, pathname);
}

import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";

/** Bootstrap snapshot (login redirect) — fail-closed fino a hydration DB. */
export function buildBootstrapRbacSnapshot(userId: string, roleKey: string): RbacSnapshotBound {
  const snap = resolveEffectivePermissions({
    userId,
    roleKey,
    rolePageAccess: {},
    userPageOverrideRows: [],
    pilotDbEnabled: false,
  });
  if (!isRbacSnapshotReady(snap)) {
    throw new Error("buildBootstrapRbacSnapshot: resolved snapshot required");
  }
  return snap;
}
