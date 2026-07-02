import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { verifyServerPermission } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { AdminCallerContext } from "@/src/actions/admin-users.types";

/** Verifica sessione admin + permesso manageSecurity — modulo server (no "use server"). */
export async function assertAdminCaller(): Promise<AdminCallerContext> {
  let serviceKey: string;
  try {
    serviceKey = assertSupabaseServiceRoleKey();
  } catch {
    return {
      ok: false,
      message: "Gestione utenti non configurata sul server (manca SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const allowed = await verifyServerPermission("manageSecurity");
  if (!allowed) {
    return { ok: false, message: "Operazione riservata agli amministratori." };
  }

  const sbUser = await createSupabaseServerUserClient();
  const {
    data: { user: caller },
    error: callerErr,
  } = await sbUser.auth.getUser();
  if (callerErr || !caller) {
    return { ok: false, message: "Sessione non valida. Effettua di nuovo l'accesso." };
  }

  const { data: prof, error: profErr } = await sbUser
    .from("profiles")
    .select("nome, role_key")
    .eq("id", caller.id)
    .maybeSingle();
  if (profErr) return { ok: false, message: profErr.message };

  const url = assertSupabasePublicEnv().url;
  const callerName =
    typeof prof?.nome === "string" && prof.nome.trim()
      ? prof.nome.trim()
      : caller.email?.split("@")[0]?.trim() || "Admin";
  return { ok: true, callerId: caller.id, callerName, serviceKey, url };
}
