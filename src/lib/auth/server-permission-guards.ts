import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import {
  canRead,
  canWrite,
  canDelete,
  hasPermission,
  type PermissionKey,
  type RbacSection,
} from "@/lib/auth/rbac";

/** Ruolo da `public.profiles` — unica fonte attendibile lato server. */
export async function getServerCallerRole(): Promise<string | null> {
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return null;
  const { data, error } = await sb.from("profiles").select("ruolo").eq("id", user.id).maybeSingle();
  if (error || !data?.ruolo) return null;
  return typeof data.ruolo === "string" ? data.ruolo : null;
}

export async function verifyServerPermission(permission: PermissionKey): Promise<boolean> {
  const role = await getServerCallerRole();
  return hasPermission(role, permission);
}

export async function verifyServerSectionRead(section: RbacSection): Promise<boolean> {
  const role = await getServerCallerRole();
  return canRead(role, section);
}

export async function verifyServerSectionWrite(section: RbacSection): Promise<boolean> {
  const role = await getServerCallerRole();
  return canWrite(role, section);
}

export async function verifyServerSectionDelete(section: RbacSection): Promise<boolean> {
  const role = await getServerCallerRole();
  return canDelete(role, section);
}
