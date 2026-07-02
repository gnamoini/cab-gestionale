import type { SupabaseClient } from "@supabase/supabase-js";

export type SecurityAuditAction =
  | "RESET_PASSWORD_ADMIN"
  | "DISATTIVAZIONE UTENTE"
  | "RIATTIVAZIONE UTENTE"
  | "ACCESS_SECURITY";

type SecurityAuditPayload = {
  actor_id: string;
  target_user_id: string;
  action: SecurityAuditAction;
  timestamp: string;
  result: "success" | "failure";
};

/** Payload audit minimo — no email, token, redirect, dati auth sensibili. */
export async function writeSecurityAuditLog(
  admin: SupabaseClient,
  input: {
    actorUserId: string;
    targetUserId: string;
    action: SecurityAuditAction;
    result: "success" | "failure";
    entitaAzione?: string;
  },
): Promise<void> {
  const payload: SecurityAuditPayload = {
    actor_id: input.actorUserId,
    target_user_id: input.targetUserId,
    action: input.action,
    timestamp: new Date().toISOString(),
    result: input.result,
  };

  const { error } = await admin.from("log_modifiche").insert({
    entita: "security",
    entita_id: input.targetUserId,
    azione: input.entitaAzione ?? input.action,
    autore_id: input.actorUserId,
    payload,
  });
  if (error) console.warn("[security] audit log:", error.message);
}
