"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
} from "@/lib/lavorazioni/client-portal-access";
import { hasPermission, resolveRole, type AppRole } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import {
  assertAdminCaller,
  listUsersByAdminAction,
  type SecurityUserAdminRow,
} from "@/src/actions/admin-users";
import type { ProfileRow } from "@/src/types/supabase-tables";

export type SecurityUserPermissionRow = SecurityUserAdminRow & {
  clientLavorazioniAccess: boolean;
  /** Accesso garantito dal ruolo (toggle non modificabile). */
  clientLavorazioniAccessFromRole: boolean;
};

export type SecurityUserBatchPatch = {
  userId: string;
  nome?: string;
  ruolo?: AppRole;
  clientLavorazioniAccess?: boolean;
};

export type ListSecurityUsersPermissionsResult =
  | { ok: true; users: SecurityUserPermissionRow[]; portalSettingsUpdatedAt: string | null }
  | { ok: false; message: string };

export type BatchUpdateSecurityUsersResult =
  | { ok: true; updatedCount: number }
  | { ok: false; message: string };

function roleGrantsClientPortal(role: AppRole): boolean {
  return hasPermission(role, "viewClientLavorazioni");
}

function toPermissionRow(
  user: SecurityUserAdminRow,
  enabledUserIds: Set<string>,
): SecurityUserPermissionRow {
  const fromRole = roleGrantsClientPortal(user.ruolo);
  return {
    ...user,
    clientLavorazioniAccessFromRole: fromRole,
    clientLavorazioniAccess: fromRole || enabledUserIds.has(user.id),
  };
}

export async function listSecurityUsersPermissionsAction(): Promise<ListSecurityUsersPermissionsResult> {
  const admin = await assertAdminCaller();
  if (!admin.ok) return { ok: false, message: admin.message };

  const usersRes = await listUsersByAdminAction();
  if (!usersRes.ok) return { ok: false, message: usersRes.message };

  const sb = await createSupabaseServerUserClient();
  const { data: row } = await sb
    .from("app_settings")
    .select("value, updated_at")
    .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
    .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
    .maybeSingle();

  const settings = parseClientPortalAccess(row?.value);
  const enabled = new Set(settings.enabledUserIds);

  const users = usersRes.users.map((u) => toPermissionRow(u, enabled));
  return { ok: true, users, portalSettingsUpdatedAt: row?.updated_at ?? null };
}

async function writeSecurityBatchLog(
  admin: SupabaseClient,
  input: { actorUserId: string; actorName: string; patches: SecurityUserBatchPatch[] },
) {
  const { error } = await admin.from("log_modifiche").insert({
    entita: "security",
    entita_id: input.actorUserId,
    azione: "BATCH_UPDATE_USERS",
    autore_id: input.actorUserId,
    payload: {
      event: "AGGIORNAMENTO UTENTI E PERMESSI",
      actor: input.actorName,
      count: input.patches.length,
      userIds: input.patches.map((p) => p.userId),
      compact: `(AGGIORNAMENTO UTENTI, ${input.patches.length} modifiche, ${input.actorName})`,
    },
  });
  if (error) console.warn("[security] batch log:", error.message);
}

export async function batchUpdateSecurityUsersAction(
  patches: SecurityUserBatchPatch[],
): Promise<BatchUpdateSecurityUsersResult> {
  if (!patches.length) return { ok: true, updatedCount: 0 };

  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(caller.url, caller.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sbUser = await createSupabaseServerUserClient();

  const normalized = patches
    .map((p) => ({
      userId: p.userId?.trim() ?? "",
      nome: p.nome?.trim(),
      ruolo: p.ruolo != null ? resolveRole(p.ruolo) : undefined,
      clientLavorazioniAccess: p.clientLavorazioniAccess,
    }))
    .filter((p) => p.userId);

  if (!normalized.length) return { ok: true, updatedCount: 0 };

  let updatedCount = 0;

  for (const patch of normalized) {
    const { data: before } = await admin.from("profiles").select("*").eq("id", patch.userId).maybeSingle();
    if (!before) return { ok: false, message: `Profilo non trovato (${patch.userId}).` };
    const profile = before as ProfileRow;

    if (patch.nome != null && patch.nome !== profile.nome?.trim()) {
      if (!patch.nome) return { ok: false, message: "Il nome non può essere vuoto." };
      const { error } = await admin.from("profiles").update({ nome: patch.nome }).eq("id", patch.userId);
      if (error) return { ok: false, message: error.message };
      await admin.auth.admin
        .updateUserById(patch.userId, {
          app_metadata: { cab_nome: patch.nome },
        })
        .catch(() => {});
      updatedCount += 1;
    }

    if (patch.ruolo != null && resolveRole(profile.ruolo) !== patch.ruolo) {
      const { error } = await admin.from("profiles").update({ ruolo: patch.ruolo }).eq("id", patch.userId);
      if (error) return { ok: false, message: error.message };
      const authLookup = await admin.auth.admin.getUserById(patch.userId).catch(() => null);
      await admin.auth.admin
        .updateUserById(patch.userId, {
          app_metadata: { ...(authLookup?.data.user?.app_metadata ?? {}), cab_ruolo: patch.ruolo },
        })
        .catch(() => {});
      updatedCount += 1;
    }
  }

  const portalPatches = normalized.filter((p) => p.clientLavorazioniAccess !== undefined);
  if (portalPatches.length > 0) {
    const { data: settingsRow } = await sbUser
      .from("app_settings")
      .select("value, updated_at")
      .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
      .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
      .maybeSingle();

    const settings = parseClientPortalAccess(settingsRow?.value);
    const enabled = new Set(settings.enabledUserIds);

    for (const patch of portalPatches) {
      const { data: prof } = await admin.from("profiles").select("ruolo").eq("id", patch.userId).maybeSingle();
      const role = resolveRole(prof?.ruolo);
      if (roleGrantsClientPortal(role)) continue;

      if (patch.clientLavorazioniAccess) enabled.add(patch.userId);
      else enabled.delete(patch.userId);
      updatedCount += 1;
    }

    const value = { enabledUserIds: [...enabled] };
    const updated_by = caller.callerId;

    if (!settingsRow) {
      const { error } = await sbUser.from("app_settings").insert({
        module: CLIENT_LAVORAZIONI_SETTINGS_MODULE,
        key: CLIENT_LAVORAZIONI_SETTINGS_KEY,
        value,
        updated_by,
      });
      if (error) return { ok: false, message: error.message };
    } else {
      const { error } = await sbUser
        .from("app_settings")
        .update({ value, updated_by })
        .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
        .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
        .eq("updated_at", settingsRow.updated_at);
      if (error) {
        return {
          ok: false,
          message: "Conflitto di salvataggio accessi clienti. Ricarica la pagina e riprova.",
        };
      }
    }
  }

  await writeSecurityBatchLog(admin, {
    actorUserId: caller.callerId,
    actorName: caller.callerName,
    patches: normalized,
  });

  return { ok: true, updatedCount };
}
