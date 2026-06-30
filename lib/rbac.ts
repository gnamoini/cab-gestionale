/**
 * RBAC capability — single source of truth (frontend).
 * Allineato a public.rbac_has_capability() e user_effective_can() in Supabase.
 *
 * RBAC_PRECEDENCE — ordine di valutazione permessi (identico TS e SQL)
 *
 * 0. CLIENTE SANDBOX (middleware only)
 *    isPathAllowedForCliente → domini staff bloccati prima di ogni valutazione
 *
 * 1. HARD CAPABILITY / ROLE GATE (non overridabili, non in user_permissions)
 *    - security      → can_manage_security
 *    - impostazioni  → can_manage_settings
 *    - portale       → can_access_client_area (+ sandbox cliente)
 *    - bunder        → canAccessBunder(op) / rbac_bunder_can(op)
 *    - dashboard     → can_read_operational (staff only, derived, non overridabile)
 *    - admin bypass  → admin = allow (eccetto domini cliente sandbox)
 *
 * 2. user_permissions (override per modulo ERP, se riga presente)
 *    - solo i 9 moduli in GESTIONALE_PERMISSION_MODULES
 *    - mai bunder, dashboard, security, impostazioni, portale
 *
 * 3. ROLE MODULE FALLBACK (per i 9 moduli ERP)
 *    - guest            → guestAuditModuleDefault() — read ALL modules, write NEVER
 *    - altri ruoli staff → ROLE_MODULE_DEFAULTS[role][module] (area-scoped)
 *
 * 4. DEFAULT DENY
 */

import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";

