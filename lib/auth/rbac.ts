/**
 * RBAC centralizzato — single source of truth per ruoli e permessi del gestionale.
 * Allineato a `public.ruolo_utente` (admin | operatore | ospite | cliente).
 */

export const APP_ROLES = ["admin", "operatore", "ospite", "cliente"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Valori legacy DB / JWT — normalizzati verso APP_ROLES. */
const LEGACY_ROLE_TO_APP: Record<string, AppRole> = {
  tecnico: "operatore",
  viewer: "ospite",
  sola_lettura: "ospite",
  magazziniere: "operatore",
  commerciale: "operatore",
};

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
  | "supporto"
  | "impostazioni"
  | "security";

export type SectionAccess = {
  read: boolean;
  write: boolean;
  delete: boolean;
};

export type RbacUser =
  | { ruolo?: string | null; id?: string | null }
  | string
  | null
  | undefined;

export type CanAccessPageOptions = {
  /** Portale lavorazioni clienti: permesso RBAC o utente abilitato in Sicurezza. */
  clientLavorazioniAllowed?: boolean;
};

/** Valuta accesso portale clienti (middleware / guard). */
export function resolveClientLavorazioniPortalAccess(
  role: string | null | undefined,
  userId: string | null | undefined,
  settingsEnabledUserIds: string[],
): boolean {
  if (hasPermission(role, "viewClientLavorazioni")) return true;
  if (!userId?.trim()) return false;
  return settingsEnabledUserIds.includes(userId);
}

export const CLIENTE_HOME_PATH = "/lavorazioni-clienti";
export const ACCESS_DENIED_PATH = "/acesso-negato";
export const READONLY_PERMISSION_HINT = "Permesso richiesto";

/** Permessi granulari (servizi, audit, azioni puntuali). */
export const ROLE_PERMISSIONS: Record<AppRole, Record<PermissionKey, boolean>> = {
  admin: {
    manageUsers: true,
    manageSecurity: true,
    manageSettings: true,
    editInventory: true,
    editWorkOrders: true,
    editVehicles: true,
    uploadDocuments: true,
    deleteRecords: true,
    viewReports: true,
    viewAuditLogs: true,
    viewClientLavorazioni: true,
  },
  operatore: {
    manageUsers: false,
    manageSecurity: false,
    manageSettings: false,
    editInventory: true,
    editWorkOrders: true,
    editVehicles: true,
    uploadDocuments: true,
    deleteRecords: false,
    viewReports: true,
    viewAuditLogs: false,
    viewClientLavorazioni: false,
  },
  ospite: {
    manageUsers: false,
    manageSecurity: false,
    manageSettings: false,
    editInventory: false,
    editWorkOrders: false,
    editVehicles: false,
    uploadDocuments: false,
    deleteRecords: false,
    viewReports: true,
    viewAuditLogs: false,
    viewClientLavorazioni: false,
  },
  cliente: {
    manageUsers: false,
    manageSecurity: false,
    manageSettings: false,
    editInventory: false,
    editWorkOrders: false,
    editVehicles: false,
    uploadDocuments: false,
    deleteRecords: false,
    viewReports: false,
    viewAuditLogs: false,
    viewClientLavorazioni: true,
  },
};

/** Matrice accesso sezioni (pagine / moduli UI). */
export const SECTION_ACCESS: Record<AppRole, Record<RbacSection, SectionAccess>> = {
  admin: fullSectionAccess(true),
  operatore: {
    dashboard: { read: true, write: true, delete: false },
    lavorazioni: { read: true, write: true, delete: false },
    lavorazioni_clienti: { read: true, write: false, delete: false },
    preventivi: { read: true, write: true, delete: false },
    documenti: { read: true, write: true, delete: false },
    magazzino: { read: true, write: true, delete: false },
    mezzi: { read: true, write: true, delete: false },
    bunder: { read: true, write: true, delete: false },
    report: { read: true, write: false, delete: false },
    supporto: { read: true, write: true, delete: false },
    impostazioni: { read: false, write: false, delete: false },
    security: { read: false, write: false, delete: false },
  },
  ospite: {
    dashboard: { read: true, write: false, delete: false },
    lavorazioni: { read: true, write: false, delete: false },
    lavorazioni_clienti: { read: true, write: false, delete: false },
    preventivi: { read: true, write: false, delete: false },
    documenti: { read: true, write: false, delete: false },
    magazzino: { read: true, write: false, delete: false },
    mezzi: { read: true, write: false, delete: false },
    bunder: { read: true, write: false, delete: false },
    report: { read: true, write: false, delete: false },
    supporto: { read: true, write: true, delete: false },
    impostazioni: { read: false, write: false, delete: false },
    security: { read: false, write: false, delete: false },
  },
  cliente: {
    dashboard: { read: false, write: false, delete: false },
    lavorazioni: { read: false, write: false, delete: false },
    lavorazioni_clienti: { read: true, write: false, delete: false },
    preventivi: { read: false, write: false, delete: false },
    documenti: { read: false, write: false, delete: false },
    magazzino: { read: false, write: false, delete: false },
    mezzi: { read: false, write: false, delete: false },
    bunder: { read: false, write: false, delete: false },
    report: { read: false, write: false, delete: false },
    supporto: { read: false, write: false, delete: false },
    impostazioni: { read: false, write: false, delete: false },
    security: { read: false, write: false, delete: false },
  },
};

function fullSectionAccess(all: boolean): Record<RbacSection, SectionAccess> {
  const access: SectionAccess = { read: all, write: all, delete: all };
  return {
    dashboard: access,
    lavorazioni: access,
    lavorazioni_clienti: access,
    preventivi: access,
    documenti: access,
    magazzino: access,
    mezzi: access,
    bunder: access,
    report: access,
    supporto: access,
    impostazioni: access,
    security: access,
  };
}

function roleFromUser(user: RbacUser): string | null {
  if (user == null) return null;
  if (typeof user === "string") return user;
  return user.ruolo ?? null;
}

/** Normalizza qualsiasi valore `ruolo_utente` (inclusi legacy DB) verso APP_ROLES. */
export function resolveRole(user: RbacUser): AppRole {
  const raw = roleFromUser(user);
  if (!raw) return "ospite";
  if ((APP_ROLES as readonly string[]).includes(raw)) return raw as AppRole;
  return LEGACY_ROLE_TO_APP[raw] ?? "ospite";
}

/** @deprecated Usare `resolveRole`. */
export const normalizeRole = resolveRole;

export function isClienteRole(user: RbacUser): boolean {
  return resolveRole(user) === "cliente";
}

export function roleLabel(user: RbacUser): string {
  const role = resolveRole(user);
  if (role === "admin") return "Admin";
  if (role === "operatore") return "Operatore";
  if (role === "cliente") return "Cliente";
  return "Ospite";
}

export function defaultHomePathForRole(user: RbacUser): string {
  return isClienteRole(user) ? CLIENTE_HOME_PATH : "/dashboard";
}

export function hasPermission(user: RbacUser, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[resolveRole(user)][permission];
}

function sectionAccess(user: RbacUser, section: RbacSection): SectionAccess {
  return SECTION_ACCESS[resolveRole(user)][section];
}

export function canRead(user: RbacUser, section: RbacSection): boolean {
  return sectionAccess(user, section).read;
}

export function canWrite(user: RbacUser, section: RbacSection): boolean {
  return sectionAccess(user, section).write;
}

export function canDelete(user: RbacUser, section: RbacSection): boolean {
  return sectionAccess(user, section).delete;
}

/** Percorso URL → sezione RBAC. */
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
  if (path.startsWith("/supporto")) return "supporto";
  if (path.startsWith("/impostazioni")) return "impostazioni";
  return null;
}

