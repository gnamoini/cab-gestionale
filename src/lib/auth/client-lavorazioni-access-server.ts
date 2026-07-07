import { resolveRole } from "@/lib/auth/rbac";
import { fetchRbacRoleKeyForUser } from "@/lib/rbac/fetch-rbac-role-key";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";
import { canReadPage } from "@/src/lib/rbac/resolve-page-access";

/** Verifica accesso portale clienti lato server (layout / actions). */
export async function verifyClientLavorazioniAccessServer(): Promise<boolean> {
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return false;

  const snap = await resolveServerEffectivePermissions();
  if (snap?.resolved && canReadPage(snap.resolved, "lavorazioni_clienti")) {
    return true;
  }

  const roleKey = await fetchRbacRoleKeyForUser(sb, user.id);
  return resolveRole(roleKey) === "cliente";
}
