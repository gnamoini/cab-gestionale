import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { recordAuditEvent } from "@/lib/audit/record";
import type { AuditEventInput } from "@/lib/audit/types";

export async function recordWorkflowAction(
  client: SupabaseClient,
  input: Omit<AuditEventInput, "eventType"> & {
    title: string;
    description?: string;
  },
): Promise<void> {
  await recordAuditEvent(client, {
    ...input,
    eventType: "WORKFLOW_ACTION",
  });
}
