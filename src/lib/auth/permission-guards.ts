"use client";

import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
  userHasClientLavorazioniAccess,
} from "@/lib/lavorazioni/client-portal-access";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { moduleAllows, type ModulePermissionOp } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";
import { canRead, canWrite, canDelete, hasPermission, type PermissionKey, type RbacSection } from "@/lib/auth/rbac";
import { fetchClientEffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/fetch-client-effective-permissions";
import { err, success, type ServiceResult } from "@/src/services/service-result";

const SECTION_TO_MODULE: Partial<Record<RbacSection, GestionalePermissionModule>> = {
  magazzino: "magazzino",
  preventivi: "preventivi",
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  report: "report",
  documenti: "documenti",
};

const DENIED_MESSAGE = RBAC_DENIED_MESSAGE;
const CLIENT_DENIED = "Accesso al portale lavorazioni clienti non autorizzato.";

export async function getCurrentRoleForPermissionCheck(): Promise<string | null> {
  const snap = await fetchClientEffectivePermissionsSnapshot();
  return snap?.role ?? null;
}

export async function ensurePermission(permission: PermissionKey): Promise<ServiceResult<true>> {
  const snap = await fetchClientEffectivePermissionsSnapshot();
  if (!snap || !hasPermission(snap.role, permission, snap.rbacContext)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensurePermissionOrError(permission: PermissionKey): Promise<void> {
  const allowed = await ensurePermission(permission);
  if (!allowed.success) throw new Error(allowed.error ?? DENIED_MESSAGE);
}

export async function ensureModuleCan(
  module: GestionalePermissionModule,
  op: ModulePermissionOp,
): Promise<ServiceResult<true>> {
  const snap = await fetchClientEffectivePermissionsSnapshot();
  if (!snap || !moduleAllows(snap.modules, module, op)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensureSectionRead(section: RbacSection): Promise<ServiceResult<true>> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return ensureModuleCan(mod, "read");
  const snap = await fetchClientEffectivePermissionsSnapshot();
  if (!snap || !canRead(snap.role, section, snap.rbacContext)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensureSectionWrite(section: RbacSection): Promise<ServiceResult<true>> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return ensureModuleCan(mod, "write");
  const snap = await fetchClientEffectivePermissionsSnapshot();
  if (!snap || !canWrite(snap.role, section, snap.rbacContext)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensureSectionDelete(section: RbacSection): Promise<ServiceResult<true>> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return ensureModuleCan(mod, "write");
  const snap = await fetchClientEffectivePermissionsSnapshot();
  if (!snap || !canDelete(snap.role, section, snap.rbacContext)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensureSectionWriteOrError(section: RbacSection): Promise<void> {
  const allowed = await ensureSectionWrite(section);
  if (!allowed.success) throw new Error(allowed.error ?? DENIED_MESSAGE);
}

async function loadClientPortalAccessForCurrentUser(): Promise<{ role: string | null; userId: string | null; settings: ReturnType<typeof parseClientPortalAccess> }> {
  const sb = getBrowserSupabase();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { role: null, userId: null, settings: { enabledUserIds: [] } };
  const snap = await fetchClientEffectivePermissionsSnapshot();
  const role = snap?.role ?? null;
  const { data: row } = await sb
    .from("app_settings")
    .select("value")
    .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
    .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
    .maybeSingle();
  return { role, userId, settings: parseClientPortalAccess(row?.value) };
}

/** Portale lavorazioni clienti: admin o utente abilitato in Sicurezza. */
export async function ensureClientLavorazioniAccess(): Promise<ServiceResult<true>> {
  const { role, userId, settings } = await loadClientPortalAccessForCurrentUser();
  if (!userId) return err("Sessione non valida.");
  if (!userHasClientLavorazioniAccess(role, userId, settings)) return err(CLIENT_DENIED);
  return success(true);
}
