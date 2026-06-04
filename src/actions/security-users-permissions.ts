"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
} from "@/lib/lavorazioni/client-portal-access";
import { normalizeClienteRef, validateClienteRefForRole } from "@/src/lib/auth/cliente-portal-scope";
import { hasPermission, resolveRole, type AppRole } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import {
  assertAdminCaller,
  listUsersByAdminAction,
  type SecurityUserAdminRow,
} from "@/src/actions/admin-users";
import { hasModulePermissionOverrides } from "@/lib/security/user-module-permissions";
import { validateSecurityUserBatchPatches } from "@/lib/validation/security-actions-validation";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { clearServerAuthSnapshotCacheForUser } from "@/src/lib/auth/server-session-cache";
import type { ProfileRow, UserPermissionRow } from "@/src/types/supabase-tables";

export type SecurityUserModulePermissionEntry = {
  module: GestionalePermissionModule;
  canRead: boolean;
  canWrite: boolean;
};

export type SecurityUserPermissionRow = SecurityUserAdminRow & {
  clientLavorazioniAccess: boolean;
  /** Accesso garantito dal ruolo (toggle non modificabile). */
  clientLavorazioniAccessFromRole: boolean;
  hasModulePermissionOverrides: boolean;
};

export type SecurityUserBatchPatch = {
  userId: string;
  nome?: string;
  ruolo?: AppRole;
  clienteRef?: string | null;
  clientLavorazioniAccess?: boolean;
  modulePermissions?: SecurityUserModulePermissionEntry[] | null;
  clearModulePermissions?: boolean;
};

export type ListSecurityUsersPermissionsResult =
  | {
      ok: true;
      users: SecurityUserPermissionRow[];
      portalSettingsUpdatedAt: string | null;
      permissionRows: UserPermissionRow[];
    }
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
  permissionRows: UserPermissionRow[],
): SecurityUserPermissionRow {
  const fromRole = roleGrantsClientPortal(user.ruolo);
  return {
    ...user,
    clientLavorazioniAccessFromRole: fromRole,
    clientLavorazioniAccess: fromRole || enabledUserIds.has(user.id),
    hasModulePermissionOverrides: hasModulePermissionOverrides(user.ruolo, user.id, permissionRows),
  };
}

async function loadAllUserPermissionRows(
  admin: SupabaseClient,
  userIds: string[],
): Promise<UserPermissionRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await admin.from("user_permissions").select("*").in("user_id", userIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as UserPermissionRow[];
}

async function deleteUserModulePermissions(admin: SupabaseClient, userId: string): Promise<void> {
  const { error } = await admin.from("user_permissions").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

async function applyUserModulePermissions(
  admin: SupabaseClient,
  userId: string,
  modulePermissions: SecurityUserModulePermissionEntry[] | null,
): Promise<boolean> {
  await deleteUserModulePermissions(admin, userId);
  if (!modulePermissions?.length) return true;

  const rows = modulePermissions.map((entry) => ({
    user_id: userId,
    module: entry.module,
    can_read: entry.canRead,
    can_write: entry.canWrite,
    can_admin: false,
  }));

  const { error } = await admin.from("user_permissions").upsert(rows, { onConflict: "user_id,module" });
  if (error) throw new Error(error.message);
  return true;
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

  const { createClient } = await import("@supabase/supabase-js");
  const serviceAdmin = createClient(admin.url, admin.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userIds = usersRes.users.map((u) => u.id);
  let permissionRows: UserPermissionRow[] = [];
  try {
    permissionRows = await loadAllUserPermissionRows(serviceAdmin, userIds);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Errore caricamento permessi modulo.",
    };
  }

  const users = usersRes.users.map((u) => toPermissionRow(u, enabled, permissionRows));
  return { ok: true, users, portalSettingsUpdatedAt: row?.updated_at ?? null, permissionRows };
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
  const validated = validateSecurityUserBatchPatches(patches);
  if (!validated.ok) return { ok: false, message: validated.message };
  if (!validated.patches.length) return { ok: true, updatedCount: 0 };

  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(caller.url, caller.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sbUser = await createSupabaseServerUserClient();

  const normalized = validated.patches
    .map((p) => ({
      userId: p.userId,
      nome: p.nome,
      ruolo: p.ruolo != null ? resolveRole(p.ruolo) : undefined,
      clienteRef: p.clienteRef,
      clientLavorazioniAccess: p.clientLavorazioniAccess,
      modulePermissions: p.modulePermissions,
      clearModulePermissions: p.clearModulePermissions,
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

    const effectiveRole = patch.ruolo != null ? patch.ruolo : resolveRole(profile.ruolo);
    const effectiveClienteRef =
      patch.clienteRef !== undefined ? patch.clienteRef : normalizeClienteRef(profile.cliente_ref);
    const clienteRefErr = validateClienteRefForRole(effectiveRole, effectiveClienteRef);
    if (clienteRefErr) return { ok: false, message: clienteRefErr };

    if (patch.clienteRef !== undefined) {
      const currentRef = normalizeClienteRef(profile.cliente_ref);
      if (patch.clienteRef !== currentRef) {
        const { error } = await admin
          .from("profiles")
          .update({ cliente_ref: patch.clienteRef })
          .eq("id", patch.userId);
        if (error) return { ok: false, message: error.message };
        clearServerAuthSnapshotCacheForUser(patch.userId);
        updatedCount += 1;
      }
    }

    const roleChanged = patch.ruolo != null && resolveRole(profile.ruolo) !== patch.ruolo;
    if (roleChanged) {
      const { error } = await admin.from("profiles").update({ ruolo: patch.ruolo }).eq("id", patch.userId);
      if (error) return { ok: false, message: error.message };
      const authLookup = await admin.auth.admin.getUserById(patch.userId).catch(() => null);
      await admin.auth.admin
        .updateUserById(patch.userId, {
          app_metadata: { ...(authLookup?.data.user?.app_metadata ?? {}), cab_ruolo: patch.ruolo },
        })
        .catch(() => {});
      clearServerAuthSnapshotCacheForUser(patch.userId);
      updatedCount += 1;
    }

    if (patch.modulePermissions !== undefined) {
      try {
        if (await applyUserModulePermissions(admin, patch.userId, patch.modulePermissions)) {
          updatedCount += 1;
        }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Errore salvataggio permessi pagine." };
      }
    } else if (patch.clearModulePermissions === true || roleChanged) {
      try {
        if (await applyUserModulePermissions(admin, patch.userId, null)) {
          updatedCount += 1;
        }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Errore permessi modulo." };
      }
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
