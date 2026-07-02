/**
 * RBAC gestionale — routing, sezioni UI, compat layer.
 * Capability + moduli ERP: @/lib/rbac.ts (single source of truth frontend).
 */

import {
  CANONICAL_ROLES,
  type AppRole,
  type CanonicalRole,
  type Capability,
  type RbacEvaluationContext,
  RBAC_DENIED_MESSAGE,
  resolveCanonicalRole,
  resolveRole,
  ROLE_LABELS,
} from "@/lib/rbac";
import {
  canReadModule as resolvedCanReadModule,
  canWriteModule as resolvedCanWriteModule,
  hasResolvedCapability,
} from "@/src/lib/rbac/resolve-user-permissions";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

export {
  CANONICAL_ROLES,
  type AppRole,
  type CanonicalRole,
  type Capability,
  type RbacEvaluationContext,
  RBAC_DENIED_MESSAGE,
  resolveCanonicalRole,
  resolveRole,
  ROLE_LABELS,
};
export const APP_ROLES = CANONICAL_ROLES;
export const normalizeRole = resolveRole;

function capFromCtx(ctx: RbacEvaluationContext | undefined, cap: Capability): boolean {
  if (ctx?.resolved) return hasResolvedCapability(ctx.resolved, cap);
  return false;
}

export type PermissionKey =
  | "manageUsers"
  | "manageSecurity"
  | "manageSettings"
  | "editInventory"
  | "editWorkOrders"
  | "editVehicles"
  | "uploadDocuments"
  | "deleteRecords"
  | "viewReports"
  | "viewAuditLogs"
  | "viewClientLavorazioni";

export type RbacSection =
  | "dashboard"
  | "lavorazioni"
  | "lavorazioni_clienti"
  | "preventivi"
  | "documenti"
  | "magazzino"
  | "mezzi"
  | "report"
  | "dipendenti"
  | "fatturazione"
  | "ddt"
  | "ordini_fornitori"
  | "impostazioni"
  | "security";

export type SectionAccess = { read: boolean; write: boolean; delete: boolean };

export type RbacUser =
  | { ruolo?: string | null; id?: string | null }
  | string
  | null
  | undefined;

export type CanAccessPageOptions = {
  clientLavorazioniAllowed?: boolean;
};

export const CLIENTE_HOME_PATH = "/lavorazioni-clienti";
export const SECURITY_HOME_PATH = "/sicurezza";
export const ACCESS_DENIED_PATH = "/acesso-negato";
export const READONLY_PERMISSION_HINT = RBAC_DENIED_MESSAGE;

const SECTION_TO_MODULE: Partial<Record<RbacSection, GestionalePermissionModule>> = {
  magazzino: "magazzino",
  preventivi: "preventivi",
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  report: "report",
  documenti: "documenti",
  dipendenti: "dipendenti",
  fatturazione: "fatturazione",
  ddt: "ddt",
  ordini_fornitori: "ordini_fornitori",
};

function moduleSectionAccess(section: RbacSection, ctx?: RbacEvaluationContext): SectionAccess {
  const module = SECTION_TO_MODULE[section];
  if (!module || !ctx?.resolved) {
    return { read: false, write: false, delete: false };
  }
  const read = resolvedCanReadModule(ctx.resolved, module);
  const write = resolvedCanWriteModule(ctx.resolved, module);
  return { read, write, delete: write };
}

function sectionAccess(_user: RbacUser, section: RbacSection, ctx?: RbacEvaluationContext): SectionAccess {
  if (section === "impostazioni") {
    const s = capFromCtx(ctx, "can_manage_settings");
    return { read: s, write: s, delete: s };
  }
  if (section === "security") {
    const s = capFromCtx(ctx, "can_manage_security");
    return { read: s, write: s, delete: s };
  }
  if (section === "lavorazioni_clienti") {
    const r = capFromCtx(ctx, "can_access_client_area");
    return { read: r, write: false, delete: false };
  }
  if (section === "dashboard") {
    const read = capFromCtx(ctx, "can_read_operational");
    return { read, write: false, delete: false };
  }
  if (SECTION_TO_MODULE[section]) {
    return moduleSectionAccess(section, ctx);
  }
  return { read: false, write: false, delete: false };
}

/** Derivate da capability + matrice moduli. */
export function hasPermission(user: RbacUser, permission: PermissionKey, ctx?: RbacEvaluationContext): boolean {
  switch (permission) {
    case "manageUsers":
    case "manageSecurity":
      return capFromCtx(ctx, "can_manage_security");
    case "manageSettings":
      return capFromCtx(ctx, "can_manage_settings");
    case "editInventory":
      return canWrite(user, "magazzino", ctx);
    case "editWorkOrders":
      return canWrite(user, "lavorazioni", ctx);
    case "editVehicles":
      return canWrite(user, "mezzi", ctx);
    case "uploadDocuments":
      return canWrite(user, "documenti", ctx);
    case "deleteRecords":
      return capFromCtx(ctx, "can_write_operational") && resolveRole(user) !== "guest";
    case "viewReports":
      return canRead(user, "report", ctx);
    case "viewAuditLogs":
      return capFromCtx(ctx, "can_manage_security");
    case "viewClientLavorazioni":
      return capFromCtx(ctx, "can_access_client_area");
    default:
      return false;
  }
}

