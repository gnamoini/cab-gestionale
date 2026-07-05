/**
 * RBAC gestionale — routing e re-export dal resolver pagina (SSOT).
 */

import {
  CANONICAL_ROLES,
  type AppRole,
  type CanonicalRole,
  RBAC_DENIED_MESSAGE,
  resolveCanonicalRole,
  resolveRole,
  ROLE_LABELS,
} from "@/lib/rbac";
import {
  ACCESS_DENIED_PATH,
  CLIENTE_HOME_PATH,
  getGestionalePage,
  GESTIONALE_PAGES,
  pathnameToPage,
  SECURITY_HOME_PATH,
  type GestionalePageKey,
} from "@/src/lib/permissions/gestionale-pages";
import {
  canAccessPathname,
  canReadPage,
  canWritePage,
  canWritePathname,
  getPageAccess,
  isPageVisible,
  moduleAllowsFromResolved,
  pathnameToPageAccess,
  resolvePageAccess,
  type PageAccess,
  type ResolvedPageAccess,
} from "@/src/lib/rbac/resolve-page-access";

export {
  CANONICAL_ROLES,
  type AppRole,
  type CanonicalRole,
  RBAC_DENIED_MESSAGE,
  resolveCanonicalRole,
  resolveRole,
  ROLE_LABELS,
  ACCESS_DENIED_PATH,
  CLIENTE_HOME_PATH,
  SECURITY_HOME_PATH,
  GESTIONALE_PAGES,
  pathnameToPage,
  resolvePageAccess,
  getPageAccess,
  canReadPage,
  canWritePage,
  isPageVisible,
  pathnameToPageAccess,
  canAccessPathname,
  canWritePathname,
  moduleAllowsFromResolved,
  type GestionalePageKey,
  type PageAccess,
  type ResolvedPageAccess,
};

export const APP_ROLES = CANONICAL_ROLES;
export const normalizeRole = resolveRole;
export const READONLY_PERMISSION_HINT = RBAC_DENIED_MESSAGE;

export type RbacEvaluationContext = {
  operatorGlobalSettingsDbEnabled?: boolean;
  resolved?: ResolvedPageAccess;
};

export type RequiredRbacContext = RbacEvaluationContext & {
  resolved: ResolvedPageAccess;
};

export type RbacUser =
  | { ruolo?: string | null; roleKey?: string | null; id?: string | null }
  | string
  | null
  | undefined;

export function roleLabel(user: RbacUser): string {
  return ROLE_LABELS[resolveRole(user)];
}

export function isClienteRole(user: RbacUser): boolean {
  return resolveRole(user) === "cliente";
}

export function defaultHomePathForRole(user: RbacUser): string {
  return isClienteRole(user) ? CLIENTE_HOME_PATH : getGestionalePage("dashboard")!.href;
}

export function accessDeniedRedirectPath(user: RbacUser): string {
  return `${ACCESS_DENIED_PATH}?from=${encodeURIComponent(defaultHomePathForRole(user))}`;
}

export function canAccessPage(pathname: string, ctx: RequiredRbacContext): boolean {
  return canAccessPathname(ctx.resolved, pathname);
}

export function shouldHideNavPage(pageKey: GestionalePageKey, ctx: RequiredRbacContext): boolean {
  return !isPageVisible(ctx.resolved, pageKey);
}

export function isReadOnlyRole(user: RbacUser): boolean {
  const role = resolveRole(user);
  return role === "guest" || role === "cliente";
}

export function isPathAllowedForCliente(pathname: string, ctx: RequiredRbacContext): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  return canAccessPathname(ctx.resolved, pathname);
}

const LEGACY_SECTION_TO_PAGE: Record<string, GestionalePageKey> = {
  dashboard: "dashboard",
  lavorazioni: "lavorazioni",
  lavorazioni_clienti: "lavorazioni_clienti",
  preventivi: "preventivi",
  documenti: "documenti",
  magazzino: "magazzino",
  mezzi: "mezzi",
  report: "report",
  dipendenti: "dipendenti",
  fatturazione: "fatturazione",
  ddt: "preventivi",
  ordini_fornitori: "preventivi",
  impostazioni: "impostazioni",
  security: "sicurezza",
  agenda: "agenda",
};

/** @deprecated Usare canReadPage — compat sezioni legacy. */
export function canRead(_user: RbacUser, section: string, ctx: RequiredRbacContext): boolean {
  const key = LEGACY_SECTION_TO_PAGE[section];
  return key ? canReadPage(ctx.resolved, key) : false;
}

/** @deprecated Usare canWritePage — compat sezioni legacy. */
export function canWrite(_user: RbacUser, section: string, ctx: RequiredRbacContext): boolean {
  const key = LEGACY_SECTION_TO_PAGE[section];
  return key ? canWritePage(ctx.resolved, key) : false;
}

/** @deprecated Usare canWritePage — delete = write. */
export function canDelete(_user: RbacUser, section: string, ctx: RequiredRbacContext): boolean {
  return canWrite(_user, section, ctx);
}

export function shouldHideNavHref(_user: RbacUser, href: string, _opts: unknown, ctx: RequiredRbacContext): boolean {
  const page = pathnameToPage(href);
  if (!page) return false;
  return !isPageVisible(ctx.resolved, page.key as GestionalePageKey);
}

export type RbacSection = keyof typeof LEGACY_SECTION_TO_PAGE;

export type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
