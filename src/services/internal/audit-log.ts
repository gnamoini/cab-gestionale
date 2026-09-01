import { resolveWriteActorIdFromClient } from "@/lib/audit/resolve-actor";
import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import {
  flushAllModificaLogs,
  queueModificaLog,
  registerModificaLogPageLifecycleFlush,
} from "@/src/services/internal/log-modifiche-batcher";
import { recordAuditEvent } from "@/lib/audit/record";
import type { AuditAzione, AuditPayload } from "@/lib/audit/legacy-payload";

export { AuditLogWriteError } from "@/lib/audit/errors";
export { auditDiff, auditSnapshot } from "@/lib/audit/build-diff";
export { auditContext } from "@/lib/gestionale-log/log-summary";
export type { AuditLogContext } from "@/lib/audit/record";
export type { AuditAzione, AuditPayload };

async function writeModificaLogImmediate(
  client: SupabaseClient,
  input: {
    entita: string;
    entita_id: string;
    azione: AuditAzione;
    payload?: AuditPayload;
    autore_id?: string | null;
    event_type?: string;
    actor_type?: string;
    correlation_id?: string | null;
    request_id?: string | null;
  },
): Promise<void> {
  const autoreId =
    input.autore_id !== undefined ? input.autore_id : await resolveWriteActorIdFromClient(client);
  await recordAuditEvent(client, {
    entityType: input.entita,
    entityId: input.entita_id,
    action: input.azione,
    payload: input.payload,
    autoreId: autoreId,
    eventType: (input.event_type as import("@/lib/audit/types").AuditEventType) ?? "DATA_CHANGE",
    actorType: input.actor_type as import("@/lib/audit/types").AuditActorType | undefined,
    correlationId: input.correlation_id,
    requestId: input.request_id,
  });
}

function safeWriteModificaLogImmediate(
  client: SupabaseClient,
  input: Parameters<typeof writeModificaLogImmediate>[1],
): Promise<void> {
  return writeModificaLogImmediate(client, input).catch((error) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[audit-log] Scrittura log_modifiche fallita:", msg, {
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
  input: Parameters<typeof writeModificaLogImmediate>[1],
): Promise<void> {
  return queueModificaLog(flushModificaLog, client, {
    client,
    ...input,
  });
}

export async function commitCriticalMutation<T>(
  client: SupabaseClient,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await fn();
  await flushPendingModificaLogs(client);
  return result;
}

export async function flushPendingModificaLogs(_client: SupabaseClient): Promise<void> {
  void _client;
  await flushAllModificaLogs(flushModificaLog);
}
