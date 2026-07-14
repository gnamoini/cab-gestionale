import { buildGestionaleNav, type GestionaleNavHref } from "@/components/gestionale/gestionale-nav-config";
import { GESTIONALE_PAGES } from "@/src/lib/permissions/gestionale-pages";
import { isStagingBlockedPathname, isStagingPublicSlice } from "@/lib/env/staging-public";
import {
  ACCESS_DENIED_PATH,
  CLIENTE_HOME_PATH,
  defaultHomePathForRole,
  isClienteRole,
  resolveFirstAccessiblePageHrefFromResolved,
  type RbacUser,
} from "@/lib/auth/rbac";
import type { RbacNavAccess, RbacSnapshotBound } from "@/src/lib/rbac/rbac-snapshot-access";

/** Normalizza path `from` (sicurezza base, senza default). */
export function sanitizePostLoginRequestedPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login")) return null;
  if (trimmed === ACCESS_DENIED_PATH || trimmed.startsWith(`${ACCESS_DENIED_PATH}/`)) return null;
  return trimmed;
}

function stagingBlocksRedirect(path: string): boolean {
  if (!isStagingPublicSlice()) return false;
  const pathOnly = path.split("?")[0] ?? path;
  return isStagingBlockedPathname(pathOnly);
}

/** Prima voce menu accessibile (ordine `GESTIONALE_NAV`), esclusi staging disabilitati. */
export function resolveFirstAccessibleNavHref(
  navAccess: RbacNavAccess,
  snapshot: RbacSnapshotBound,
): string {
  const items = buildGestionaleNav(snapshot.resolved, {
    hidePageKey: (pageKey) => navAccess.shouldHidePageKey(pageKey),
  });
  const first = items.find((item) => !item.disabled && navAccess.canAccessHref(item.href));
  return first?.href ?? resolveFirstAccessiblePageHrefFromResolved(snapshot.resolved);
}

export type ResolvePostLoginRedirectInput = {
  user: RbacUser | null;
  navAccess: RbacNavAccess | null;
  /** Query `from` o deep link esplicito post-login. */
  requestedPath?: string | null;
} & { snapshot?: RbacSnapshotBound | null };

/**
 * Destinazione post-login: deep link consentito, altrimenti prima pagina del menu,
 * fallback home per ruolo.
 */
export function resolvePostLoginRedirectPath(input: ResolvePostLoginRedirectInput): string {
  if (!input.user) return ACCESS_DENIED_PATH;

  if (isClienteRole(input.user)) {
    const requested = sanitizePostLoginRequestedPath(input.requestedPath);
    if (
      requested &&
      !stagingBlocksRedirect(requested) &&
      (requested === CLIENTE_HOME_PATH || requested.startsWith(`${CLIENTE_HOME_PATH}/`)) &&
      (!input.navAccess || input.navAccess.canAccessRoute(requested))
    ) {
      return requested;
    }
    return CLIENTE_HOME_PATH;
  }

  if (!input.navAccess || !input.snapshot) {
    return defaultHomePathForRole(input.user);
  }

  const requested = sanitizePostLoginRequestedPath(input.requestedPath);
  if (
    requested &&
    !stagingBlocksRedirect(requested) &&
    input.navAccess.canAccessRoute(requested)
  ) {
    return requested;
  }

  return resolveFirstAccessibleNavHref(input.navAccess, input.snapshot);
}
