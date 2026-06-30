"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILES_COLUMNS, USER_PERMISSIONS_COLUMNS } from "@/lib/db/table-select-columns";
import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
} from "@/lib/lavorazioni/client-portal-access";
import {
  normalizeClienteRef,
  roleHasClientPortalAccess,
  validateClienteAssociationForRole,
} from "@/src/lib/auth/cliente-portal-scope";
import { loadKnownClientiSetFromMezzi } from "@/src/lib/auth/load-known-clienti";
import { normalizeUsername } from "@/src/lib/auth/username";
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
import { onUserRoleChangedServer } from "@/src/lib/rbac/on-user-role-changed.server";
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
  username?: string;
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
  | { ok: true; updatedCount: number; roleChangedUserIds: string[] }
  | { ok: false; message: string };

function roleGrantsClientPortal(role: AppRole): boolean {
  return hasPermission(role, "viewClientLavorazioni");
}

function toPermissionRow(user: SecurityUserAdminRow, permissionRows: UserPermissionRow[]): SecurityUserPermissionRow {
  const fromRole = roleGrantsClientPortal(user.ruolo);
  return {
    ...user,
    clientLavorazioniAccessFromRole: fromRole,
    clientLavorazioniAccess: fromRole,
    hasModulePermissionOverrides: hasModulePermissionOverrides(user.ruolo, user.id, permissionRows),
  };
}

async function loadAllUserPermissionRows(
  admin: SupabaseClient,
  userIds: string[],
): Promise<UserPermissionRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await admin.from("user_permissions").select(USER_PERMISSIONS_COLUMNS).in("user_id", userIds);
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
  userRole?: AppRole,
): Promise<boolean> {
  await deleteUserModulePermissions(admin, userId);
  if (!modulePermissions?.length) return true;

  if (userRole === "guest") {
    throw new Error("Il ruolo Viewer/Audit non ammette override permessi modulo.");
  }

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

  const users = usersRes.users.map((u) => toPermissionRow(u, permissionRows));
  return { ok: true, users, portalSettingsUpdatedAt: row?.updated_at ?? null, permissionRows };
}

