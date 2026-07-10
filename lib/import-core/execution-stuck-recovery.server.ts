import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { writeImportAuditEvent } from "@/lib/import-core/import-audit-events.server";
import {
  IMPORT_EXECUTION_STUCK_STATUSES,
  IMPORT_EXECUTION_STUCK_THRESHOLD_MS,
} from "@/lib/import-core/import-execution-state-machine.server";
import { scheduleExecutionRetry } from "@/lib/import-core/import-executions.server";

export async function recoverStuckImportExecutions(
  sb: SupabaseClient,
  input?: { thresholdMs?: number },
): Promise<number> {
  const thresholdMs = input?.thresholdMs ?? IMPORT_EXECUTION_STUCK_THRESHOLD_MS;
  const cutoff = new Date(Date.now() - thresholdMs).toISOString();

  const { data: stuck, error } = await sb
    .from("import_executions")
    .select("id, company_id, correlation_id, import_file_id, retry_count, max_attempts")
    .in("status", IMPORT_EXECUTION_STUCK_STATUSES)
    .lt("heartbeat_at", cutoff);

  if (error) throw new Error(error.message);
  if (!stuck?.length) return 0;

  let recovered = 0;
  for (const row of stuck) {
    const execution = {
      id: String(row.id),
      companyId: String(row.company_id),
      correlationId: String(row.correlation_id),
      importFileId: String(row.import_file_id),
      retryCount: Number(row.retry_count ?? 0),
      maxAttempts: Number(row.max_attempts ?? 3),
    };

    const retried = await scheduleExecutionRetry(sb, {
      execution: {
        id: execution.id,
        companyId: execution.companyId,
        importFileId: execution.importFileId,
        parentExecutionId: null,
        feature: "ordine_fornitore",
        status: "failed",
        attempt: 1,
        attemptGroupId: "",
        maxAttempts: execution.maxAttempts,
        retryCount: execution.retryCount,
        nextRetryAt: null,
        heartbeatAt: null,
        workerId: null,
        correlationId: execution.correlationId,
        errorCode: "EXECUTION_STUCK",
        result: null,
      },
      errorCode: "EXECUTION_STUCK",
    });

    await writeImportAuditEvent(sb, {
      companyId: execution.companyId,
      correlationId: execution.correlationId,
      eventType: "EXECUTION_STUCK_RECOVERED",
      severity: "warning",
      importFileId: execution.importFileId,
      executionId: execution.id,
      payload: { retried },
    });
    recovered += 1;
  }
  return recovered;
}
