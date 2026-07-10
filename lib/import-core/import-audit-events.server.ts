import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportAuditEventType, ImportAuditSeverity } from "@/lib/import-core/types";

export type WriteImportAuditEventInput = {
  companyId: string;
  correlationId: string;
  eventType: ImportAuditEventType;
  severity: ImportAuditSeverity;
  createdBy?: string | null;
  importFileId?: string | null;
  executionId?: string | null;
  payload?: Record<string, unknown>;
};

export async function writeImportAuditEvent(
  sb: SupabaseClient,
  input: WriteImportAuditEventInput,
): Promise<void> {
  const { error } = await sb.from("import_audit_events").insert({
    company_id: input.companyId,
    correlation_id: input.correlationId,
    import_file_id: input.importFileId ?? null,
    execution_id: input.executionId ?? null,
    event_type: input.eventType,
    severity: input.severity,
    created_by: input.createdBy ?? null,
    payload: input.payload ?? {},
  });
  if (error) {
    console.error("[import-audit] write failed", { eventType: input.eventType, message: error.message });
  }
}
