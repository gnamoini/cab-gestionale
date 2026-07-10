import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createImportCorrelationId } from "@/lib/import-core/correlation-id";
import { writeImportAuditEvent } from "@/lib/import-core/import-audit-events.server";
import type {
  ImportExecutionFeature,
  ImportExecutionStatus,
} from "@/lib/import-core/types";

export type ImportExecutionRow = {
  id: string;
  companyId: string;
  importFileId: string;
  parentExecutionId: string | null;
  feature: ImportExecutionFeature;
  status: ImportExecutionStatus;
  attempt: number;
  attemptGroupId: string;
  maxAttempts: number;
  retryCount: number;
  nextRetryAt: string | null;
  heartbeatAt: string | null;
  workerId: string | null;
  correlationId: string;
  errorCode: string | null;
  result: Record<string, unknown> | null;
};

function mapRow(row: Record<string, unknown>): ImportExecutionRow {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    importFileId: String(row.import_file_id),
    parentExecutionId: row.parent_execution_id ? String(row.parent_execution_id) : null,
    feature: row.feature as ImportExecutionFeature,
    status: row.status as ImportExecutionStatus,
    attempt: Number(row.attempt ?? 1),
    attemptGroupId: String(row.attempt_group_id),
    maxAttempts: Number(row.max_attempts ?? 3),
    retryCount: Number(row.retry_count ?? 0),
    nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : null,
    heartbeatAt: row.heartbeat_at ? String(row.heartbeat_at) : null,
    workerId: row.worker_id ? String(row.worker_id) : null,
    correlationId: String(row.correlation_id),
    errorCode: row.error_code ? String(row.error_code) : null,
    result: (row.result as Record<string, unknown> | null) ?? null,
  };
}

export async function createImportExecution(
  sb: SupabaseClient,
  input: {
    companyId: string;
    importFileId: string;
    feature: ImportExecutionFeature;
    correlationId?: string;
    parentExecutionId?: string | null;
    createdBy?: string | null;
    maxAttempts?: number;
  },
): Promise<ImportExecutionRow> {
  const correlationId = input.correlationId ?? createImportCorrelationId();
  const attemptGroupId = crypto.randomUUID();

  const { data, error } = await sb
    .from("import_executions")
    .insert({
      company_id: input.companyId,
      import_file_id: input.importFileId,
      parent_execution_id: input.parentExecutionId ?? null,
      feature: input.feature,
      status: "queued",
      attempt: 1,
      attempt_group_id: attemptGroupId,
      max_attempts: input.maxAttempts ?? 3,
      correlation_id: correlationId,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Creazione execution fallita");

  await writeImportAuditEvent(sb, {
    companyId: input.companyId,
    correlationId,
    eventType: "EXECUTION_QUEUED",
    severity: "info",
    createdBy: input.createdBy,
    importFileId: input.importFileId,
    executionId: String(data.id),
    payload: { feature: input.feature },
  });

  return mapRow(data as Record<string, unknown>);
}

export async function getImportExecution(
  sb: SupabaseClient,
  executionId: string,
): Promise<ImportExecutionRow | null> {
  const { data } = await sb.from("import_executions").select("*").eq("id", executionId).maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function updateImportExecutionStatus(
  sb: SupabaseClient,
  input: {
    executionId: string;
    status: ImportExecutionStatus;
    errorCode?: string | null;
    result?: Record<string, unknown> | null;
    workerId?: string | null;
    touchHeartbeat?: boolean;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.errorCode !== undefined) patch.error_code = input.errorCode;
  if (input.result !== undefined) patch.result = input.result;
  if (input.workerId !== undefined) patch.worker_id = input.workerId;
  if (input.touchHeartbeat) patch.heartbeat_at = new Date().toISOString();
  if (input.status === "processing" || input.status === "ai_processing") {
    patch.started_at = new Date().toISOString();
  }
  if (input.status === "completed" || input.status === "failed" || input.status === "cancelled") {
    patch.finished_at = new Date().toISOString();
  }

  const { error } = await sb.from("import_executions").update(patch).eq("id", input.executionId);
  if (error) throw new Error(error.message);
}

export async function touchImportExecutionHeartbeat(
  sb: SupabaseClient,
  executionId: string,
  workerId: string,
): Promise<void> {
  const { error } = await sb
    .from("import_executions")
    .update({ heartbeat_at: new Date().toISOString(), worker_id: workerId })
    .eq("id", executionId);
  if (error) throw new Error(error.message);
}

export async function findCompletedExecutionForReuse(
  sb: SupabaseClient,
  input: { companyId: string; importFileId: string; feature: ImportExecutionFeature },
): Promise<ImportExecutionRow | null> {
  const { data } = await sb
    .from("import_executions")
    .select("*")
    .eq("company_id", input.companyId)
    .eq("import_file_id", input.importFileId)
    .eq("feature", input.feature)
    .eq("status", "completed")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function claimQueuedExecutions(
  sb: SupabaseClient,
  input: { limit?: number; workerId: string },
): Promise<ImportExecutionRow[]> {
  const limit = input.limit ?? 5;
  const now = new Date().toISOString();

  const { data: rows, error } = await sb
    .from("import_executions")
    .select("*")
    .eq("status", "queued")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const claimed: ImportExecutionRow[] = [];
  for (const row of rows) {
    const { data: updated, error: updErr } = await sb
      .from("import_executions")
      .update({
        status: "processing",
        worker_id: input.workerId,
        heartbeat_at: now,
        started_at: now,
      })
      .eq("id", row.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();
    if (!updErr && updated) claimed.push(mapRow(updated as Record<string, unknown>));
  }
  return claimed;
}

export async function scheduleExecutionRetry(
  sb: SupabaseClient,
  input: {
    execution: ImportExecutionRow;
    errorCode: string;
    backoffMs?: number;
  },
): Promise<boolean> {
  const nextRetry = input.execution.retryCount + 1;
  if (nextRetry >= input.execution.maxAttempts) {
    await updateImportExecutionStatus(sb, {
      executionId: input.execution.id,
      status: "failed",
      errorCode: input.errorCode,
    });
    return false;
  }

  const backoffMs = input.backoffMs ?? 30_000 * nextRetry;
  const { error } = await sb
    .from("import_executions")
    .update({
      status: "queued",
      retry_count: nextRetry,
      next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
      error_code: input.errorCode,
      heartbeat_at: null,
      worker_id: null,
    })
    .eq("id", input.execution.id);
  if (error) throw new Error(error.message);
  return true;
}
