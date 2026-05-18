import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

export const APP_ROLES = ["admin", "operatore", "ospite"] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type LegacyAppRole = "tecnico" | "viewer";
export type AnyAppRole = AppRole | LegacyAppRole;

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
  | "viewAuditLogs";

export type RolePermissionSet = Record<PermissionKey, boolean>;

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissionSet> = {
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
  },
};

export const READONLY_PERMISSION_HINT = "Permesso richiesto";

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "admin") return "admin";
  if (role === "operatore" || role === "tecnico") return "operatore";
  if (role === "ospite" || role === "viewer") return "ospite";
  return "ospite";
}

export function roleLabel(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "Admin";
  if (normalized === "operatore") return "Operatore";
  return "Ospite";
}

export function hasPermission(role: string | null | undefined, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[normalizeRole(role)][permission];
}

export function canReadModule(role: string | null | undefined, module: GestionalePermissionModule): boolean {
  const r = normalizeRole(role);
  if (r === "admin" || r === "operatore" || r === "ospite") {
    return module === "report" || module === "documenti" || module === "lavorazioni" || module === "mezzi" || module === "magazzino" || module === "preventivi";
  }
  return false;
}

export function canWriteModule(role: string | null | undefined, module: GestionalePermissionModule): boolean {
  if (normalizeRole(role) === "admin") return true;
  if (module === "magazzino") return hasPermission(role, "editInventory");
  if (module === "lavorazioni" || module === "preventivi") return hasPermission(role, "editWorkOrders");
  if (module === "mezzi") return hasPermission(role, "editVehicles");
  if (module === "documenti") return hasPermission(role, "uploadDocuments");
  return false;
}

export function modulePermissionForRole(
  role: string | null | undefined,
  module: GestionalePermissionModule,
): { canRead: boolean; canWrite: boolean; canAdmin: boolean } {
  const r = normalizeRole(role);
  return {
    canRead: canReadModule(r, module),
    canWrite: canWriteModule(r, module),
    canAdmin: r === "admin",
  };
}
