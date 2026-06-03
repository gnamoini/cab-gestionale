"use server";

import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
} from "@/lib/lavorazioni/client-portal-access";
import { hasPermission } from "@/lib/auth/rbac";
import { loadClientPortalAccessSettingsServer, verifyClientLavorazioniAccessServer } from "@/src/lib/auth/client-lavorazioni-access-server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { assertAdminCaller, listUsersByAdminAction, type SecurityUserAdminRow } from "@/src/actions/admin-users";
import { validateSetClientLavorazioniAccessInput } from "@/lib/validation/security-actions-validation";

export type ClientLavorazioniAccessRow = SecurityUserAdminRow & {
  enabled: boolean;
};

export async function getMyClientLavorazioniAccessAction(): Promise<
  { ok: true; allowed: boolean } | { ok: false; message: string }
> {
  try {
    const allowed = await verifyClientLavorazioniAccessServer();
    return { ok: true, allowed };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore verifica accesso." };
  }
}

export async function listClientLavorazioniAccessByAdminAction(): Promise<
  { ok: true; rows: ClientLavorazioniAccessRow[] } | { ok: false; message: string }
> {
  const admin = await assertAdminCaller();
  if (!admin.ok) return { ok: false, message: admin.message };

  const usersRes = await listUsersByAdminAction();
  if (!usersRes.ok) return { ok: false, message: usersRes.message };

  const { settings } = await loadClientPortalAccessSettingsServer();
  const enabled = new Set(settings.enabledUserIds);

  const rows: ClientLavorazioniAccessRow[] = usersRes.users.map((u) => ({
    ...u,
    enabled: hasPermission(u.ruolo, "viewClientLavorazioni") || enabled.has(u.id),
  }));

  return { ok: true, rows };
}

export async function setClientLavorazioniAccessByAdminAction(input: {
  userId: string;
  enabled: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = validateSetClientLavorazioniAccessInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const { userId, enabled } = parsed;

  const admin = await assertAdminCaller();
  if (!admin.ok) return { ok: false, message: admin.message };

  const sb = await createSupabaseServerUserClient();
  const { data: prof } = await sb.from("profiles").select("ruolo").eq("id", userId).maybeSingle();
  if (!prof) return { ok: false, message: "Profilo non trovato." };
  if (hasPermission(prof.ruolo, "viewClientLavorazioni")) {
    return { ok: false, message: "Gli admin e i clienti hanno già accesso al portale clienti." };
  }

  const { data: row } = await sb
    .from("app_settings")
    .select("value, updated_at")
    .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
    .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
    .maybeSingle();

  const settings = parseClientPortalAccess(row?.value);
  const set = new Set(settings.enabledUserIds);
  if (enabled) set.add(userId);
  else set.delete(userId);

  const value = { enabledUserIds: [...set] };
  const updated_by = admin.callerId;

  if (!row) {
    const { error } = await sb.from("app_settings").insert({
      module: CLIENT_LAVORAZIONI_SETTINGS_MODULE,
      key: CLIENT_LAVORAZIONI_SETTINGS_KEY,
      value,
      updated_by,
    });
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await sb
      .from("app_settings")
      .update({ value, updated_by })
      .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
      .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
      .eq("updated_at", row.updated_at);
    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}
