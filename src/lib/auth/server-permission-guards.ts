import { resolveRole } from "@/lib/auth/rbac";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { canReadPage, canWritePage, moduleAllowsFromResolved } from "@/src/lib/rbac/resolve-page-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";

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
};

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

export async function verifyServerSectionRead(section: string): Promise<boolean> {
  const pageKey = LEGACY_SECTION_TO_PAGE[section];
  if (!pageKey) return false;
  return verifyServerPageRead(pageKey);
}

export async function verifyServerSectionWrite(section: string): Promise<boolean> {
  const pageKey = LEGACY_SECTION_TO_PAGE[section];
  if (!pageKey) return false;
  return verifyServerPageWrite(pageKey);
}

export async function verifyServerSectionDelete(section: string): Promise<boolean> {
  return verifyServerSectionWrite(section);
}

/** Sicurezza / admin UI — write su pagina sicurezza. */
export async function verifyServerPermission(_permission: string): Promise<boolean> {
  return verifyServerPageWrite("sicurezza");
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
