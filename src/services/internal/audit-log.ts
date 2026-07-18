import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import {
  auditContext,
  buildLogModificaSummary,
  mergePayloadWithSummary,
  type AuditLogContext,
} from "@/lib/gestionale-log/log-summary";
import { getOrCreateUndoSessionId } from "@/lib/gestionale-log/undo-session";
import { emitCabSyncEvent } from "@/lib/sync/cab-sync-bus";
import {
  flushAllModificaLogs,
  queueModificaLog,
  registerModificaLogPageLifecycleFlush,
} from "@/src/services/internal/log-modifiche-batcher";
import { errMessageFromSupabase } from "@/src/utils/supabaseErrorHandler";

export type AuditAzione = "CREATE" | "UPDATE" | "DELETE" | "RESTORE";

export type AuditPayload = unknown;

export class AuditLogWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditLogWriteError";
  }
}

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
    throw new AuditLogWriteError(
      `autore_id assente per log ${input.entita}/${input.entita_id} (${input.azione})`,
    );
  }

  const enriched = enrichPayloadWithUndoSession(input.payload);
  const summary = buildLogModificaSummary({
    entita: input.entita,
    entita_id: input.entita_id,
    azione: input.azione,
    payload: enriched,
  });
  const payload = mergePayloadWithSummary(enriched, summary);

  const { data, error } = await client
    .from("log_modifiche")
    .insert({
      entita: input.entita,
      entita_id: input.entita_id,
      azione: input.azione,
      autore_id: autore,
      payload,
    })
    .select("id")
    .single();
  if (error) {
    throw new AuditLogWriteError(
      errMessageFromSupabase(error, { action: "create" }),
    );
  }
  const logId = data?.id;
  if (typeof logId === "string" && logId && typeof window !== "undefined") {
    emitCabSyncEvent({
      type: "entity_created",
      entity: "log_modifiche",
      id: logId,
      table: "log_modifiche",
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

const flushModificaLog = (item: {
  client: SupabaseClient;
  entita: string;
  entita_id: string;
  azione: AuditAzione;
  payload?: AuditPayload;
  autore_id?: string | null;
}) => writeModificaLogImmediate(item.client, item);

if (typeof window !== "undefined") {
  registerModificaLogPageLifecycleFlush((item) => safeWriteModificaLogImmediate(item.client, item));
}

/** Scrive su `log_modifiche`; UPDATE magazzino in batch (~3.5s), altre entità subito. */
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
  return queueModificaLog(flushModificaLog, client, {
    client,
    ...input,
  });
}

/** Mutazione feed-eligible: commit applicativo → flush audit pendenti → return. */
export async function commitCriticalMutation<T>(
  client: SupabaseClient,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await fn();
  await flushPendingModificaLogs(client);
  return result;
}

/** Scrive subito tutti i log UPDATE in coda (es. logout, fine mutazione critica). */
export async function flushPendingModificaLogs(client: SupabaseClient): Promise<void> {
  await flushAllModificaLogs(flushModificaLog);
}

export { auditContext };
export type { AuditLogContext } from "@/lib/gestionale-log/log-summary";
