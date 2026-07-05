"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILES_COLUMNS } from "@/lib/db/table-select-columns";
import {
  normalizeClienteRef,
  roleHasClientPortalAccess,
  validateClienteAssociationForRole,
} from "@/src/lib/auth/cliente-portal-scope";
import { loadKnownClientiSetFromMezzi } from "@/src/lib/auth/load-known-clienti";
import { normalizeUsername } from "@/src/lib/auth/username";
import { resolveRole, ROLE_LABELS, type AppRole } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { createServiceAdminClient } from "@/lib/supabase/create-service-admin-client.server";
import { assertAdminCaller } from "@/lib/auth/assert-admin-caller.server";
import { listUsersByAdminAction } from "@/src/actions/admin-users";
import type { SecurityUserAdminRow } from "@/src/actions/admin-users.types";
import { isUserBanned } from "@/lib/auth/user-ban-state";
import {
  loadAllRolePageAccess,
  loadAllUserPageOverrideRows,
  listAllRoles,
  deleteUserPageOverride,
  upsertUserPageOverride,
} from "@/src/lib/rbac/load-rbac-data";
import {
  validateLastAdminTarget,
  validateSecurityUserBatchPatches,
} from "@/lib/validation/security-actions-validation";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { onUserRoleChangedServer } from "@/src/lib/rbac/on-user-role-changed.server";
import { clearServerAuthSnapshotCacheForUser } from "@/src/lib/auth/server-session-cache";
import {
  computePagePermissionDraft,
  hasPagePermissionOverrides,
  planPagePermissionPersist,
  type PagePermissionDraftRow,
} from "@/lib/security/user-page-permissions";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import { canReadPage } from "@/src/lib/rbac/resolve-page-access";
import { resolvePageAccess } from "@/src/lib/rbac/resolve-page-access";
import type { ProfileRow, RoleRow } from "@/src/types/supabase-tables";

import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

export type SecurityUserModulePermissionEntry = {
  module: GestionalePermissionModule;
  canRead: boolean;
  canWrite: boolean;
};

export type SecurityUserPagePermissionEntry = {
  pageKey: string;
  accessLevel: PageAccessLevel;
};

export type SecurityUserPermissionRow = SecurityUserAdminRow & {
  clientLavorazioniAccess: boolean;
  clientLavorazioniAccessFromRole: boolean;
  hasPagePermissionOverrides: boolean;
};

export type SecurityUserBatchPatch = {
  userId: string;
  nome?: string;
  cognome?: string | null;
  username?: string;
  ruolo?: string;
  clienteRef?: string | null;
  pagePermissions?: SecurityUserPagePermissionEntry[] | null;
  clearPagePermissions?: boolean;
  /** @deprecated module editor UI — convert at save boundary */
  modulePermissions?: SecurityUserModulePermissionEntry[] | null;
  clearModulePermissions?: boolean;
};

export type ListSecurityUsersPermissionsResult =
  | {
      ok: true;
      users: SecurityUserPermissionRow[];
      userPageOverrideRows: { user_id: string; page_key: string; access_level: PageAccessLevel }[];
      rolePageAccessByRole: Record<string, Record<string, PageAccessLevel>>;
      assignableRoles: Pick<RoleRow, "key" | "name">[];
      /** @deprecated compat hook */
      portalSettingsUpdatedAt: null;
      /** @deprecated compat hook */
      permissionRows: never[];
      /** @deprecated compat hook */
      rolePermissionKeysByRole: Record<string, never[]>;
    }
  | { ok: false; message: string };

export type BatchUpdateSecurityUsersResult =
  | { ok: true; updatedCount: number; roleChangedUserIds: string[] }
  | { ok: false; message: string };

function roleGrantsClientPortal(rolePageAccess: Record<string, PageAccessLevel>, roleKey: string): boolean {
  const access = rolePageAccess.lavorazioni_clienti ?? seedPageAccessForRole(roleKey).lavorazioni_clienti ?? "none";
  return access === "read" || access === "write";
}

function toPermissionRow(
  user: SecurityUserAdminRow,
  userPageOverrideRows: { user_id: string; page_key: string; access_level: PageAccessLevel }[],
  rolePageAccessByRole: Map<string, Record<string, PageAccessLevel>>,
): SecurityUserPermissionRow {
  const roleKey = resolveRole(user.ruolo);
  const rolePageAccess = rolePageAccessByRole.get(roleKey) ?? seedPageAccessForRole(roleKey);
  const fromRole = roleGrantsClientPortal(rolePageAccess, roleKey);
  return {
    ...user,
    clientLavorazioniAccessFromRole: fromRole,
    clientLavorazioniAccess: fromRole,
    hasPagePermissionOverrides: hasPagePermissionOverrides(user.id, userPageOverrideRows),
  };
}

