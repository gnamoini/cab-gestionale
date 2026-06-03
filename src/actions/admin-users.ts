"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import { APP_ROLES, resolveRole, hasPermission, type AppRole } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { normalizeUsername, usernameFieldError } from "@/src/lib/auth/username";
import { validateCreateUserInput } from "@/lib/validation/admin-user-validation";
import { validateUpdateUserRoleInput } from "@/lib/validation/security-actions-validation";
import type { ProfileRow } from "@/src/types/supabase-tables";
import { clearServerAuthSnapshotCacheForUser } from "@/src/lib/auth/server-session-cache";
import { invalidateServerRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth.server";

export type CreateUserByAdminInput = {
  nome: string;
  username: string;
  email: string;
  password: string;
  ruolo: AppRole;
};

export type CreateUserByAdminResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

export type CheckUsernameAvailabilityResult =
  | { ok: true; available: boolean }
  | { ok: false; message: string };

export type SecurityUserAdminRow = {
  id: string;
  nome: string;
  username: string | null;
  email: string;
  ruolo: AppRole;
  createdAt: string | null;
  lastSignInAt: string | null;
};

export type ListUsersByAdminResult =
  | { ok: true; users: SecurityUserAdminRow[] }
  | { ok: false; message: string };

export type UpdateUserRoleByAdminResult =
  | { ok: true; user: SecurityUserAdminRow | null }
  | { ok: false; message: string };

export type ResetGlobalChangeLogsResult = { ok: true; deletedCount: number | null } | { ok: false; message: string };

const RUOLI = APP_ROLES;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function assertAdminCaller(): Promise<
  | { ok: true; callerId: string; callerName: string; serviceKey: string; url: string }
  | { ok: false; message: string }
> {
  let serviceKey: string;
  try {
    serviceKey = assertSupabaseServiceRoleKey();
  } catch {
    return {
      ok: false,
      message: "Gestione utenti non configurata sul server (manca SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const sbUser = await createSupabaseServerUserClient();
  const {
    data: { user: caller },
    error: callerErr,
  } = await sbUser.auth.getUser();
  if (callerErr || !caller) {
    return { ok: false, message: "Sessione non valida. Effettua di nuovo l'accesso." };
  }

  const { data: prof, error: profErr } = await sbUser.from("profiles").select("nome, ruolo").eq("id", caller.id).maybeSingle();
  if (profErr) return { ok: false, message: profErr.message };
  if (!hasPermission(prof?.ruolo, "manageUsers")) {
    return { ok: false, message: "Operazione riservata agli amministratori." };
  }

  const url = assertSupabasePublicEnv().url;
  const callerName =
    typeof prof?.nome === "string" && prof.nome.trim()
      ? prof.nome.trim()
      : caller.email?.split("@")[0]?.trim() || "Admin";
  return { ok: true, callerId: caller.id, callerName, serviceKey, url };
}

function serviceAdmin(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function seedAdminPermissions(admin: { from: (t: string) => { upsert: (rows: unknown[], o?: { onConflict?: string }) => PromiseLike<{ error: { message: string } | null }> } }, userId: string) {
  const rows = GESTIONALE_PERMISSION_MODULES.map((module) => ({
    user_id: userId,
    module,
    can_read: true,
    can_write: true,
    can_admin: true,
  }));
  const { error } = await admin.from("user_permissions").upsert(rows, { onConflict: "user_id,module" });
  if (error) throw new Error(error.message);
}

async function writeSecurityLog(
  admin: SupabaseClient,
  input: { targetUserId: string; actorUserId: string; nome: string; role: AppRole; actorName?: string; previousRole?: AppRole },
) {
  const isRoleChange = input.previousRole != null && input.previousRole !== input.role;
  const { error } = await admin.from("log_modifiche").insert({
    entita: "security",
    entita_id: input.targetUserId,
    azione: isRoleChange ? "MODIFICA RUOLO" : "CREATE_USER",
    autore_id: input.actorUserId,
    payload: {
      event: isRoleChange ? "MODIFICA RUOLO" : "CREAZIONE UTENTE",
      user: input.nome,
      previousRole: input.previousRole,
      role: input.role,
      actor: input.actorName,
      compact: isRoleChange
        ? `(MODIFICA RUOLO, ${input.nome}, ${input.previousRole} → ${input.role}, ${input.actorName ?? "Admin"}, ${new Date().toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })})`
        : undefined,
    },
  });
  if (error) console.warn("[security] log utente:", error.message);
}

function userRowFrom(profile: ProfileRow | undefined, authUser?: { id: string; email?: string | null; created_at?: string; last_sign_in_at?: string | null }): SecurityUserAdminRow {
  const nome = profile?.nome?.trim() || authUser?.email?.split("@")[0]?.trim() || "Utente";
  return {
    id: profile?.id ?? authUser?.id ?? "",
    nome,
    username: profile?.username?.trim() || null,
    email: authUser?.email ?? "",
    ruolo: resolveRole(profile?.ruolo),
    createdAt: authUser?.created_at ?? profile?.created_at ?? null,
    lastSignInAt: authUser?.last_sign_in_at ?? null,
  };
}

/**
 * Crea utente Auth + profilo (trigger) + permessi pieni se ruolo admin.
 * Richiede sessione admin e `SUPABASE_SERVICE_ROLE_KEY` sul server.
 */
export async function createUserByAdminAction(input: CreateUserByAdminInput): Promise<CreateUserByAdminResult> {
  const nome = input.nome?.trim() ?? "";
  const username = normalizeUsername(input.username ?? "");
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  const ruolo = resolveRole(input.ruolo);

  const validationErr = validateCreateUserInput({ nome, username, email, password, ruolo });
  if (validationErr) return { ok: false, message: validationErr };

  if (!nome) return { ok: false, message: "Il nome è obbligatorio." };
  const usernameErr = usernameFieldError(username);
  if (usernameErr) {
    return { ok: false, message: usernameErr };
  }
  if (!email || !isValidEmail(email)) return { ok: false, message: "Email non valida." };
  if (!RUOLI.includes(ruolo)) return { ok: false, message: "Ruolo non valido." };

  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };
  const admin = serviceAdmin(caller.url, caller.serviceKey);

  const { data: usernameTaken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (usernameTaken) return { ok: false, message: "Username già utilizzato." };

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      cab_nome: nome,
      cab_ruolo: ruolo,
      cab_username: username,
    },
  });

  if (createErr || !created.user) {
    const msg = createErr?.message ?? "Creazione utente non riuscita.";
    return { ok: false, message: msg };
  }

  const userId = created.user.id;

  try {
    if (ruolo === "admin") {
      await seedAdminPermissions(admin, userId);
    }
    await writeSecurityLog(admin, { targetUserId: userId, actorUserId: caller.callerId, nome, role: ruolo, actorName: caller.callerName });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Errore sconosciuto";
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      /* best effort */
    }
    return {
      ok: false,
      message: `Utente creato ma permessi admin non salvati (${detail}). L'utente è stato annullato.`,
    };
  }

  const { data: row, error: verifyErr } = await admin
    .from("profiles")
    .select("id, nome, ruolo, username")
    .eq("id", userId)
    .maybeSingle();
  if (verifyErr || !row) {
    return {
      ok: false,
      message:
        "Utente Auth creato ma il profilo non risulta presente. Verifica trigger `handle_new_user` e migrazioni; potrebbe essere necessario aggiornare il profilo da Supabase Dashboard.",
    };
  }

  if (row.username !== username) {
    const { error: usernameErr } = await admin.from("profiles").update({ username }).eq("id", userId);
    if (usernameErr) {
      const msg = usernameErr.message.includes("unique") || usernameErr.message.includes("duplicate")
        ? "Username già utilizzato."
        : usernameErr.message;
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        /* best effort */
      }
      return { ok: false, message: msg };
    }
  }

  return { ok: true, userId };
}

