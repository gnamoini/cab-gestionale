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
  canAccessBunder,
  hasCapability,
  RBAC_DENIED_MESSAGE,
  resolveCanonicalRole,
  resolveRole,
  roleModuleDefault,
} from "@/lib/rbac";

export {
  CANONICAL_ROLES,
  type AppRole,
  type CanonicalRole,
  type Capability,
  type RbacEvaluationContext,
  canAccessBunder,
  hasCapability,
  RBAC_DENIED_MESSAGE,
  resolveCanonicalRole,
  resolveRole,
  roleModuleDefault,
};
export const APP_ROLES = CANONICAL_ROLES;
export const normalizeRole = resolveRole;

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
  | "bunder"
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

function moduleSectionAccess(user: RbacUser, section: RbacSection): SectionAccess {
  const module = SECTION_TO_MODULE[section];
  if (!module) {
    return { read: false, write: false, delete: false };
  }
  const perm = roleModuleDefault(resolveRole(user), module);
  return {
    read: perm.canRead,
    write: perm.canWrite,
    delete: perm.canWrite,
  };
}

function sectionAccess(user: RbacUser, section: RbacSection, ctx?: RbacEvaluationContext): SectionAccess {
  if (section === "impostazioni") {
    const s = hasCapability(user, "can_manage_settings", ctx);
    return { read: s, write: s, delete: s };
  }
  if (section === "security") {
    const s = hasCapability(user, "can_manage_security", ctx);
    return { read: s, write: s, delete: s };
  }
  if (section === "lavorazioni_clienti") {
    const r = hasCapability(user, "can_access_client_area", ctx);
    return { read: r, write: false, delete: false };
  }
  if (section === "dashboard") {
    const read = hasCapability(user, "can_read_operational", ctx);
    return { read, write: false, delete: false };
  }
  if (section === "bunder") {
    const read = canAccessBunder(user, "read");
    const write = canAccessBunder(user, "write");
    return { read, write, delete: write };
  }
  if (SECTION_TO_MODULE[section]) {
    return moduleSectionAccess(user, section);
  }
  return { read: false, write: false, delete: false };
}

/** Derivate da capability + matrice moduli. */
export function hasPermission(user: RbacUser, permission: PermissionKey, ctx?: RbacEvaluationContext): boolean {
  switch (permission) {
    case "manageUsers":
    case "manageSecurity":
      return hasCapability(user, "can_manage_security", ctx);
    case "manageSettings":
      return hasCapability(user, "can_manage_settings", ctx);
    case "editInventory":
      return canWrite(user, "magazzino", ctx);
    case "editWorkOrders":
      return canWrite(user, "lavorazioni", ctx);
    case "editVehicles":
      return canWrite(user, "mezzi", ctx);
    case "uploadDocuments":
      return canWrite(user, "documenti", ctx);
    case "deleteRecords":
      return hasCapability(user, "can_write_operational", ctx) && resolveRole(user) !== "guest";
    case "viewReports":
      return canRead(user, "report", ctx);
    case "viewAuditLogs":
      return hasCapability(user, "can_manage_security", ctx);
    case "viewClientLavorazioni":
      return hasCapability(user, "can_access_client_area", ctx);
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
  role: string | null | undefined,
  _userId?: string | null | undefined,
  _settingsEnabledUserIds?: string[],
): boolean {
  return hasPermission(role, "viewClientLavorazioni");
}

export function isClienteRole(user: RbacUser): boolean {
  return resolveRole(user) === "cliente";
}

export function roleLabel(user: RbacUser): string {
  const role = resolveRole(user);
  if (role === "admin") return "Admin System";
  if (role === "manager") return "Admin Operativo";
  if (role === "operatore") return "Personale Officina";
  if (role === "addetto_amministrativo") return "Addetto Preventivi";
  if (role === "cliente") return "Cliente";
  return "Viewer / Audit";
}

export function defaultHomePathForRole(user: RbacUser): string {
  return isClienteRole(user) ? CLIENTE_HOME_PATH : "/dashboard";
}

export function pathnameToSection(pathname: string): RbacSection | null {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (path === ACCESS_DENIED_PATH) return null;
  if (path === "/login" || path.startsWith("/login/")) return null;
  if (path.startsWith("/dashboard/security")) return "security";
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "dashboard";
  if (path.startsWith("/lavorazioni-clienti")) return "lavorazioni_clienti";
  if (path.startsWith("/lavorazioni")) return "lavorazioni";
  if (path.startsWith("/preventivi")) return "preventivi";
  if (path.startsWith("/documenti")) return "documenti";
  if (path.startsWith("/magazzino")) return "magazzino";
  if (path.startsWith("/mezzi")) return "mezzi";
  if (path.startsWith("/bunder")) return "bunder";
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

export type GestionalePermissionModule =
  | "magazzino"
  | "preventivi"
  | "lavorazioni"
  | "mezzi"
  | "report"
  | "documenti"
  | "dipendenti"
  | "fatturazione"
  | "ddt"
  | "ordini_fornitori";

export function canReadModule(
  user: RbacUser,
  module: GestionalePermissionModule,
  ctx?: RbacEvaluationContext,
): boolean {
  return canRead(user, SECTION_TO_MODULE[module] as RbacSection, ctx);
}

export function canWriteModule(
  user: RbacUser,
  module: GestionalePermissionModule,
  ctx?: RbacEvaluationContext,
): boolean {
  return canWrite(user, SECTION_TO_MODULE[module] as RbacSection, ctx);
}

export function modulePermissionForRole(
  user: RbacUser,
  module: GestionalePermissionModule,
  _ctx?: RbacEvaluationContext,
): { canRead: boolean; canWrite: boolean } {
  const d = roleModuleDefault(resolveRole(user), module);
  return { canRead: d.canRead, canWrite: d.canWrite };
}

export function isReadOnlyRole(user: RbacUser): boolean {
  const role = resolveRole(user);
  return role === "guest" || role === "cliente";
}

export function canWriteAnyOperational(user: RbacUser, ctx?: RbacEvaluationContext): boolean {
  return hasCapability(user, "can_write_operational", ctx);
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
