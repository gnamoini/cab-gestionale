import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
  userHasClientLavorazioniAccess,
} from "@/lib/lavorazioni/client-portal-access";
import { hasPermission } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

/** Verifica accesso portale clienti lato server (layout / actions). */
export async function verifyClientLavorazioniAccessServer(): Promise<boolean> {
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return false;

  const { data: prof } = await sb.from("profiles").select("ruolo").eq("id", user.id).maybeSingle();
  const role = prof?.ruolo ?? null;
  return hasPermission(role, "viewClientLavorazioni");
}

export async function loadClientPortalAccessSettingsServer() {
  const sb = await createSupabaseServerUserClient();
  const { data: row } = await sb
    .from("app_settings")
    .select("value, updated_at")
    .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
    .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
    .maybeSingle();
  return {
    settings: parseClientPortalAccess(row?.value),
    updatedAt: row?.updated_at ?? null,
  };
}