/** Verifica disponibilità username (solo admin sicurezza, case-insensitive). */
export async function checkUsernameAvailabilityAction(input: {
  username: string;
  excludeUserId?: string | null;
}): Promise<CheckUsernameAvailabilityResult> {
  const username = normalizeUsername(input.username ?? "");
  if (usernameFieldError(username)) {
    return { ok: true, available: false };
  }

  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("check_username_available", {
    p_username: username,
    p_exclude_user_id: input.excludeUserId ?? null,
  });

  if (error) {
    return { ok: false, message: "Impossibile verificare il nome utente. Riprova." };
  }
  return { ok: true, available: data === true };
}

export async function listUsersByAdminAction(): Promise<ListUsersByAdminResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };
  const admin = serviceAdmin(caller.url, caller.serviceKey);

  const { data: profiles, error: profilesErr } = await admin.from("profiles").select("*");
  if (profilesErr) return { ok: false, message: profilesErr.message };
  const profileRows = (profiles ?? []) as ProfileRow[];
  const profileById = new Map(profileRows.map((p) => [p.id, p]));

  const users: SecurityUserAdminRow[] = [];
  let page = 1;
  const perPage = 1000;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return { ok: false, message: error.message };
    const batch = data.users ?? [];
    for (const u of batch) {
      users.push(userRowFrom(profileById.get(u.id), u));
      profileById.delete(u.id);
    }
    if (batch.length < perPage) break;
    page += 1;
  }

  for (const profile of profileById.values()) {
    users.push(userRowFrom(profile));
  }

  users.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  return { ok: true, users };
}

