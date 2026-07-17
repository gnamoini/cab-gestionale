import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import { resolveRole } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Ruolo `cliente` senza `cliente_ref` non può usare il portale. */
export async function verifyClientePortalScopeServer(): Promise<boolean> {
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return false;

  const { data: prof } = await sb.from("profiles").select("role_key, cliente_ref").eq("id", user.id).maybeSingle();
  if (resolveRole(prof?.role_key) !== "cliente") return true;
  return !!normalizeClienteRef(prof?.cliente_ref);
}

/** `cliente_ref` del chiamante — server RSC/BFF (parità con `loadCallerClienteRef`). */
export async function loadServerCallerClienteRef(sb?: SupabaseClient): Promise<string | null> {
  const client = sb ?? (await createSupabaseServerUserClient());
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return null;
  const { data: prof } = await client
    .from("profiles")
    .select("cliente_ref")
    .eq("id", user.id)
    .maybeSingle();
  return normalizeClienteRef(prof?.cliente_ref);
}