export const CANONICAL_ROLES = [
  "admin",
  "manager",
  "operatore",
  "addetto_amministrativo",
  "cliente",
  "guest",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

export const CAPABILITIES = [
  "can_read_operational",
  "can_write_operational",
  "can_manage_settings",
  "can_manage_security",
  "can_access_client_area",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type RbacEvaluationContext = {
  operatorGlobalSettingsDbEnabled?: boolean;
};

export type ModulePermission = {
  canRead: boolean;
  canWrite: boolean;
};

export type ModuleAccessOp = "read" | "write";

export type UserPermissionOverride = {
  can_read: boolean;
  can_write: boolean;
};

/** Legacy DB / JWT → ruolo canonico. */
const LEGACY_ROLE_MAP: Record<string, CanonicalRole> = {
  tecnico: "operatore",
  magazziniere: "operatore",
  commerciale: "addetto_amministrativo",
  ospite: "guest",
  viewer: "guest",
  sola_lettura: "guest",
};

export type RbacUserInput =
  | { ruolo?: string | null; id?: string | null }
  | string
  | null
  | undefined;

const MODULE_DENY: ModulePermission = { canRead: false, canWrite: false };

type ModuleCell = "rw" | "hidden";

type AreaScopedRole = "admin" | "manager" | "operatore" | "addetto_amministrativo";

const ALL_ERP_RW = Object.fromEntries(
  GESTIONALE_PERMISSION_MODULES.map((m) => [m, "rw" as const]),
) as Record<GestionalePermissionModule, ModuleCell>;

/** Matrice area-scoped — guest escluso (usa guestAuditModuleDefault). */
export const ROLE_MODULE_DEFAULTS: Record<
  AreaScopedRole,
  Partial<Record<GestionalePermissionModule, ModuleCell>>
> = {
  admin: ALL_ERP_RW,
  manager: ALL_ERP_RW,
  operatore: {
    magazzino: "rw",
    lavorazioni: "rw",
    mezzi: "rw",
    documenti: "rw",
  },
  addetto_amministrativo: {
    preventivi: "rw",
    fatturazione: "rw",
    ddt: "rw",
    ordini_fornitori: "rw",
    report: "rw",
  },
};

function rawRole(user: RbacUserInput): string | null {
  if (user == null) return null;
  if (typeof user === "string") return user;
  return user.ruolo ?? null;
}

export function resolveCanonicalRole(user: RbacUserInput): CanonicalRole {
  const raw = rawRole(user);
  if (!raw) return "guest";
  if ((CANONICAL_ROLES as readonly string[]).includes(raw)) return raw as CanonicalRole;
  return LEGACY_ROLE_MAP[raw] ?? "guest";
}

function cellToPermission(cell: ModuleCell | undefined): ModulePermission {
  if (!cell || cell === "hidden") return MODULE_DENY;
  return { canRead: true, canWrite: cell === "rw" };
}

/** Audit interno: read ALL moduli ERP, write mai. */
export function guestAuditModuleDefault(_module: GestionalePermissionModule): ModulePermission {
  return { canRead: true, canWrite: false };
}

/** Fallback ruolo × modulo (RBAC_PRECEDENCE step 3). */
export function roleModuleDefault(
  role: CanonicalRole,
  module: GestionalePermissionModule,
): ModulePermission {
  if (role === "admin") {
    return { canRead: true, canWrite: true };
  }
  if (role === "cliente") return MODULE_DENY;
  if (role === "guest") return guestAuditModuleDefault(module);
  const matrix = ROLE_MODULE_DEFAULTS[role as AreaScopedRole];
  return cellToPermission(matrix?.[module]);
}

/**
 * RBAC_PRECEDENCE steps 2→3→4 per singolo modulo ERP.
 * Step 1 (hard gates) gestito a livello route/RLS dedicato.
 */
export function resolveModuleAccess(
  role: CanonicalRole,
  module: GestionalePermissionModule,
  op: ModuleAccessOp,
  overrideRow?: UserPermissionOverride | null,
): boolean {
  if (role === "admin") return true;

  const perm: ModulePermission = overrideRow
    ? { canRead: overrideRow.can_read, canWrite: overrideRow.can_write }
    : roleModuleDefault(role, module);

  return op === "read" ? perm.canRead : perm.canWrite;
}

/** BUNDER hard gate — mirror di rbac_bunder_can() SQL. */
export function canAccessBunder(user: RbacUserInput, op: "read" | "write"): boolean {
  const role = resolveCanonicalRole(user);
  if (op === "read") return role === "admin" || role === "manager" || role === "guest";
  return role === "admin" || role === "manager";
}

/** Matrice ruolo → capability (unica). Admin: tutte true. */
export const ROLE_CAPABILITIES: Record<CanonicalRole, Record<Capability, boolean>> = {
  admin: {
    can_read_operational: true,
    can_write_operational: true,
    can_manage_settings: true,
    can_manage_security: true,
    can_access_client_area: true,
  },
  manager: {
    can_read_operational: true,
    can_write_operational: true,
    can_manage_settings: true,
    can_manage_security: false,
    can_access_client_area: false,
  },
  operatore: {
    can_read_operational: true,
    can_write_operational: true,
    can_manage_settings: false,
    can_manage_security: false,
    can_access_client_area: false,
  },
  addetto_amministrativo: {
    can_read_operational: true,
    can_write_operational: true,
    can_manage_settings: false,
    can_manage_security: false,
    can_access_client_area: false,
  },
  cliente: {
    can_read_operational: false,
    can_write_operational: false,
    can_manage_settings: false,
    can_manage_security: false,
    can_access_client_area: true,
  },
  guest: {
    can_read_operational: true,
    can_write_operational: false,
    can_manage_settings: false,
    can_manage_security: false,
    can_access_client_area: false,
  },
};

export function hasCapability(
  user: RbacUserInput,
  capability: Capability,
  _ctx?: RbacEvaluationContext,
): boolean {
  const role = resolveCanonicalRole(user);
  if (role === "admin") return true;
  return ROLE_CAPABILITIES[role][capability];
}

export const RBAC_DENIED_MESSAGE = "Non hai i permessi per eseguire questa azione.";

/** @deprecated Usare CANONICAL_ROLES / resolveCanonicalRole. */
export const APP_ROLES = CANONICAL_ROLES;
export type AppRole = CanonicalRole;
export const resolveRole = resolveCanonicalRole;
