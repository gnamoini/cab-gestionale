"use client";

import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
  userHasClientLavorazioniAccess,
} from "@/lib/lavorazioni/client-portal-access";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { canRead, canWrite, canDelete, hasPermission, type PermissionKey, type RbacSection } from "@/lib/auth/rbac";
import { err, success, type ServiceResult } from "@/src/services/service-result";

const DENIED_MESSAGE = "Permesso richiesto.";
const CLIENT_DENIED = "Accesso al portale lavorazioni clienti non autorizzato.";

export async function getCurrentRoleForPermissionCheck(): Promise<string | null> {
  const sb = getBrowserSupabase();
  const { data: auth, error: authErr } = await sb.auth.getUser();
  if (authErr || !auth.user?.id) return null;
  const { data, error } = await sb.from("profiles").select("ruolo").eq("id", auth.user.id).maybeSingle();
  if (error) return null;
  return typeof data?.ruolo === "string" ? data.ruolo : null;
}

export async function ensurePermission(permission: PermissionKey): Promise<ServiceResult<true>> {
  const role = await getCurrentRoleForPermissionCheck();
  if (!hasPermission(role, permission)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensurePermissionOrError(permission: PermissionKey): Promise<void> {
  const allowed = await ensurePermission(permission);
  if (!allowed.success) throw new Error(allowed.error ?? DENIED_MESSAGE);
}

export async function ensureSectionRead(section: RbacSection): Promise<ServiceResult<true>> {
  const role = await getCurrentRoleForPermissionCheck();
  if (!canRead(role, section)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensureSectionWrite(section: RbacSection): Promise<ServiceResult<true>> {
  const role = await getCurrentRoleForPermissionCheck();
  if (!canWrite(role, section)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensureSectionDelete(section: RbacSection): Promise<ServiceResult<true>> {
  const role = await getCurrentRoleForPermissionCheck();
  if (!canDelete(role, section)) return err(DENIED_MESSAGE);
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
  const { data: prof } = await sb.from("profiles").select("ruolo").eq("id", userId).maybeSingle();
  const role = typeof prof?.ruolo === "string" ? prof.ruolo : null;
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