async function writeSecurityBatchLog(
  admin: SupabaseClient,
  input: {
    actorUserId: string;
    actorName: string;
    patches: SecurityUserBatchPatch[];
    profileById: Map<string, ProfileRow>;
  },
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
      transitions: input.patches
        .filter((p) => p.ruolo != null)
        .map((p) => ({
          userId: p.userId,
          from: resolveRole(input.profileById.get(p.userId)?.ruolo),
          to: p.ruolo,
        })),
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
  if (!validated.patches.length) return { ok: true, updatedCount: 0, roleChangedUserIds: [] };

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
      username: p.username,
      ruolo: p.ruolo != null ? resolveRole(p.ruolo) : undefined,
      clienteRef: p.clienteRef,
      clientLavorazioniAccess: p.clientLavorazioniAccess,
      modulePermissions: p.modulePermissions,
      clearModulePermissions: p.clearModulePermissions,
    }))
    .filter((p) => p.userId);

  if (!normalized.length) return { ok: true, updatedCount: 0, roleChangedUserIds: [] };

  let knownClienti: Set<string>;
  try {
    knownClienti = await loadKnownClientiSetFromMezzi(admin);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Errore caricamento anagrafica clienti.",
    };
  }

  const patchUserIds = normalized.map((p) => p.userId);
  const { data: profilesBefore, error: profilesLoadErr } = await admin
    .from("profiles")
    .select(PROFILES_COLUMNS)
    .in("id", patchUserIds);
  if (profilesLoadErr) return { ok: false, message: profilesLoadErr.message };
  const profileById = new Map(((profilesBefore ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  let updatedCount = 0;
  const roleChangedUserIds: string[] = [];

  for (const patch of normalized) {
    const profile = profileById.get(patch.userId);
    if (!profile) return { ok: false, message: `Profilo non trovato (${patch.userId}).` };

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

    if (patch.username != null) {
      const currentUsername = normalizeUsername(profile.username ?? "");
      if (patch.username !== currentUsername) {
        const { data: available, error: rpcErr } = await sbUser.rpc("check_username_available", {
          p_username: patch.username,
          p_exclude_user_id: patch.userId,
        });
        if (rpcErr) return { ok: false, message: "Impossibile verificare il nome utente. Riprova." };
        if (available !== true) return { ok: false, message: "Username già utilizzato." };

        const { error } = await admin.from("profiles").update({ username: patch.username }).eq("id", patch.userId);
        if (error) {
          const msg =
            error.message.includes("unique") || error.message.includes("duplicate")
              ? "Username già utilizzato."
              : error.message;
          return { ok: false, message: msg };
        }
        await admin.auth.admin
          .updateUserById(patch.userId, {
            app_metadata: { cab_username: patch.username },
          })
          .catch(() => {});
        clearServerAuthSnapshotCacheForUser(patch.userId);
        updatedCount += 1;
      }
    }

    const effectiveRole = patch.ruolo != null ? patch.ruolo : resolveRole(profile.ruolo);
    const effectiveClienteRef =
      patch.clienteRef !== undefined ? patch.clienteRef : normalizeClienteRef(profile.cliente_ref);
    const clienteRefErr = validateClienteAssociationForRole(effectiveRole, effectiveClienteRef, knownClienti);
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
      const { error: roleErr } = await admin.rpc("security_set_user_role", {
        p_user_id: patch.userId,
        p_new_role: patch.ruolo,
      });
      if (roleErr) return { ok: false, message: roleErr.message };

      const authLookup = await admin.auth.admin.getUserById(patch.userId);
      if (authLookup.error) return { ok: false, message: authLookup.error.message };
      const { error: metaErr } = await admin.auth.admin.updateUserById(patch.userId, {
        app_metadata: { ...(authLookup.data.user?.app_metadata ?? {}), cab_ruolo: patch.ruolo },
      });
      if (metaErr) return { ok: false, message: metaErr.message };

      onUserRoleChangedServer(patch.userId);
      roleChangedUserIds.push(patch.userId);
      updatedCount += 1;
    }

    if (patch.modulePermissions !== undefined) {
      if (effectiveRole === "guest") {
        return {
          ok: false,
          message: "Il ruolo Viewer/Audit non ammette override permessi modulo.",
        };
      }
      try {
        if (await applyUserModulePermissions(admin, patch.userId, patch.modulePermissions, effectiveRole)) {
          updatedCount += 1;
        }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Errore salvataggio permessi pagine." };
      }
    } else if (patch.clearModulePermissions === true) {
      try {
        if (await applyUserModulePermissions(admin, patch.userId, null, effectiveRole)) {
          updatedCount += 1;
        }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Errore permessi modulo." };
      }
    }
  }

  await writeSecurityBatchLog(admin, {
    actorUserId: caller.callerId,
    actorName: caller.callerName,
    patches: normalized,
    profileById,
  });

  return { ok: true, updatedCount, roleChangedUserIds };
}

export type ClienteAssociationAuditIssue = {
  userId: string;
  nome: string;
  email: string;
  ruolo: AppRole;
  clienteRef: string | null;
  category:
    | "cliente_senza_associazione"
    | "associazione_invalida"
    | "ref_orfano_staff"
    | "allowlist_non_autorizzato";
  detail: string;
};

export type ClienteAssociationAuditResult = {
  ok: true;
  issues: ClienteAssociationAuditIssue[];
  allowlistCleaned: Array<{ userId: string; nome: string; ruolo: string }>;
  knownClientiCount: number;
  scannedAt: string;
};

export type ClienteAssociationAuditActionResult =
  | ClienteAssociationAuditResult
  | { ok: false; message: string };

async function cleanupClientPortalAllowlist(
  sbUser: SupabaseClient,
  users: SecurityUserAdminRow[],
  callerId: string,
): Promise<{ cleaned: Array<{ userId: string; nome: string; ruolo: string }>; issues: ClienteAssociationAuditIssue[] }> {
  const { data: settingsRow } = await sbUser
    .from("app_settings")
    .select("value, updated_at")
    .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
    .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
    .maybeSingle();

  const settings = parseClientPortalAccess(settingsRow?.value);
  const usersById = new Map(users.map((u) => [u.id, u]));
  const issues: ClienteAssociationAuditIssue[] = [];
  const cleaned: Array<{ userId: string; nome: string; ruolo: string }> = [];
  const nextIds: string[] = [];

  for (const userId of settings.enabledUserIds) {
    const user = usersById.get(userId);
    if (!user) {
      issues.push({
        userId,
        nome: "—",
        email: "",
        ruolo: "guest",
        clienteRef: null,
        category: "allowlist_non_autorizzato",
        detail: "Utente in allowlist non trovato in elenco profili.",
      });
      continue;
    }
    if (!roleHasClientPortalAccess(user.ruolo)) {
      issues.push({
        userId: user.id,
        nome: user.nome,
        email: user.email,
        ruolo: user.ruolo,
        clienteRef: user.clienteRef,
        category: "allowlist_non_autorizzato",
        detail: "Rimosso dall'allowlist: ruolo senza accesso portale.",
      });
      cleaned.push({ userId: user.id, nome: user.nome, ruolo: user.ruolo });
      continue;
    }
    nextIds.push(userId);
  }

  if (nextIds.length !== settings.enabledUserIds.length) {
    const value = { enabledUserIds: nextIds };
    if (!settingsRow) {
      const { error } = await sbUser.from("app_settings").insert({
        module: CLIENT_LAVORAZIONI_SETTINGS_MODULE,
        key: CLIENT_LAVORAZIONI_SETTINGS_KEY,
        value,
        updated_by: callerId,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sbUser
        .from("app_settings")
        .update({ value, updated_by: callerId })
        .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
        .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
        .eq("updated_at", settingsRow.updated_at);
      if (error) throw new Error("Conflitto aggiornamento allowlist portale. Riprova.");
    }
  }

  return { cleaned, issues };
}

/** Report associazioni cliente + pulizia allowlist portale (no auto-fix su profili). */
export async function auditClienteAssociationsAction(): Promise<ClienteAssociationAuditActionResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const usersRes = await listUsersByAdminAction();
  if (!usersRes.ok) return { ok: false, message: usersRes.message };

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(caller.url, caller.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sbUser = await createSupabaseServerUserClient();

  let knownClienti: Set<string>;
  try {
    knownClienti = await loadKnownClientiSetFromMezzi(admin);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Errore caricamento anagrafica clienti.",
    };
  }

  const issues: ClienteAssociationAuditIssue[] = [];

  for (const user of usersRes.users) {
    const ref = normalizeClienteRef(user.clienteRef);
    if (user.ruolo === "cliente") {
      if (!ref) {
        issues.push({
          userId: user.id,
          nome: user.nome,
          email: user.email,
          ruolo: user.ruolo,
          clienteRef: null,
          category: "cliente_senza_associazione",
          detail: "Ruolo Cliente senza cliente associato.",
        });
      } else if (knownClienti.size > 0 && !knownClienti.has(ref)) {
        issues.push({
          userId: user.id,
          nome: user.nome,
          email: user.email,
          ruolo: user.ruolo,
          clienteRef: ref,
          category: "associazione_invalida",
          detail: "Cliente associato non presente in anagrafica mezzi.",
        });
      }
    } else if (ref) {
      issues.push({
        userId: user.id,
        nome: user.nome,
        email: user.email,
        ruolo: user.ruolo,
        clienteRef: ref,
        category: "ref_orfano_staff",
        detail: "Cliente associato valorizzato per utente non Cliente (informativo).",
      });
    }
  }

  try {
    const allowlist = await cleanupClientPortalAllowlist(sbUser, usersRes.users, caller.callerId);
    issues.push(...allowlist.issues);
    return {
      ok: true,
      issues,
      allowlistCleaned: allowlist.cleaned,
      knownClientiCount: knownClienti.size,
      scannedAt: new Date().toISOString(),
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore pulizia allowlist." };
  }
}