export function canAccessPage(user: RbacUser, pathname: string, opts?: CanAccessPageOptions): boolean {
  const section = pathnameToSection(pathname);
  if (!section) return true;

  const role = resolveRole(user);

  if (section === "lavorazioni_clienti") {
    if (hasPermission(user, "viewClientLavorazioni")) return true;
    if (!canRead(user, section)) return false;
    return opts?.clientLavorazioniAllowed === true;
  }

  if (section === "security") return hasPermission(user, "manageSecurity");
  if (section === "impostazioni") return hasPermission(user, "manageSettings");

  return canRead(user, section);
}

export function accessDeniedRedirectPath(user: RbacUser): string {
  return `${ACCESS_DENIED_PATH}?from=${encodeURIComponent(defaultHomePathForRole(user))}`;
}

/** Compat: nav href → sezione (ex gestionaleNavHrefToModule). */
export function navHrefToSection(href: string): RbacSection | null {
  return pathnameToSection(href);
}

/** Compat moduli ERP granulari → sezione RBAC. */
export type GestionalePermissionModule =
  | "magazzino"
  | "preventivi"
  | "lavorazioni"
  | "mezzi"
  | "report"
  | "documenti";

const MODULE_TO_SECTION: Record<GestionalePermissionModule, RbacSection> = {
  magazzino: "magazzino",
  preventivi: "preventivi",
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  report: "report",
  documenti: "documenti",
};

export function canReadModule(user: RbacUser, module: GestionalePermissionModule): boolean {
  return canRead(user, MODULE_TO_SECTION[module]);
}

export function canWriteModule(user: RbacUser, module: GestionalePermissionModule): boolean {
  return canWrite(user, MODULE_TO_SECTION[module]);
}

export function modulePermissionForRole(
  user: RbacUser,
  module: GestionalePermissionModule,
): { canRead: boolean; canWrite: boolean; canAdmin: boolean } {
  const section = MODULE_TO_SECTION[module];
  const role = resolveRole(user);
  return {
    canRead: canRead(user, section),
    canWrite: canWrite(user, section),
    canAdmin: role === "admin",
  };
}

export function isReadOnlyRole(user: RbacUser): boolean {
  const role = resolveRole(user);
  return role === "ospite" || role === "cliente";
}

export function canWriteAnyOperational(user: RbacUser): boolean {
  const role = resolveRole(user);
  return role === "admin" || role === "operatore";
}

/** @deprecated Usare `canAccessPage` con scope cliente. */
export function isPathAllowedForCliente(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  return pathname === CLIENTE_HOME_PATH || pathname.startsWith(`${CLIENTE_HOME_PATH}/`);
}

export function shouldHideNavHref(
  user: RbacUser,
  href: string,
  opts?: { clientLavorazioniAllowed?: boolean; clientLavorazioniLoading?: boolean },
): boolean {
  if (opts?.clientLavorazioniLoading && href.startsWith("/lavorazioni-clienti")) return true;
  const section = pathnameToSection(href);
  if (!section) return false;
  if (section === "lavorazioni_clienti") {
    if (hasPermission(user, "viewClientLavorazioni")) return false;
    return !opts?.clientLavorazioniAllowed;
  }
  if (section === "security") return !hasPermission(user, "manageSecurity");
  if (section === "impostazioni") return !hasPermission(user, "manageSettings");
  return !canRead(user, section);
}
