import { resolveRole } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";
import { hasResolvedCapability } from "@/src/lib/rbac/resolve-user-permissions";

/** Verifica accesso portale clienti lato server (layout / actions). */
export async function verifyClientLavorazioniAccessServer(): Promise<boolean> {
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return false;

  const snap = await resolveServerEffectivePermissions();
  if (snap?.resolved && hasResolvedCapability(snap.resolved, "can_access_client_area")) {
    return true;
  }

  const { data: prof } = await sb.from("profiles").select("role_key").eq("id", user.id).maybeSingle();
  return resolveRole(prof?.role_key) === "cliente";
}
