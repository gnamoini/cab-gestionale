import {
  canRead,
  canWrite,
  canDelete,
  hasPermission,
  resolveRole,
  type PermissionKey,
  type RbacSection,
} from "@/lib/auth/rbac";
import {
  buildModuleAccessMap,
  moduleAllows,
  type ModulePermissionOp,
} from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";

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

async function requireServerPermissions() {
  const snap = await resolveServerEffectivePermissions();
  if (!snap) return null;
  return snap;
}

/** Ruolo da snapshot server (`getServerSession`) — unica fonte per request RSC. */
export async function getServerCallerRole(): Promise<string | null> {
  const snap = await requireServerPermissions();
  return snap?.role ?? null;
}

export async function verifyServerIsAdmin(): Promise<boolean> {
  const snap = await requireServerPermissions();
  if (!snap) return false;
  return resolveRole(snap.role) === "admin";
}

/** Permesso modulo allineato a RLS `user_effective_can`. */
export async function verifyServerModuleCan(
  module: GestionalePermissionModule,
  op: ModulePermissionOp,
): Promise<boolean> {
  const snap = await requireServerPermissions();
  if (!snap) return false;
  return moduleAllows(snap.modules, module, op);
}

export async function verifyServerPermission(permission: PermissionKey): Promise<boolean> {
  const snap = await requireServerPermissions();
  if (!snap) return false;
  return hasPermission(snap.role, permission, snap.rbacContext);
}

export async function verifyServerSectionRead(section: RbacSection): Promise<boolean> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return verifyServerModuleCan(mod, "read");
  const snap = await requireServerPermissions();
  if (!snap) return false;
  return canRead(snap.role, section, snap.rbacContext);
}

export async function verifyServerSectionWrite(section: RbacSection): Promise<boolean> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return verifyServerModuleCan(mod, "write");
  const snap = await requireServerPermissions();
  if (!snap) return false;
  return canWrite(snap.role, section, snap.rbacContext);
}

export async function verifyServerSectionDelete(section: RbacSection): Promise<boolean> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return verifyServerModuleCan(mod, "write");
  const snap = await requireServerPermissions();
  if (!snap) return false;
  return canDelete(snap.role, section, snap.rbacContext);
}

/** @deprecated Usare resolveServerEffectivePermissions().modules */
export async function loadServerModuleAccessMap() {
  const snap = await requireServerPermissions();
  if (!snap) return null;
  return snap.modules;
}
