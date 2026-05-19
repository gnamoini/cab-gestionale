import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { getOrCreateUndoSessionId } from "@/lib/gestionale-log/undo-session";

export type AuditAzione = "CREATE" | "UPDATE" | "DELETE" | "RESTORE";

export type AuditPayload = unknown;

export function auditSnapshot(row: unknown): AuditPayload {
  return { snapshot: row };
}

export function auditDiff(before: unknown, after: unknown): AuditPayload {
  return { before, after };
}

function enrichPayloadWithUndoSession(payload: AuditPayload | undefined): AuditPayload | null {
  if (typeof window === "undefined") return payload ?? null;
  const sessionId = getOrCreateUndoSessionId();
  if (!sessionId) return payload ?? null;
  const base =
    payload != null && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : payload != null
        ? { data: payload }
        : {};
  return { ...base, undo_session_id: sessionId };
}

export async function writeModificaLog(
  client: SupabaseClient,
  input: {
    entita: string;
    entita_id: string;
    azione: AuditAzione;
    payload?: AuditPayload;
    autore_id?: string | null;
  },
): Promise<void> {
  let autore = input.autore_id;
  if (autore === undefined) {
    const { data: userData } = await client.auth.getUser();
    autore = userData.user?.id ?? null;
  }
  if (!autore) return;

  await client.from("log_modifiche").insert({
    entita: input.entita,
    entita_id: input.entita_id,
    azione: input.azione,
    autore_id: autore,
    payload: enrichPayloadWithUndoSession(input.payload),
  });
}