export async function updateUserRoleByAdminAction(input: { userId: string; role: AppRole }): Promise<UpdateUserRoleByAdminResult> {
  const parsed = validateUpdateUserRoleInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const { userId, role: nextRole } = parsed;

  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };
  const admin = serviceAdmin(caller.url, caller.serviceKey);

  const { data: before, error: beforeErr } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (beforeErr) return { ok: false, message: beforeErr.message };
  if (!before) return { ok: false, message: "Profilo non trovato." };
  const authBefore = await admin.auth.admin.getUserById(userId).catch(() => null);
  const previousRole = resolveRole((before as ProfileRow).ruolo);
  if (previousRole === nextRole) return { ok: true, user: userRowFrom(before as ProfileRow) };

  const { data: updated, error: updateErr } = await admin
    .from("profiles")
    .update({ ruolo: nextRole })
    .eq("id", userId)
    .select("*")
    .single();
  if (updateErr) return { ok: false, message: updateErr.message };

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(authBefore?.data.user?.app_metadata ?? {}), cab_ruolo: nextRole },
  }).catch(() => {});

  const profile = updated as ProfileRow;
  await writeSecurityLog(admin, {
    targetUserId: userId,
    actorUserId: caller.callerId,
    nome: profile.nome,
    previousRole,
    role: nextRole,
    actorName: caller.callerName,
  });

  clearServerAuthSnapshotCacheForUser(userId);
  invalidateServerRuntimeTruth();

  const authLookup = await admin.auth.admin.getUserById(userId).catch(() => authBefore);
  return { ok: true, user: userRowFrom(profile, authLookup?.data.user ?? undefined) };
}

export async function resetGlobalChangeLogsByAdminAction(): Promise<ResetGlobalChangeLogsResult> {
  const ctx = await assertAdminCaller();
  if (!ctx.ok) return { ok: false, message: ctx.message };
  try {
    const admin = serviceAdmin(ctx.url, ctx.serviceKey);
    const { count, error } = await admin.from("log_modifiche").delete({ count: "exact" }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return { ok: false, message: error.message };
    await admin.from("log_modifiche").insert({
      entita: "security",
      entita_id: ctx.callerId,
      azione: "RESET_LOG_MODIFICHE",
      autore_id: ctx.callerId,
      payload: {
        event: "RESET LOG MODIFICHE",
        actor: ctx.callerName,
        deletedCount: count,
        compact: `(RESET LOG MODIFICHE, ${ctx.callerName}, ${new Date().toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })})`,
      },
    });
    return { ok: true, deletedCount: count };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Reset log non riuscito." };
  }
}
