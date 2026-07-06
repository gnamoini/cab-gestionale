import { resolveRole } from "@/lib/auth/rbac";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { canReadPage, canWritePage, moduleAllowsFromResolved } from "@/src/lib/rbac/resolve-page-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";

async function requireServerPermissions() {
  return resolveServerEffectivePermissions();
}

export async function getServerCallerRole(): Promise<string | null> {
  const snap = await requireServerPermissions();
  return snap?.role ?? null;
}

export async function verifyServerPageRead(pageKey: GestionalePageKey): Promise<boolean> {
  const snap = await requireServerPermissions();
  if (!snap?.resolved) return false;
  return canReadPage(snap.resolved, pageKey);
}

export async function verifyServerPageWrite(pageKey: GestionalePageKey): Promise<boolean> {
  const snap = await requireServerPermissions();
  if (!snap?.resolved) return false;
  return canWritePage(snap.resolved, pageKey);
}

export async function verifyServerModuleCan(
  module: GestionalePermissionModule,
  op: "read" | "write",
): Promise<boolean> {
  const snap = await requireServerPermissions();
  if (!snap?.resolved) return false;
  return moduleAllowsFromResolved(snap.resolved, module, op);
}

export async function verifyServerIsAdmin(): Promise<boolean> {
  const snap = await requireServerPermissions();
  if (!snap) return false;
  return resolveRole(snap.role) === "admin";
}

export async function loadServerModuleAccessMap() {
  const snap = await requireServerPermissions();
  if (!snap?.resolved) return null;
  return snap.resolved.modules;
}
