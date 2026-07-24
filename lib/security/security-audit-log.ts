import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAuditEvent } from "@/lib/audit/record";

export type SecurityAuditAction =
  | "RESET_PASSWORD_ADMIN"
  | "DISATTIVAZIONE UTENTE"
  | "RIATTIVAZIONE UTENTE"
  | "ACCESS_SECURITY";

export class SecurityAuditLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityAuditLogError";
  }
}

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

  try {
    await recordAuditEvent(admin as never, {
      entityType: "security",
      entityId: input.targetUserId,
      action: input.entitaAzione ?? input.action,
      eventType: "SECURITY_ACTION",
      actorType: "USER",
      autoreId: input.actorUserId,
      severity: input.result === "failure" ? "warning" : "info",
      module: "security",
      title: input.action,
      payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SecurityAuditLogError(message);
  }
}
