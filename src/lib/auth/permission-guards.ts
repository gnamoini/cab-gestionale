"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { hasPermission, type PermissionKey } from "@/src/lib/auth/permissions";
import { err, success, type ServiceResult } from "@/src/services/service-result";

const DENIED_MESSAGE = "Permesso richiesto.";

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
