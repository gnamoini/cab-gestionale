import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import {
  auditContext,
  buildLogModificaSummary,
  mergePayloadWithSummary,
  type AuditLogContext,
} from "@/lib/gestionale-log/log-summary";
import { getOrCreateUndoSessionId } from "@/lib/gestionale-log/undo-session";
import { flushAllModificaLogs, queueModificaLog } from "@/src/services/internal/log-modifiche-batcher";

export type AuditAzione = "CREATE" | "UPDATE" | "DELETE" | "RESTORE";

export type AuditPayload = unknown;

export function auditSnapshot(row: unknown, context?: AuditLogContext): AuditPayload {
  const base = { snapshot: row };
  if (context?.oggetto) return { ...base, context };
  return base;
}

export function auditDiff(before: unknown, after: unknown, context?: AuditLogContext): AuditPayload {
  const base = { before, after };
  if (context?.oggetto) return { ...base, context };
  return base;
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

function logModificaWriteError(error: unknown, meta: Record<string, unknown>): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.warn("[audit-log] Scrittura log_modifiche fallita:", msg, meta);
}

async function writeModificaLogImmediate(
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
  if (!autore) {
    console.warn("[audit-log] autore_id assente, log saltato:", {
      entita: input.entita,
      entita_id: input.entita_id,
      azione: input.azione,
    });
    return;
  }

  const enriched = enrichPayloadWithUndoSession(input.payload);
  const summary = buildLogModificaSummary({
    entita: input.entita,
    entita_id: input.entita_id,
    azione: input.azione,
    payload: enriched,
  });
  const payload = mergePayloadWithSummary(enriched, summary);

  const { error } = await client.from("log_modifiche").insert({
    entita: input.entita,
    entita_id: input.entita_id,
    azione: input.azione,
    autore_id: autore,
    payload,
  });
  if (error) {
    logModificaWriteError(error, {
      entita: input.entita,
      entita_id: input.entita_id,
      azione: input.azione,
    });
  }
}

function safeWriteModificaLogImmediate(
  client: SupabaseClient,
  input: {
    entita: string;
    entita_id: string;
    azione: AuditAzione;
    payload?: AuditPayload;
    autore_id?: string | null;
  },
): Promise<void> {
  return writeModificaLogImmediate(client, input).catch((error) => {
    logModificaWriteError(error, {
      entita: input.entita,
      entita_id: input.entita_id,
      azione: input.azione,
    });
  });
}

/** Scrive su `log_modifiche` con batching UPDATE (debounce ~3.5s per stessa entità). */
export function writeModificaLog(
  client: SupabaseClient,
  input: {
    entita: string;
    entita_id: string;
    azione: AuditAzione;
    payload?: AuditPayload;
    autore_id?: string | null;
  },
): Promise<void> {
  return queueModificaLog((item) => safeWriteModificaLogImmediate(item.client, item), client, {
    client,
    ...input,
  });
}

/** Scrive subito tutti i log UPDATE in coda (es. logout). Non propaga errori al chiamante. */
export async function flushPendingModificaLogs(client: SupabaseClient): Promise<void> {
  await flushAllModificaLogs((item) => safeWriteModificaLogImmediate(item.client, item));
}

export { auditContext };
export type { AuditLogContext } from "@/lib/gestionale-log/log-summary";
