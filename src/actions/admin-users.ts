"use server";

import { createClient } from "@supabase/supabase-js";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import type { RuoloProfile } from "@/src/types/supabase-tables";

export type CreateUserByAdminInput = {
  nome: string;
  email: string;
  password: string;
  ruolo: RuoloProfile;
};

export type CreateUserByAdminResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

const RUOLI: readonly RuoloProfile[] = ["admin", "tecnico", "viewer"];

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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

/**
 * Crea utente Auth + profilo (trigger) + permessi pieni se ruolo admin.
 * Richiede sessione admin e `SUPABASE_SERVICE_ROLE_KEY` sul server.
 */
export async function createUserByAdminAction(input: CreateUserByAdminInput): Promise<CreateUserByAdminResult> {
  const nome = input.nome?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  const ruolo = input.ruolo;

  if (!nome) return { ok: false, message: "Il nome è obbligatorio." };
  if (!email || !isValidEmail(email)) return { ok: false, message: "Email non valida." };
  if (password.length < 6) return { ok: false, message: "La password deve avere almeno 6 caratteri." };
  if (!RUOLI.includes(ruolo)) return { ok: false, message: "Ruolo non valido." };

  let serviceKey: string;
  try {
    serviceKey = assertSupabaseServiceRoleKey();
  } catch {
    return {
      ok: false,
      message: "Creazione utenti non configurata sul server (manca SUPABASE_SERVICE_ROLE_KEY).",
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

  const { data: prof, error: profErr } = await sbUser.from("profiles").select("ruolo").eq("id", caller.id).maybeSingle();
  if (profErr) return { ok: false, message: profErr.message };
  if (prof?.ruolo !== "admin") {
    return { ok: false, message: "Operazione riservata agli amministratori." };
  }

  const url = assertSupabasePublicEnv().url;
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      cab_nome: nome,
      cab_ruolo: ruolo,
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

  const { data: row, error: verifyErr } = await admin.from("profiles").select("id, nome, ruolo").eq("id", userId).maybeSingle();
  if (verifyErr || !row) {
    return {
      ok: false,
      message:
        "Utente Auth creato ma il profilo non risulta presente. Verifica trigger `handle_new_user` e migrazioni; potrebbe essere necessario aggiornare il profilo da Supabase Dashboard.",
    };
  }

  return { ok: true, userId };
}
