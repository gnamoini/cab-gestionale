/**
 * RBAC seed data — used ONLY for migration SQL generation and test fixtures.
 * Runtime MUST read from Postgres (roles / role_permissions / user_permissions).
 */
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";

export const RBAC_SEED_CANONICAL_ROLES = [
  "admin",
  "manager",
  "operatore",
  "addetto_amministrativo",
  "cliente",
  "guest",
] as const;

export type RbacSeedRole = (typeof RBAC_SEED_CANONICAL_ROLES)[number];

export const RBAC_SEED_CAPABILITIES = [
  "can_read_operational",
  "can_write_operational",
  "can_manage_settings",
  "can_manage_security",
  "can_access_client_area",
] as const;

export type RbacSeedCapability = (typeof RBAC_SEED_CAPABILITIES)[number];

type ModuleCell = "rw" | "hidden";
type AreaScopedRole = "admin" | "manager" | "operatore" | "addetto_amministrativo";

const ALL_ERP_RW = Object.fromEntries(
  GESTIONALE_PERMISSION_MODULES.map((m) => [m, "rw" as const]),
) as Record<GestionalePermissionModule, ModuleCell>;

export const RBAC_SEED_ROLE_MODULE_DEFAULTS: Record<
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
    document_capture: "rw",
  },
  addetto_amministrativo: {
    preventivi: "rw",
    fatturazione: "rw",
    ddt: "rw",
    ordini_fornitori: "rw",
    report: "rw",
  },
};

export const RBAC_SEED_ROLE_CAPABILITIES: Record<RbacSeedRole, Record<RbacSeedCapability, boolean>> = {
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

/** Build permission keys for a role as if loaded from role_permissions seed. */
export function rbacSeedPermissionKeysForRole(roleKey: string): string[] {
  const keys = new Set<string>();
  if (roleKey === "admin") {
    for (const m of GESTIONALE_PERMISSION_MODULES) {
      keys.add(`${m}.read`);
      keys.add(`${m}.write`);
    }
    for (const c of RBAC_SEED_CAPABILITIES) keys.add(c);
    return [...keys];
  }
  if (roleKey === "guest") {
    for (const m of GESTIONALE_PERMISSION_MODULES) keys.add(`${m}.read`);
    keys.add("can_read_operational");
    return [...keys];
  }
  if (roleKey === "cliente") {
    keys.add("can_access_client_area");
    return [...keys];
  }
  const matrix = RBAC_SEED_ROLE_MODULE_DEFAULTS[roleKey as AreaScopedRole];
  if (matrix) {
    for (const [mod, cell] of Object.entries(matrix) as [GestionalePermissionModule, ModuleCell][]) {
      if (cell === "rw") {
        keys.add(`${mod}.read`);
        keys.add(`${mod}.write`);
      }
    }
  }
  const caps = RBAC_SEED_ROLE_CAPABILITIES[roleKey as RbacSeedRole];
  if (caps) {
    for (const [cap, allowed] of Object.entries(caps) as [RbacSeedCapability, boolean][]) {
      if (allowed) keys.add(cap);
    }
  }
  return [...keys];
}
