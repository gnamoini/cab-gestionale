"use server";

import { createServiceAdminClient } from "@/lib/supabase/create-service-admin-client.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAdminCaller } from "@/lib/auth/assert-admin-caller.server";
import { profileDisplayName } from "@/lib/auth/profile-display-name";
import { PROFILES_COLUMNS } from "@/lib/db/table-select-columns";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import { CANONICAL_ROLES, resolveRole, type AppRole } from "@/lib/auth/rbac";
import {
  accountEnabledFromAuthUser,
  bannedUntilFromAuthUser,
  type AuthUserBanFields,
} from "@/lib/auth/user-ban-state";
import { revokeUserSessionsAdmin } from "@/lib/auth/revoke-user-sessions.server";
import {
  resolvePasswordResetOriginFromEnv,
  resolvePasswordResetRedirectUrl,
  sendPasswordResetEmail,
} from "@/lib/auth/password-reset";
import { writeSecurityAuditLog } from "@/lib/security/security-audit-log";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { normalizeUsername, usernameFieldError } from "@/src/lib/auth/username";
import { normalizeClienteRef, validateClienteAssociationForRole } from "@/src/lib/auth/cliente-portal-scope";
import { loadKnownClientiSetFromMezzi } from "@/src/lib/auth/load-known-clienti";
import { validateCreateUserInput } from "@/lib/validation/admin-user-validation";
import {
  validateDeleteUserByAdminInput,
  validateSetUserAccountEnabledInput,
  validateLastAdminTarget,
  validateUserId,
} from "@/lib/validation/security-actions-validation";
import type {
  CheckUsernameAvailabilityResult,
  CreateUserByAdminInput,
  CreateUserByAdminResult,
  DeleteUserByAdminResult,
  ListUsersByAdminResult,
  ResetGlobalChangeLogsResult,
  SecurityUserAdminRow,
  SendPasswordResetByAdminResult,
  SetUserAccountEnabledResult,
} from "@/src/actions/admin-users.types";
import type { ProfileRow } from "@/src/types/supabase-tables";
import { clearServerAuthSnapshotCacheForUser } from "@/src/lib/auth/server-session-cache";
import { invalidateRbacTruthServer } from "@/src/lib/rbac/invalidate-rbac-truth.server";

