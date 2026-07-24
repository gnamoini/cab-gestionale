import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveRequestId } from "@/lib/audit/resolve-request-context.server";

export async function recordAuditCoverageGap(
  client: SupabaseClient,
  input: {
    mutationKey: string;
    expectedAudit: boolean;
    actualAudit: boolean;
    correlationId?: string | null;
    companyId?: string | null;
  },
): Promise<void> {
  const requestId = await resolveRequestId();
  const row: Record<string, unknown> = {
    mutation_key: input.mutationKey,
    expected_audit: input.expectedAudit,
    actual_audit: input.actualAudit,
  };
  if (requestId) row.request_id = requestId;
  if (input.correlationId) row.correlation_id = input.correlationId;
  if (input.companyId) row.company_id = input.companyId;

  const { error } = await client.from("audit_coverage_events").insert(row);
  if (error) {
    console.warn("[audit-coverage] telemetry insert failed:", error.message);
  }
}