export function canRead(user: RbacUser, section: RbacSection, ctx?: RbacEvaluationContext): boolean {
  return sectionAccess(user, section, ctx).read;
}

export function canWrite(user: RbacUser, section: RbacSection, ctx?: RbacEvaluationContext): boolean {
  return sectionAccess(user, section, ctx).write;
}

export function canDelete(user: RbacUser, section: RbacSection, ctx?: RbacEvaluationContext): boolean {
  return sectionAccess(user, section, ctx).delete;
}

export function resolveClientLavorazioniPortalAccess(
  _role: string | null | undefined,
  _userId?: string | null | undefined,
  _settingsEnabledUserIds?: string[],
  ctx?: RbacEvaluationContext,
): boolean {
  return capFromCtx(ctx, "can_access_client_area");
}

export function isClienteRole(user: RbacUser): boolean {
  return resolveRole(user) === "cliente";
}

export function roleLabel(user: RbacUser): string {
  return ROLE_LABELS[resolveRole(user)];
}

export function defaultHomePathForRole(user: RbacUser): string {
  return isClienteRole(user) ? CLIENTE_HOME_PATH : "/dashboard";
}

export function pathnameToSection(pathname: string): RbacSection | null {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (path === ACCESS_DENIED_PATH) return null;
  if (path === "/login" || path.startsWith("/login/")) return null;
  if (path.startsWith(SECURITY_HOME_PATH)) return "security";
  if (path.startsWith("/dashboard/security")) return "security";
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "dashboard";
  if (path.startsWith("/lavorazioni-clienti")) return "lavorazioni_clienti";
  if (path.startsWith("/lavorazioni")) return "lavorazioni";
  if (path.startsWith("/preventivi")) return "preventivi";
  if (path.startsWith("/documenti")) return "documenti";
  if (path.startsWith("/magazzino")) return "magazzino";
  if (path.startsWith("/mezzi")) return "mezzi";
  if (path.startsWith("/report")) return "report";
  if (path.startsWith("/dipendenti")) return "dipendenti";
  if (path.startsWith("/fatturazione")) return "fatturazione";
  if (path.startsWith("/impostazioni")) return "impostazioni";
  return null;
}

export function canAccessPage(
  user: RbacUser,
  pathname: string,
  opts?: CanAccessPageOptions,
  ctx?: RbacEvaluationContext,
): boolean {
  const section = pathnameToSection(pathname);
  if (!section) return true;

  if (section === "lavorazioni_clienti") {
    if (hasPermission(user, "viewClientLavorazioni", ctx)) return true;
    if (!canRead(user, section, ctx)) return false;
    return opts?.clientLavorazioniAllowed === true;
  }

  if (section === "security") return hasPermission(user, "manageSecurity", ctx);
  if (section === "impostazioni") return hasPermission(user, "manageSettings", ctx);

  return canRead(user, section, ctx);
}

export function accessDeniedRedirectPath(user: RbacUser): string {
  return `${ACCESS_DENIED_PATH}?from=${encodeURIComponent(defaultHomePathForRole(user))}`;
}

export function navHrefToSection(href: string): RbacSection | null {
  return pathnameToSection(href);
}

export type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

export function canReadModule(
  user: RbacUser,
  module: GestionalePermissionModule,
  ctx?: RbacEvaluationContext,
): boolean {
  return modulePermissionForRole(user, module, ctx).canRead;
}

export function canWriteModule(
  user: RbacUser,
  module: GestionalePermissionModule,
  ctx?: RbacEvaluationContext,
): boolean {
  return modulePermissionForRole(user, module, ctx).canWrite;
}

export function modulePermissionForRole(
  _user: RbacUser,
  module: GestionalePermissionModule,
  ctx?: RbacEvaluationContext,
): { canRead: boolean; canWrite: boolean } {
  if (!ctx?.resolved) return { canRead: false, canWrite: false };
  return {
    canRead: resolvedCanReadModule(ctx.resolved, module),
    canWrite: resolvedCanWriteModule(ctx.resolved, module),
  };
}

export function isReadOnlyRole(user: RbacUser): boolean {
  const role = resolveRole(user);
  return role === "guest" || role === "cliente";
}

export function canWriteAnyOperational(_user: RbacUser, ctx?: RbacEvaluationContext): boolean {
  return capFromCtx(ctx, "can_write_operational");
}

export function isPathAllowedForCliente(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  return pathname === CLIENTE_HOME_PATH || pathname.startsWith(`${CLIENTE_HOME_PATH}/`);
}

export function shouldHideNavHref(
  user: RbacUser,
  href: string,
  opts?: { clientLavorazioniAllowed?: boolean },
  ctx?: RbacEvaluationContext,
): boolean {
  const section = pathnameToSection(href);
  if (!section) return false;
  if (section === "lavorazioni_clienti") {
    if (hasPermission(user, "viewClientLavorazioni", ctx)) return false;
    return !opts?.clientLavorazioniAllowed;
  }
  if (section === "security") return !hasPermission(user, "manageSecurity", ctx);
  if (section === "impostazioni") return !hasPermission(user, "manageSettings", ctx);
  return !canRead(user, section, ctx);
}

/** @deprecated Usare hasCapability / ROLE_CAPABILITIES. */
export const ROLE_PERMISSIONS = {} as Record<AppRole, Record<PermissionKey, boolean>>;
export const SECTION_ACCESS = {} as Record<AppRole, Record<RbacSection, SectionAccess>>;
