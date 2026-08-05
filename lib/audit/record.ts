import { profileDisplayName } from "@/lib/auth/profile-display-name";
import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import {
  auditContext,
  buildLogModificaSummary,
  mergePayloadWithSummary,
  type AuditLogContext,
} from "@/lib/gestionale-log/log-summary";
import { auditDiff, auditSnapshot } from "@/lib/audit/build-diff";
import { getOrCreateUndoSessionId } from "@/lib/gestionale-log/undo-session";
import { emitCabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { AuditLogWriteError } from "@/lib/audit/errors";
import {
  buildDescriptionFromInput,
  buildTitleFromInput,
  mergePayloadWithSnapshot,
} from "@/lib/audit/build-message";
import { resolveAuditActor, requireUserActor } from "@/lib/audit/resolve-actor";
import { resolveRequestId } from "@/lib/audit/resolve-request-context";
import { rbacLogEntitaModule } from "@/lib/audit/resolve-module";
import type { AuditEventInput, AuditEventType } from "@/lib/audit/types";
import { errMessageFromSupabase } from "@/src/utils/supabaseErrorHandler";

function enrichPayloadWithUndoSession(payload: Record<string, unknown>): Record<string, unknown> {
  if (typeof window === "undefined") return payload;
  const sessionId = getOrCreateUndoSessionId();
  if (!sessionId) return payload;
  return { ...payload, undo_session_id: sessionId };
}

function buildPayloadFromInput(input: AuditEventInput): Record<string, unknown> {
  let payload: Record<string, unknown> = {};

  if (input.before != null && input.after != null) {
    payload = auditDiff(input.before, input.after, input.context as AuditLogContext) as Record<
      string,
      unknown
    >;
  } else if (input.after != null) {
    payload = auditSnapshot(input.after, input.context as AuditLogContext) as Record<string, unknown>;
  } else if (input.payload != null && typeof input.payload === "object" && !Array.isArray(input.payload)) {
    payload = { ...(input.payload as Record<string, unknown>) };
  } else if (input.payload != null) {
    payload = { data: input.payload };
  }

  if (input.context?.oggetto) {
    payload.context = { ...(payload.context as Record<string, unknown> | undefined), oggetto: input.context.oggetto };
  }

  return mergePayloadWithSnapshot(payload, input.snapshot);
}

async function resolveAutoreNomeSnapshot(
  client: SupabaseClient,
  autoreId: string | null,
): Promise<string | null> {
  if (!autoreId) return null;
  const { data } = await client
    .from("profiles")
    .select("nome, cognome")
    .eq("id", autoreId)
    .maybeSingle();
  if (!data) return null;
  const name = profileDisplayName({
    nome: (data as { nome?: string | null }).nome ?? "",
    cognome: (data as { cognome?: string | null }).cognome,
  });
  return name || null;
}

export async function recordAuditEvent(
  client: SupabaseClient,
  input: AuditEventInput,
): Promise<void> {
  const actor = await resolveAuditActor(client, {
    autoreId: input.autoreId,
    actorType: input.actorType,
    companyId: input.companyId,
  });

  const eventType: AuditEventType = input.eventType ?? "DATA_CHANGE";
  const autoreId =
    actor.actorType === "USER" ? requireUserActor(actor, `${input.entityType}/${input.entityId}`) : actor.autoreId;

  const payload = enrichPayloadWithUndoSession(buildPayloadFromInput(input));
  const summary = buildLogModificaSummary({
    entita: input.entityType,
    entita_id: input.entityId,
    azione: input.action,
    payload,
  });
  const mergedPayload = mergePayloadWithSummary(payload, summary);

  const title = buildTitleFromInput(input);
  const description = buildDescriptionFromInput(input);
  const module = input.module ?? rbacLogEntitaModule(input.entityType);
  const requestId = resolveRequestId(input.requestId);
  const autoreNomeSnapshot =
    actor.actorType === "USER" && autoreId
      ? await resolveAutoreNomeSnapshot(client, autoreId)
      : null;

  const row: Record<string, unknown> = {
    entita: input.entityType,
    entita_id: input.entityId,
    azione: input.action,
    autore_id: autoreId,
    autore_nome_snapshot: autoreNomeSnapshot,
    payload: mergedPayload,
    event_type: eventType,
    actor_type: actor.actorType,
    title,
    description,
    severity: input.severity ?? "info",
    module,
  };

  if (actor.companyId) row.company_id = actor.companyId;
  if (input.correlationId) row.correlation_id = input.correlationId;
  if (requestId) row.request_id = requestId;
  if (input.category) row.category = input.category;

  const { data, error } = await client.from("log_modifiche").insert(row).select("id").single();

  if (error) {
    throw new AuditLogWriteError(errMessageFromSupabase(error, { action: "create" }));
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

export { auditContext, auditDiff, auditSnapshot };
export type { AuditLogContext };