const RUOLI = CANONICAL_ROLES;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function serviceAdmin(url: string, serviceKey: string) {
  return createServiceAdminClient(url, serviceKey);
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

async function writeSecurityDeleteLog(
  admin: SupabaseClient,
  input: { targetUserId: string; actorUserId: string; nome: string; role: AppRole; actorName?: string },
) {
  const { error } = await admin.from("log_modifiche").insert({
    entita: "security",
    entita_id: input.targetUserId,
    azione: "ELIMINAZIONE UTENTE",
    autore_id: input.actorUserId,
    payload: {
      event: "ELIMINAZIONE UTENTE",
      user: input.nome,
      role: input.role,
      actor: input.actorName,
      compact: `(ELIMINAZIONE UTENTE, ${input.nome}, ${input.role}, ${input.actorName ?? "Admin"}, ${new Date().toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })})`,
    },
  });
  if (error) console.warn("[security] log eliminazione utente:", error.message);
}

function userRowFrom(
  profile: ProfileRow | undefined,
  authUser?: AuthUserBanFields & {
    id: string;
    email?: string | null;
    created_at?: string;
    last_sign_in_at?: string | null;
  },
): SecurityUserAdminRow {
  const givenName = profile?.nome?.trim() || authUser?.email?.split("@")[0]?.trim() || "Utente";
  const cognome =
    typeof profile?.cognome === "string" && profile.cognome.trim() ? profile.cognome.trim() : null;
  return {
    id: profile?.id ?? authUser?.id ?? "",
    nome: givenName,
    cognome,
    username: profile?.username?.trim() || null,
    email: authUser?.email ?? "",
    ruolo: resolveRole(profile?.role_key),
    clienteRef: normalizeClienteRef(profile?.cliente_ref),
    createdAt: authUser?.created_at ?? profile?.created_at ?? null,
    lastSignInAt: authUser?.last_sign_in_at ?? null,
    accountEnabled: accountEnabledFromAuthUser(authUser),
    bannedUntil: bannedUntilFromAuthUser(authUser),
  };
}
/**
 * Crea utente Auth + profilo (trigger) + permessi pieni se ruolo admin.
 * Richiede sessione admin e `SUPABASE_SERVICE_ROLE_KEY` sul server.
 */
export async function createUserByAdminAction(input: CreateUserByAdminInput): Promise<CreateUserByAdminResult> {
  const nome = input.nome?.trim() ?? "";
  const cognome = input.cognome?.trim() || null;
  const username = normalizeUsername(input.username ?? "");
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  const ruolo = resolveRole(input.ruolo);
  const clienteRef = normalizeClienteRef(input.clienteRef);

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

  const sbCaller = await createSupabaseServerUserClient();
  const { data: callerProfile, error: callerProfileErr } = await sbCaller
    .from("profiles")
    .select("company_id")
    .eq("id", caller.callerId)
    .maybeSingle();
  if (callerProfileErr) return { ok: false, message: callerProfileErr.message };
  if (!callerProfile?.company_id) {
    return {
      ok: false,
      message: "Impossibile creare utente: tenant admin non configurato. Assegna company_id al profilo admin.",
    };
  }
  const callerCompanyId = callerProfile.company_id;

  let knownClienti: Set<string>;
  try {
    knownClienti = await loadKnownClientiSetFromMezzi(admin);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Errore caricamento anagrafica clienti.",
    };
  }
  const clienteRefErr = validateClienteAssociationForRole(ruolo, clienteRef, knownClienti);
  if (clienteRefErr) return { ok: false, message: clienteRefErr };

  const { data: usernameTaken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (usernameTaken) return { ok: false, message: "Username già utilizzato." };

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      cab_nome: nome,
      cab_cognome: cognome,
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
    .select("id, nome, role_key, username")
    .eq("id", userId)
    .maybeSingle();
  if (verifyErr || !row) {
    return {
      ok: false,
      message:
        "Utente Auth creato ma il profilo non risulta presente. Verifica trigger `handle_new_user` e migrazioni; potrebbe essere necessario aggiornare il profilo da Supabase Dashboard.",
    };
  }

  if (clienteRef != null || ruolo === "cliente") {
    const { error: clienteErr } = await admin.from("profiles").update({ cliente_ref: clienteRef }).eq("id", userId);
    if (clienteErr) return { ok: false, message: clienteErr.message };
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

  const { error: companyErr } = await admin
    .from("profiles")
    .update({ company_id: callerCompanyId })
    .eq("id", userId);
  if (companyErr) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      /* best effort */
    }
    return { ok: false, message: companyErr.message };
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

  const { data: profiles, error: profilesErr } = await admin.from("profiles").select(PROFILES_COLUMNS);
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

export async function deleteUserByAdminAction(userId: string): Promise<DeleteUserByAdminResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const parsed = validateDeleteUserByAdminInput(userId, caller.callerId);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const admin = serviceAdmin(caller.url, caller.serviceKey);

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, nome, role_key")
    .eq("id", parsed.userId)
    .maybeSingle();
  if (profileErr) return { ok: false, message: profileErr.message };
  if (!profile) return { ok: false, message: "Profilo non trovato." };

  const targetRole = resolveRole((profile as ProfileRow).role_key);
  const lastAdminErr = await validateLastAdminTarget(admin, parsed.userId, targetRole, "delete");
  if (lastAdminErr) return { ok: false, message: lastAdminErr };

  const nome = (profile as ProfileRow).nome?.trim() || "Utente";
  await writeSecurityDeleteLog(admin, {
    targetUserId: parsed.userId,
    actorUserId: caller.callerId,
    nome,
    role: targetRole,
    actorName: caller.callerName,
  });

  const { error: deleteErr } = await admin.auth.admin.deleteUser(parsed.userId);
  if (deleteErr) {
    return { ok: false, message: deleteErr.message || "Eliminazione utente non riuscita." };
  }

  clearServerAuthSnapshotCacheForUser(parsed.userId);
  invalidateRbacTruthServer();
  return { ok: true };
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

/** Invia email reset password (admin). Messaggio sempre generico — no leak email. */
export async function sendPasswordResetByAdminAction(userId: string): Promise<SendPasswordResetByAdminResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const idErr = validateUserId(userId);
  if (idErr) return { ok: false, message: idErr };

  const origin = resolvePasswordResetOriginFromEnv();
  if (!origin) {
    return {
      ok: false,
      message: "Reset password non configurato sul server (manca NEXT_PUBLIC_SITE_URL).",
    };
  }

  const admin = serviceAdmin(caller.url, caller.serviceKey);
  const authLookup = await admin.auth.admin.getUserById(userId.trim());
  if (authLookup.error || !authLookup.data.user?.email) {
    await writeSecurityAuditLog(admin, {
      actorUserId: caller.callerId,
      targetUserId: userId.trim(),
      action: "RESET_PASSWORD_ADMIN",
      result: "failure",
    });
    return { ok: true };
  }

  const sbUser = await createSupabaseServerUserClient();
  const redirectTo = resolvePasswordResetRedirectUrl(origin);
  const res = await sendPasswordResetEmail(sbUser, authLookup.data.user.email, redirectTo);

  await writeSecurityAuditLog(admin, {
    actorUserId: caller.callerId,
    targetUserId: userId.trim(),
    action: "RESET_PASSWORD_ADMIN",
    result: res.ok ? "success" : "failure",
  });

  if (!res.ok) {
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }
  return { ok: true };
}

/** Disattiva/riattiva account via Supabase ban_duration (Auth SSOT). */
export async function setUserAccountEnabledByAdminAction(input: {
  userId: string;
  enabled: boolean;
}): Promise<SetUserAccountEnabledResult> {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false, message: caller.message };

  const parsed = validateSetUserAccountEnabledInput(input, caller.callerId);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const admin = serviceAdmin(caller.url, caller.serviceKey);

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, nome, role_key")
    .eq("id", parsed.userId)
    .maybeSingle();
  if (profileErr) return { ok: false, message: profileErr.message };
  if (!profile) return { ok: false, message: "Profilo non trovato." };

  const targetRole = resolveRole((profile as ProfileRow).role_key);
  if (!parsed.enabled) {
    const lastAdminErr = await validateLastAdminTarget(admin, parsed.userId, targetRole, "disable");
    if (lastAdminErr) return { ok: false, message: lastAdminErr };
  }

  const banDuration = parsed.enabled ? "none" : "876000h";
  const { error: banErr } = await admin.auth.admin.updateUserById(parsed.userId, {
    ban_duration: banDuration,
  });
  if (banErr) {
    await writeSecurityAuditLog(admin, {
      actorUserId: caller.callerId,
      targetUserId: parsed.userId,
      action: parsed.enabled ? "RIATTIVAZIONE UTENTE" : "DISATTIVAZIONE UTENTE",
      result: "failure",
    });
    return { ok: false, message: banErr.message || "Operazione non riuscita." };
  }

  if (!parsed.enabled) {
    await revokeUserSessionsAdmin({ admin, targetAccessJwt: null });
  }

  clearServerAuthSnapshotCacheForUser(parsed.userId);
  invalidateRbacTruthServer();

  await writeSecurityAuditLog(admin, {
    actorUserId: caller.callerId,
    targetUserId: parsed.userId,
    action: parsed.enabled ? "RIATTIVAZIONE UTENTE" : "DISATTIVAZIONE UTENTE",
    result: "success",
  });

  return { ok: true };
}