async function deleteAllUserPageOverrides(admin: SupabaseClient, userId: string): Promise<void> {
  const { error } = await admin.from("user_page_overrides").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

async function applyUserModulePermissions(
  admin: SupabaseClient,
  userId: string,
  modulePermissions: SecurityUserModulePermissionEntry[] | null,
  userRole?: AppRole,
  rolePageAccess?: Record<string, PageAccessLevel>,
): Promise<boolean> {
  if (!modulePermissions?.length) {
    await deleteAllUserPageOverrides(admin, userId);
    return true;
  }
  if (userRole === "guest") {
    throw new Error(`Il ruolo ${ROLE_LABELS.guest} non ammette override permessi.`);
  }
  const { GESTIONALE_PAGES, pageAccessFromLevel, modulesForPage } = await import("@/src/lib/permissions/gestionale-pages");
  const roleKey = userRole ?? "guest";
  const roleAccess = rolePageAccess ?? seedPageAccessForRole(roleKey);
  const pagePermissions: SecurityUserPagePermissionEntry[] = [];
  for (const page of GESTIONALE_PAGES) {
    const modulesForPageList = modulesForPage(page);
    const entries = modulePermissions.filter((e) => modulesForPageList.includes(e.module));
    if (!entries.length) continue;
    const canRead = entries.some((e) => e.canRead);
    const canWrite = entries.some((e) => e.canWrite) && canRead;
    const roleLevel = roleAccess[page.key] ?? "none";
    const roleAccessObj = pageAccessFromLevel(roleLevel);
    const effectiveRead = canRead;
    const effectiveWrite = canWrite;
    if (effectiveRead === roleAccessObj.canRead && effectiveWrite === roleAccessObj.canWrite) continue;
    pagePermissions.push({
      pageKey: page.key,
      accessLevel: effectiveWrite ? "write" : effectiveRead ? "read" : "none",
    });
  }
  return applyUserPagePermissions(admin, userId, pagePermissions.length ? pagePermissions : null, userRole, roleAccess);
}

async function applyUserPagePermissions(
  admin: SupabaseClient,
  userId: string,
  pagePermissions: SecurityUserPagePermissionEntry[] | null,
  userRole?: AppRole,
  rolePageAccess?: Record<string, PageAccessLevel>,
): Promise<boolean> {
  await deleteAllUserPageOverrides(admin, userId);
  if (!pagePermissions?.length) return true;

  if (userRole === "guest") {
    throw new Error(`Il ruolo ${ROLE_LABELS.guest} non ammette override permessi pagina.`);
  }

  const roleKey = userRole ?? "guest";
  const roleAccess = rolePageAccess ?? seedPageAccessForRole(roleKey);
  const draft: PagePermissionDraftRow[] = computePagePermissionDraft(roleKey, roleAccess, userId, []).map((row) => {
    const entry = pagePermissions.find((e) => e.pageKey === row.pageKey);
    if (!entry) return row;
    return {
      ...row,
      overrideLevel: entry.accessLevel,
      effectiveLevel: entry.accessLevel,
      canRead: entry.accessLevel === "read" || entry.accessLevel === "write",
      canWrite: entry.accessLevel === "write",
      isCustomized: true,
    };
  });

  const plan = planPagePermissionPersist(draft);
  for (const pageKey of plan.deletes) {
    await deleteUserPageOverride(admin, userId, pageKey);
  }
  for (const upsert of plan.upserts) {
    await upsertUserPageOverride(admin, userId, upsert.pageKey, upsert.level);
  }
  return true;
}

export async function listSecurityUsersPermissionsAction(): Promise<ListSecurityUsersPermissionsResult> {
  const admin = await assertAdminCaller();
  if (!admin.ok) return { ok: false, message: admin.message };

  const usersRes = await listUsersByAdminAction();
  if (!usersRes.ok) return { ok: false, message: usersRes.message };

  const { createClient } = await import("@supabase/supabase-js");
  const serviceAdmin = createClient(admin.url, admin.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userIds = usersRes.users.map((u) => u.id);
  let userPageOverrideRows: { user_id: string; page_key: string; access_level: PageAccessLevel }[] = [];
  try {
    userPageOverrideRows = await loadAllUserPageOverrideRows(serviceAdmin, userIds);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Errore caricamento override pagine.",
    };
  }

  const assignableRoles = (await listAllRoles(serviceAdmin))
    .filter((r) => r.is_active)
    .map((r) => ({ key: r.key, name: r.name }));

  const rolePageAccessMap = await loadAllRolePageAccess(serviceAdmin);
  const uniqueRoles = [
    ...new Set([...usersRes.users.map((u) => resolveRole(u.ruolo)), ...assignableRoles.map((r) => r.key)]),
  ];
  for (const rk of uniqueRoles) {
    if (!rolePageAccessMap.has(rk)) {
      rolePageAccessMap.set(rk, seedPageAccessForRole(rk));
    }
  }

  const users = usersRes.users.map((u) => toPermissionRow(u, userPageOverrideRows, rolePageAccessMap));
  const rolePageAccessByRole = Object.fromEntries(rolePageAccessMap);

  return {
    ok: true,
    users,
    userPageOverrideRows,
    rolePageAccessByRole,
    assignableRoles,
    portalSettingsUpdatedAt: null,
    permissionRows: [],
    rolePermissionKeysByRole: Object.fromEntries(uniqueRoles.map((rk) => [rk, []])),
  };
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
          from: resolveRole(input.profileById.get(p.userId)?.role_key),
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

  const admin = createServiceAdminClient(caller.url, caller.serviceKey);
  const sbUser = await createSupabaseServerUserClient();

  const normalized = validated.patches
    .map((p) => ({
      userId: p.userId,
      nome: p.nome,
      cognome: p.cognome,
      username: p.username,
      ruolo: p.ruolo != null ? resolveRole(p.ruolo) : undefined,
      clienteRef: p.clienteRef,
      pagePermissions: p.pagePermissions,
      clearPagePermissions: p.clearPagePermissions,
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

  const rolePageAccessMap = await loadAllRolePageAccess(admin);

  for (const patch of normalized) {
    const authLookup = await admin.auth.admin.getUserById(patch.userId);
    if (authLookup.error) {
      return { ok: false, message: authLookup.error.message };
    }
    if (isUserBanned(authLookup.data.user)) {
      return {
        ok: false,
        message: "Impossibile modificare un utente disattivato. Riattivalo prima di applicare altre modifiche.",
      };
    }
  }

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

    if (patch.cognome !== undefined) {
      const currentCognome =
        typeof profile.cognome === "string" && profile.cognome.trim() ? profile.cognome.trim() : null;
      const nextCognome = patch.cognome?.trim() || null;
      if (nextCognome !== currentCognome) {
        const { error } = await admin.from("profiles").update({ cognome: nextCognome }).eq("id", patch.userId);
        if (error) return { ok: false, message: error.message };
        await admin.auth.admin
          .updateUserById(patch.userId, {
            app_metadata: { cab_cognome: nextCognome },
          })
          .catch(() => {});
        updatedCount += 1;
      }
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

    const effectiveRole = patch.ruolo != null ? patch.ruolo : resolveRole(profile.role_key);
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

    const roleChanged = patch.ruolo != null && resolveRole(profile.role_key) !== patch.ruolo;
    if (roleChanged) {
      const prevRole = resolveRole(profile.role_key);
      if (prevRole === "admin" && patch.ruolo !== "admin") {
        const lastAdminErr = await validateLastAdminTarget(admin, patch.userId, prevRole, "role_downgrade");
        if (lastAdminErr) return { ok: false, message: lastAdminErr };
      }
      const { error: roleErr } = await admin.rpc("security_set_user_role", {
        p_user_id: patch.userId,
        p_role_key: patch.ruolo,
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

    const rolePageAccess =
      rolePageAccessMap.get(effectiveRole) ?? seedPageAccessForRole(effectiveRole);

    if (patch.pagePermissions !== undefined) {
      if (effectiveRole === "guest") {
        return {
          ok: false,
          message: `Il ruolo ${ROLE_LABELS.guest} non ammette override permessi pagina.`,
        };
      }
      try {
        if (
          await applyUserPagePermissions(
            admin,
            patch.userId,
            patch.pagePermissions.length ? patch.pagePermissions : null,
            effectiveRole,
            rolePageAccess,
          )
        ) {
          updatedCount += 1;
        }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Errore salvataggio permessi pagina." };
      }
    } else if (patch.clearPagePermissions === true) {
      try {
        if (await applyUserPagePermissions(admin, patch.userId, null, effectiveRole)) {
          updatedCount += 1;
        }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Errore permessi pagina." };
      }
    } else if (patch.modulePermissions !== undefined) {
      if (effectiveRole === "guest") {
        return {
          ok: false,
          message: `Il ruolo ${ROLE_LABELS.guest} non ammette override permessi.`,
        };
      }
      try {
        if (await applyUserModulePermissions(admin, patch.userId, patch.modulePermissions, effectiveRole, rolePageAccess)) {
          updatedCount += 1;
        }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Errore salvataggio permessi." };
      }
    } else if (patch.clearModulePermissions === true) {
      try {
        if (await applyUserPagePermissions(admin, patch.userId, null, effectiveRole)) {
          updatedCount += 1;
        }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Errore permessi pagina." };
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

/** Report associazioni cliente (no auto-fix su profili). */
export async function auditClienteAssociationsAction(): Promise<ClienteAssociationAuditActionResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const usersRes = await listUsersByAdminAction();
  if (!usersRes.ok) return { ok: false, message: usersRes.message };

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(caller.url, caller.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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
    } else if (roleHasClientPortalAccess(user.ruolo)) {
      const resolved = resolvePageAccess({
        userId: user.id,
        roleKey: user.ruolo,
        rolePageAccess: seedPageAccessForRole(user.ruolo),
        userPageOverrides: {},
      });
      if (!canReadPage(resolved, "lavorazioni_clienti")) {
        issues.push({
          userId: user.id,
          nome: user.nome,
          email: user.email,
          ruolo: user.ruolo,
          clienteRef: ref,
          category: "allowlist_non_autorizzato",
          detail: "Ruolo con accesso portale ma pagina lavorazioni_clienti non abilitata.",
        });
      }
    }
  }

  return {
    ok: true,
    issues,
    allowlistCleaned: [],
    knownClientiCount: knownClienti.size,
    scannedAt: new Date().toISOString(),
  };
}
